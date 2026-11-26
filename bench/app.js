import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const here = fileURLToPath(new URL(".", import.meta.url));
export const app = join(here, "app");
export const VARIANTS = ["before", "after"];
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

export function useVariant(variant) {
  execFileSync("git", ["-C", app, "checkout", "-q", "--", "."]);
  execFileSync("git", ["-C", app, "apply", join(here, "patches", `${variant}.patch`)]);
}

export function resetApp() {
  execFileSync("git", ["-C", app, "checkout", "-q", "--", "."]);
}

// Builds every version to dist/<variant>, then puts the app's sources back.
export function buildVariants() {
  try {
    for (const variant of VARIANTS) {
      useVariant(variant);
      execFileSync("npx", ["vite", "build", "--config", "vite.demo.config.ts", "--outDir", join(here, "dist", variant), "--emptyOutDir"], {
        cwd: app,
        env: { ...process.env, NODE_ENV: "CI" },
        stdio: "ignore",
      });
    }
  } finally {
    resetApp();
  }
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".woff2": "font/woff2" };

// Serves every built version and returns a function that stops them.
export async function serveVariants() {
  const servers = VARIANTS.map((variant) => {
    const dir = join(here, "dist", variant);
    return createServer((req, res) => {
      let file = join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) file = join(dir, "index.html");
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      createReadStream(file).pipe(res);
    }).listen(new URL(appUrl(variant)).port, "127.0.0.1");
  });
  await Promise.all(VARIANTS.map((v) => waitFor(appUrl(v))));
  return () => Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
}
