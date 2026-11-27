import { execFileSync } from "node:child_process";
import { cpSync, createReadStream, existsSync, mkdtempSync, rmSync, statSync, symlinkSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const here = fileURLToPath(new URL(".", import.meta.url));
export const VARIANTS = ["before", "after"];
// A reply that says the agent did not finish. Any other reply counts as a claim that it did.
export const GAVE_UP = /\b(could ?n[o']t|can ?n[o']t|cannot|unable|not able|wasn't able|was not able|failed|did ?n[o']t|no (such|matching))\b/i;

const app = join(here, "test-app");
export const PATCHES = join(app, "patches");

// The test app lives in this repo, so it is copied to a repo of its own first.
export function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "bench-"));
  cpSync(app, dir, { recursive: true, filter: (src) => !/\/(node_modules|dist|patches)$/.test(src) });
  symlinkSync(join(app, "node_modules"), join(dir, "node_modules"));
  const git = (...args) => execFileSync("git", ["-C", dir, ...args]);
  git("init", "-q");
  git("add", "-A", ".");
  git("-c", "user.name=bench", "-c", "user.email=bench@localhost", "commit", "-qm", "base");
  return dir;
}
// Each version is served on its own port, so runs of both can go at the same time.
export const appUrl = (variant) => `http://127.0.0.1:${5180 + VARIANTS.indexOf(variant) + 1}/`;

// Outside hosts, like avatar images, answer at different speeds and would make two loads of one screen differ.
export const OFFLINE = "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1";

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function waitFor(url) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await wait(500);
  }
  throw new Error(`${url} did not come up`);
}

const distDir = (variant) => join(here, "dist", variant);

// A missing patch means the version is the app as it is.
export function useVariant(dir, variant) {
  execFileSync("git", ["-C", dir, "checkout", "-q", "--", "."]);
  const patch = join(PATCHES, `${variant}.patch`);
  if (existsSync(patch)) execFileSync("git", ["-C", dir, "apply", patch]);
}

export function buildVariants() {
  const dir = workspace();
  try {
    for (const variant of VARIANTS) {
      useVariant(dir, variant);
      execFileSync("npx", ["vite", "build", "--outDir", distDir(variant), "--emptyOutDir"], {
        cwd: dir,
        env: { ...process.env, NODE_ENV: "CI" },
        stdio: "ignore",
      });
    }
  } finally {
    dropWorkspace(dir);
  }
}

export function dropWorkspace(dir) {
  rmSync(dir, { recursive: true, force: true });
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".woff2": "font/woff2" };

export async function serveVariants() {
  const servers = VARIANTS.map((variant) => {
    const dir = distDir(variant);
    return createServer((req, res) => {
      let file = join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname));
      // A source map holds the app's source code, and the agent must reach the app only through its pages.
      if (file.endsWith(".map")) return res.writeHead(404).end();
      if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) file = join(dir, "index.html");
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      createReadStream(file).pipe(res);
    }).listen(new URL(appUrl(variant)).port, "127.0.0.1");
  });
  await Promise.all(VARIANTS.map((v) => waitFor(appUrl(v))));
  return () => Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
}
