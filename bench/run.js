import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { OFFLINE, appUrl, buildVariants, here, serveVariants, wait, waitFor } from "./app.js";
import allTasks from "./tasks.js";

const { values: opts } = parseArgs({
  options: {
    variants: { type: "string", default: "before,after" },
    tasks: { type: "string" },
    runs: { type: "string", default: "1" },
    model: { type: "string", default: "haiku" },
    concurrency: { type: "string", default: "1" },
    "max-cost": { type: "string", default: "20" },
    // A results folder to finish: attempts already saved there are skipped.
    resume: { type: "string" },
  },
});

const FIRST_CDP_PORT = 9333;
const RUN_TIMEOUT_MS = 6 * 60 * 1000;
// Deleting is undoable, so the app writes a delete only after the undo notice closes.
const UNDO_MS = 8000;
const RESOURCES = ["sales", "tags", "companies", "contacts", "contact_notes", "deals", "deal_notes", "tasks", "configuration"];
// A reply that says the agent did not finish. Any other reply counts as a claim that it did.
const GAVE_UP = /\b(could ?n[o']t|can ?n[o']t|cannot|unable|not able|wasn't able|was not able|failed|did ?n[o']t|no (such|matching))\b/i;

const SYSTEM_PROMPT = "You operate a web app through the browser tools. Do the user's task in the app.";
const prompt = (task) =>
  `A CRM is open in the browser. ${task.prompt} ` +
  "Do not reload the page or open a new one: the demo data lives in the page and resets on reload. " +
  "When you are done, reply with one sentence saying what you did, or why you could not do it.";

const tasks = opts.tasks ? allTasks.filter((t) => opts.tasks.split(",").includes(t.id)) : allTasks;
const stamp = opts.resume ?? new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(here, "results", "raw", stamp);

async function startBrowser(url, port) {
  const profile = mkdtempSync(join(tmpdir(), "bench-chrome-"));
  const chrome = spawn(chromium.executablePath(), [
    "--headless=new",
    // Chromium exits at start without it where AppArmor blocks its sandbox, as on Ubuntu 24.04.
    "--no-sandbox",
    OFFLINE,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--window-size=1440,900",
    "--no-first-run",
    url,
  ], { stdio: "ignore" });
  await waitFor(`http://127.0.0.1:${port}/json/version`);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts()[0].pages()[0];
  await page.waitForFunction(() => window.__bench, null, { timeout: 30000 });
  return {
    browser,
    stop: async () => {
      await browser.close().catch(() => {});
      const exited = new Promise((r) => chrome.once("exit", r));
      chrome.kill();
      await exited;
      rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
    },
  };
}

function runAgent(task, port, transcriptFile) {
  const mcpConfig = {
    mcpServers: {
      browser: {
        command: join(here, "node_modules", ".bin", "playwright-mcp"),
        args: ["--cdp-endpoint", `http://127.0.0.1:${port}`, "--image-responses", "omit"],
      },
    },
  };
  const cwd = mkdtempSync(join(tmpdir(), "bench-agent-"));
  const args = [
    "-p", prompt(task),
    "--model", opts.model,
    "--system-prompt", SYSTEM_PROMPT,
    "--tools", "",
    "--mcp-config", JSON.stringify(mcpConfig),
    "--strict-mcp-config",
    "--setting-sources", "",
    "--allowedTools", "mcp__browser",
    // The agent works from the accessibility snapshot only: no screenshots, no page scripts, no raw network.
    "--disallowedTools",
    ...["take_screenshot", "evaluate", "run_code_unsafe", "network_request", "network_requests"].map((t) => `mcp__browser__browser_${t}`),
    "--output-format", "stream-json",
    "--verbose",
    "--no-session-persistence",
  ];
  return new Promise((resolve) => {
    const agent = spawn("claude", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    agent.stdout.on("data", (d) => (out += d));
    agent.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => agent.kill("SIGTERM"), RUN_TIMEOUT_MS);
    agent.on("close", (code) => {
      clearTimeout(timer);
      writeFileSync(transcriptFile, out);
      rmSync(cwd, { recursive: true, force: true });
      resolve({ code, timedOut: code === null, events: parseEvents(out) });
    });
  });
}

function parseEvents(out) {
  return out.split("\n").flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

function summarize(events) {
  const toolCalls = events
    .filter((e) => e.type === "assistant")
    .flatMap((e) => e.message.content.filter((c) => c.type === "tool_use").map((c) => c.name.replace("mcp__browser__", "")));
  const result = events.find((e) => e.type === "result") ?? {};
  const usage = result.usage ?? {};
  return {
    toolCalls: toolCalls.length,
    tools: toolCalls,
    inputTokens: (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
    outputTokens: usage.output_tokens ?? 0,
    costUsd: result.total_cost_usd ?? 0,
    durationMs: result.duration_ms,
    answer: result.result ?? "",
  };
}

// Every record of every resource, read through the demo's data provider in the page that holds it.
async function snapshot(browser) {
  for (const page of browser.contexts().flatMap((c) => c.pages())) {
    if (!(await page.evaluate(() => Boolean(window.__bench)).catch(() => false))) continue;
    return page.evaluate(async (resources) => {
      const all = { pagination: { page: 1, perPage: 100000 }, sort: { field: "id", order: "ASC" }, filter: {} };
      const data = {};
      for (const r of resources) data[r] = (await window.__bench.dataProvider.getList(r, all)).data;
      return data;
    }, RESOURCES);
  }
  return null;
}

function diff(before, after) {
  const changes = [];
  for (const resource of RESOURCES) {
    const was = new Map(before[resource].map((r) => [r.id, r]));
    const is = new Map(after[resource].map((r) => [r.id, r]));
    for (const [id, record] of is) if (!was.has(id)) changes.push({ resource, id, type: "added", fields: Object.keys(record), after: record });
    for (const [id, record] of was) {
      if (!is.has(id)) {
        changes.push({ resource, id, type: "removed", fields: [], before: record });
        continue;
      }
      const now = is.get(id);
      // Counters like nb_contacts are recomputed by the data provider whenever a related record changes.
      const fields = [...new Set([...Object.keys(record), ...Object.keys(now)])]
        .filter((f) => !f.startsWith("nb_") && JSON.stringify(record[f]) !== JSON.stringify(now[f]));
      if (fields.length) changes.push({ resource, id, type: "changed", fields, before: record, after: now });
    }
  }
  return changes;
}

async function attempt({ task, variant, run }, port) {
  const dir = join(outDir, variant);
  mkdirSync(dir, { recursive: true });
  const { browser, stop } = await startBrowser(appUrl(variant) + task.start, port);
  try {
    const before = await snapshot(browser);
    const agent = await runAgent(task, port, join(dir, `${task.id}-${run}.jsonl`));
    const summary = summarize(agent.events);
    // The app saves an undoable change when its notice closes, and the notice stays open while the mouse is over it.
    await browser.contexts()[0].pages()[0]?.mouse.move(0, 0).catch(() => {});
    await wait(UNDO_MS);
    const after = await snapshot(browser).catch(() => null);
    const changes = after ? diff(before, after) : [];
    const pass = Boolean(after) && Boolean(await task.expect(changes, summary.answer, before));
    const collateral = changes.filter((c) => !task.touches(c, before)).map(({ resource, id, type, fields }) => ({ resource, id, type, fields }));
    const claimed = !GAVE_UP.test(summary.answer);
    return {
      variant, task: task.id, run, model: opts.model,
      pass, collateral: collateral.length, collateralChanges: collateral, claimed, silentFailure: claimed && !pass,
      lostPage: !after, timedOut: agent.timedOut, ...summary,
    };
  } finally {
    await stop();
  }
}

const variants = opts.variants.split(",");
const jobs = [];
for (let run = 1; run <= Number(opts.runs); run++) {
  for (const task of tasks) {
    // Alternating which version goes first keeps drift over a long run from landing on one version only.
    for (const variant of run % 2 ? variants : [...variants].reverse()) {
      if (!existsSync(join(outDir, variant, `${task.id}-${run}.json`))) jobs.push({ task, variant, run });
    }
  }
}

buildVariants();
const stopServers = await serveVariants();
const rows = [];
let spent = 0;
let next = 0;
const maxCost = Number(opts["max-cost"]);
try {
  await Promise.all(Array.from({ length: Number(opts.concurrency) }, async (_, worker) => {
    while (next < jobs.length && spent < maxCost) {
      const job = jobs[next++];
      const row = await attempt(job, FIRST_CDP_PORT + worker).catch((error) => ({
        variant: job.variant, task: job.task.id, run: job.run, model: opts.model, error: String(error), pass: false, costUsd: 0,
      }));
      spent += row.costUsd;
      rows.push(row);
      writeFileSync(join(outDir, job.variant, `${job.task.id}-${job.run}.json`), JSON.stringify(row, null, 2));
      console.log(
        `${row.variant} ${row.task} #${row.run}: ${row.error ? `ERROR ${row.error}` : `${row.pass ? "PASS" : "FAIL"}, ${row.collateral} collateral, ${row.toolCalls} tool calls`}` +
          ` (US$ ${spent.toFixed(2)} spent)`,
      );
    }
  }));
} finally {
  await stopServers();
}
if (spent >= maxCost) console.log(`Stopped at the US$ ${maxCost} cap with ${jobs.length - rows.length} attempts not run.`);
const saved = variants.flatMap((variant) =>
  readdirSync(join(outDir, variant)).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(outDir, variant, f), "utf8"))),
);
writeFileSync(join(outDir, "summary.json"), JSON.stringify(saved, null, 2));
console.log(`Results in ${outDir}`);
