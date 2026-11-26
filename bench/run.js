import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import allTasks from "./tasks.js";

const { values: opts } = parseArgs({
  options: {
    variants: { type: "string", default: "before,after" },
    tasks: { type: "string" },
    runs: { type: "string", default: "1" },
    model: { type: "string", default: "haiku" },
  },
});

const here = fileURLToPath(new URL(".", import.meta.url));
const app = join(here, "app");
const APP_PORT = 5174;
const CDP_PORT = 9333;
const APP_URL = `http://127.0.0.1:${APP_PORT}/`;
const RUN_TIMEOUT_MS = 6 * 60 * 1000;
const ALL = { pagination: { page: 1, perPage: 1000 }, sort: { field: "id", order: "ASC" }, filter: {} };

const SYSTEM_PROMPT = "You operate a web app through the browser tools. Do the user's task in the app.";
const prompt = (task) =>
  `A CRM is open in the browser at ${APP_URL}. ${task.prompt} ` +
  "Do not reload the page or open a new one: the demo data lives in the page and resets on reload. " +
  "When you are done, reply with one sentence saying what you did, or why you could not do it.";

const tasks = opts.tasks ? allTasks.filter((t) => opts.tasks.split(",").includes(t.id)) : allTasks;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(here, "results", "raw", stamp);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(url) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await wait(500);
  }
  throw new Error(`${url} did not come up`);
}

function useVariant(variant) {
  execFileSync("git", ["-C", app, "checkout", "-q", "--", "."]);
  execFileSync("git", ["-C", app, "apply", join(here, "patches", `${variant}.patch`)]);
}

async function startApp() {
  const vite = spawn("npx", ["vite", "--config", "vite.demo.config.ts", "--host", "127.0.0.1", "--port", String(APP_PORT), "--strictPort", "--force"], {
    cwd: app,
    env: { ...process.env, NODE_ENV: "CI" },
    stdio: "ignore",
    detached: true,
  });
  await waitFor(APP_URL);
  return () => process.kill(-vite.pid);
}

async function startBrowser() {
  const profile = mkdtempSync(join(tmpdir(), "bench-chrome-"));
  const chrome = spawn(chromium.executablePath(), [
    "--headless=new",
    // Chromium exits at start without it where AppArmor blocks its sandbox, as on Ubuntu 24.04.
    "--no-sandbox",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    "--window-size=1440,900",
    "--no-first-run",
    APP_URL,
  ], { stdio: "ignore" });
  await waitFor(`http://127.0.0.1:${CDP_PORT}/json/version`);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
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

function runAgent(task, transcriptFile) {
  const mcpConfig = {
    mcpServers: {
      browser: {
        command: join(here, "node_modules", ".bin", "playwright-mcp"),
        args: ["--cdp-endpoint", `http://127.0.0.1:${CDP_PORT}`, "--image-responses", "omit"],
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
    costUsd: result.total_cost_usd,
    durationMs: result.duration_ms,
    answer: result.result,
  };
}

async function check(browser, task) {
  const pages = browser.contexts().flatMap((c) => c.pages());
  for (const page of pages) {
    const has = await page.evaluate(() => Boolean(window.__bench)).catch(() => false);
    if (has) return page.evaluate(`(${task.check})(window.__bench.dataProvider, ${JSON.stringify(ALL)})`);
  }
  return false;
}

const rows = [];
for (const variant of opts.variants.split(",")) {
  useVariant(variant);
  const stopApp = await startApp();
  try {
    for (const task of tasks) {
      for (let run = 1; run <= Number(opts.runs); run++) {
        const dir = join(outDir, variant);
        mkdirSync(dir, { recursive: true });
        const { browser, stop } = await startBrowser();
        const agent = await runAgent(task, join(dir, `${task.id}-${run}.jsonl`));
        const pass = await check(browser, task).catch(() => false);
        await stop();
        const row = { variant, task: task.id, rule: task.rule, source: task.source, run, model: opts.model, pass, timedOut: agent.timedOut, ...summarize(agent.events) };
        rows.push(row);
        writeFileSync(join(dir, `${task.id}-${run}.json`), JSON.stringify(row, null, 2));
        console.log(`${variant} ${task.id} #${run}: ${pass ? "PASS" : "FAIL"} in ${row.toolCalls} tool calls, ${row.inputTokens} input tokens`);
      }
    }
  } finally {
    stopApp();
  }
}
execFileSync("git", ["-C", app, "checkout", "-q", "--", "."]);
writeFileSync(join(outDir, "summary.json"), JSON.stringify(rows, null, 2));
console.log(`Results in ${outDir}`);
