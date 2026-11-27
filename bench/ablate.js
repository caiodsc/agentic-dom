// Writes the app's before.patch: its after version, minus every attribute whose removal the lint reports.
// Usage: node ablate.js [--app atomic|test-app] [lint checkout, default the repo root]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { appProfile, dropWorkspace, here, useVariant, workspace } from "./app.js";
import { makeLinter, sourceFiles } from "./lint.js";

// Attributes the rules ask for. Visible text is never removed, so the page looks the same.
const ATTRS = new Set([
  "aria-label", "aria-labelledby", "title", "aria-describedby", "aria-invalid", "aria-errormessage",
  "aria-pressed", "aria-checked", "aria-selected", "aria-expanded", "inert", "htmlFor",
]);

const { values: opts, positionals } = parseArgs({ options: { app: { type: "string", default: "atomic" } }, allowPositionals: true });
const profile = appProfile(opts.app);
const app = workspace(profile);
const lib = resolve(positionals[0] ?? join(here, ".."));
const git = (...args) => execFileSync("git", ["-C", app, ...args], { encoding: "utf8", maxBuffer: 1 << 26 });

useVariant(profile, app, "after");
const { parser, lintSource } = makeLinter(app, lib);

// An attribute the app's styles select on, like Tailwind's `aria-expanded:bg-muted`, changes the look, so it stays.
const styled = new Set();
for (const path of sourceFiles(join(app, "src"))) {
  for (const [, name] of readFileSync(path, "utf8").matchAll(/(aria-[a-z]+|inert)(?::|\])/g)) styled.add(name);
}

function attributes(source) {
  const found = [];
  (function walk(node) {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "JSXAttribute" && node.name.type === "JSXIdentifier" && ATTRS.has(node.name.name) && !styled.has(node.name.name)) {
      found.push(node);
    }
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (key === "parent" || !value || typeof value !== "object") continue;
      for (const child of Array.isArray(value) ? value : [value]) walk(child);
    }
  })(parser.parse(source, { jsx: true, range: true, loc: true }));
  return found;
}

function without(source, [start, end]) {
  const lineStart = source.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = source.indexOf("\n", end);
  if (source.slice(lineStart, start).trim() === "" && source.slice(end, lineEnd).trim() === "") {
    return source.slice(0, lineStart) + source.slice(lineEnd + 1);
  }
  let from = start;
  while (from > 0 && /[ \t]/.test(source[from - 1])) from--;
  return source.slice(0, from) + source.slice(end);
}

const removed = [];
for (const path of sourceFiles(join(app, "src"))) {
  let source = readFileSync(path, "utf8");
  let reports = lintSource(path, source).length;
  // From the end of the file, so the ranges still to try do not move.
  for (const attr of attributes(source).sort((a, b) => b.range[0] - a.range[0])) {
    const next = without(source, attr.range);
    const nextReports = lintSource(path, next);
    if (nextReports.length > reports) {
      removed.push(`${relative(app, path)}:${attr.loc?.start.line ?? ""} ${attr.name.name}`);
      source = next;
      reports = nextReports.length;
    }
  }
  writeFileSync(path, source);
}

writeFileSync(join(profile.patches, "before.patch"), git("diff"));
dropWorkspace(profile, app);
console.log(`Kept because the styles select on them: ${[...styled].filter((a) => ATTRS.has(a)).join(", ")}`);
console.log(`${removed.length} attributes removed:`);
for (const r of removed.reverse()) console.log(`  ${r}`);
