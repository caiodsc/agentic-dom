import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { GAVE_UP, OFFLINE, appUrl, buildVariants, here, serveVariants, wait, waitFor } from "./app.js";
import allTasks from "./test-app/tasks.js";

const { values: opts } = parseArgs({
  options: {
    variants: { type: "string", default: "before,after" },
    tasks: { type: "string" },
    runs: { type: "string", default: "1" },
    model: { type: "string", default: "haiku" },
    concurrency: { type: "string", default: "1" },
    "max-cost": { type: "string", default: "20" },
    // The name of a folder in results/raw to finish: attempts already saved there are skipped.
    resume: { type: "string" },
  },
});

const FIRST_CDP_PORT = 9333;
const RUN_TIMEOUT_MS = 6 * 60 * 1000;
const SETTLE_MS = 1000;

const SYSTEM_PROMPT = "You operate a web app through the browser tools. Do the user's task in the app.";
const prompt = (task) =>
  `A team admin app is open in the browser. ${task.prompt} ` +
  "Do not reload the page or open a new one: the demo data lives in the page and resets on reload. " +
  "When you are done, reply with one sentence saying what you did, or why you could not do it.";

const tasks = opts.tasks ? allTasks.filter((t) => opts.tasks.split(",").includes(t.id)) : allTasks;
const stamp = opts.resume ?? new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(here, "results", "raw", stamp);

async function startBrowser(url, port) {
  const profile = mkdtempSync(join(tmpdir(), "bench-chrome-"));
  const chrome = spawn(chromium.executablePath(), [
    "--headless=new",
    // Chromium exits at start without it where AppArmor blocks its sandbox.
    "--no-sandbox",
    OFFLINE,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--window-size=1440,900",
    "--no-first-run",
    url,
  ], { stdio: "ignore" });
  let browser;
  const stop = async () => {
    await browser?.close().catch(() => {});
    if (chrome.exitCode === null && chrome.signalCode === null) {
      const exited = new Promise((r) => chrome.once("exit", r));
      chrome.kill();
      await exited;
    }
    rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  };
  try {
    await new Promise((resolve, reject) => chrome.once("spawn", resolve).once("error", reject));
    await waitFor(`http://127.0.0.1:${port}/json/version`);
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    const page = browser.contexts()[0].pages()[0];
    await page.waitForFunction(() => window.__bench, null, { timeout: 30000 });
  } catch (error) {
    await stop();
    throw error;
  }
  return { browser, stop };
}

function runAgent(task, port, origin, transcriptFile) {
  const mcpConfig = {
    mcpServers: {
      browser: {
        command: join(here, "node_modules", ".bin", "playwright-mcp"),
        // Only its own version's server, so the agent cannot open the other version or another local service.
        args: ["--cdp-endpoint", `http://127.0.0.1:${port}`, "--allowed-origins", origin, "--image-responses", "omit"],
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
  return new Promise((resolve, reject) => {
    const agent = spawn("claude", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    agent.stdout.on("data", (d) => (out += d));
    agent.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => agent.kill("SIGTERM"), RUN_TIMEOUT_MS);
    agent.on("error", (error) => {
      clearTimeout(timer);
      rmSync(cwd, { recursive: true, force: true });
      reject(error);
    });
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

async function snapshot(browser) {
  for (const page of browser.contexts().flatMap((c) => c.pages())) {
    if (!(await page.evaluate(() => Boolean(window.__bench)).catch(() => false))) continue;
    return page.evaluate(() => window.__bench.members());
  }
  return null;
}

function diff(before, after) {
  const changes = [];
  const was = new Map(before.map((r) => [r.id, r]));
  const is = new Map(after.map((r) => [r.id, r]));
  for (const [id, record] of is) if (!was.has(id)) changes.push({ id, type: "added", fields: Object.keys(record), after: record });
  for (const [id, record] of was) {
    if (!is.has(id)) {
      changes.push({ id, type: "removed", fields: [], before: record });
      continue;
    }
    const now = is.get(id);
    const fields = [...new Set([...Object.keys(record), ...Object.keys(now)])]
      .filter((f) => JSON.stringify(record[f]) !== JSON.stringify(now[f]));
    if (fields.length) changes.push({ id, type: "changed", fields, before: record, after: now });
  }
  return changes;
}

async function attempt({ task, variant, run }, port) {
  const dir = join(outDir, variant);
  mkdirSync(dir, { recursive: true });
  const { browser, stop } = await startBrowser(appUrl(variant) + task.start, port);
  try {
    const before = await snapshot(browser);
    const agent = await runAgent(task, port, new URL(appUrl(variant)).origin, join(dir, `${task.id}-${run}.jsonl`));
    const summary = summarize(agent.events);
    await wait(SETTLE_MS);
    const after = await snapshot(browser).catch(() => null);
    const changes = after ? diff(before, after) : [];
    const pass = Boolean(after) && Boolean(await task.expect(changes, summary.answer, before));
    const collateral = changes.filter((c) => !task.touches(c, before)).map(({ id, type, fields }) => ({ id, type, fields }));
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
let spent = 0;
for (let run = 1; run <= Number(opts.runs); run++) {
  for (const task of tasks) {
    // Alternating which version goes first keeps drift over a long run from landing on one version only.
    for (const variant of run % 2 ? variants : [...variants].reverse()) {
      const file = join(outDir, variant, `${task.id}-${run}.json`);
      const done = existsSync(file) && JSON.parse(readFileSync(file, "utf8"));
      if (done && done.model !== opts.model) throw new Error(`${file} was run with ${done.model}, not ${opts.model}.`);
      // An attempt that ended in an error runs again. A finished one counts toward the cap.
      if (done && !done.error) spent += done.costUsd;
      else jobs.push({ task, variant, run });
    }
  }
}

buildVariants();
const stopServers = await serveVariants();
const rows = [];
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
