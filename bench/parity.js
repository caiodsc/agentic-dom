// The versions differ only in attributes an agent reads, so every screen should match exactly.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { OFFLINE, VARIANTS, appUrl, buildVariants, here, serveVariants } from "./app.js";
import tasks from "./test-app/tasks.js";

const starts = [...new Set(tasks.map((t) => t.start))];
const outDir = join(here, "results", "parity");
const shots = {};

buildVariants();
const stopServers = await serveVariants();
const browser = await chromium.launch({ args: [OFFLINE] });
try {
  for (const variant of VARIANTS) {
    for (const start of starts) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      // A fixed clock keeps relative dates like "2 hours ago" the same in both versions.
      await context.clock.setFixedTime(new Date("2026-01-15T10:00:00Z"));
      const page = await context.newPage();
      await page.goto(appUrl(variant) + start);
      await page.waitForFunction(() => window.__bench, null, { timeout: 30000 });
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(() => [...document.images].every((img) => img.complete), null, { timeout: 30000 });
      await page.waitForTimeout(2500);
      const png = await page.screenshot({ animations: "disabled", caret: "hide" });
      const aria = await page.locator("body").ariaSnapshot();
      mkdirSync(join(outDir, variant), { recursive: true });
      const name = start.replace(/\W+/g, "_") || "home";
      writeFileSync(join(outDir, variant, `${name}.png`), png);
      writeFileSync(join(outDir, variant, `${name}.yml`), aria);
      (shots[start] ??= {})[variant] = { png, aria };
      await context.close();
    }
  }
} finally {
  await stopServers();
}

// Lines in `a` that `b` lacks, counting repeats.
function missing(a, b) {
  const left = new Map();
  for (const line of b.split("\n")) left.set(line, (left.get(line) ?? 0) + 1);
  return a.split("\n").filter((line) => (left.get(line) ? (left.set(line, left.get(line) - 1), false) : true));
}

const page = await browser.newPage();
let failed = 0;
for (const [start, { before, after }] of Object.entries(shots)) {
  const differing = before.png.equals(after.png)
    ? 0
    : await page.evaluate(async ([a, b]) => {
        const load = async (b64) => createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const [x, y] = await Promise.all([load(a), load(b)]);
        if (x.width !== y.width || x.height !== y.height) return -1;
        const pixels = (img) => {
          const canvas = new OffscreenCanvas(img.width, img.height);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, img.width, img.height).data;
        };
        const [p, q] = [pixels(x), pixels(y)];
        let n = 0;
        for (let i = 0; i < p.length; i += 4) if (p[i] !== q[i] || p[i + 1] !== q[i + 1] || p[i + 2] !== q[i + 2]) n++;
        return n;
      }, [before.png.toString("base64"), after.png.toString("base64")]);
  if (differing !== 0) failed++;
  const lost = missing(after.aria, before.aria);
  console.log(
    `${differing === 0 ? "same" : "DIFFERENT"}  ${start}${differing ? ` (${differing === -1 ? "sizes differ" : `${differing} pixels`})` : ""}` +
      `  ${lost.length} snapshot lines only in after${lost.length ? `: ${lost.map((l) => l.trim()).join(" | ")}` : ""}`,
  );
}
await browser.close();
console.log(`${starts.length - failed} of ${starts.length} start screens identical. Screenshots in ${outDir}`);
process.exitCode = failed ? 1 : 0;
