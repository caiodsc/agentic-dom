import { Linter } from "eslint";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [dir, rule, base = "main"] = process.argv.slice(2);
if (!dir || !rule) {
  console.error("Usage: node scripts/compare-rule.js <app dir> <rule> [base ref, default main]");
  process.exit(1);
}
const app = resolve(dir);

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const baseDir = mkdtempSync(join(tmpdir(), "agentic-dom-"));
process.on("exit", () => rmSync(baseDir, { recursive: true, force: true }));
execFileSync("tar", ["-x", "-C", baseDir], { input: execFileSync("git", ["-C", root, "archive", base, "lib"]) });
const ruleFile = (dir) => join(dir, "lib/rules", `${rule}.js`);
if (!existsSync(ruleFile(baseDir)) && !existsSync(ruleFile(root))) {
  console.error(`No rule named ${rule} in ${base} or in the working tree.`);
  process.exit(1);
}

const parser = require("@typescript-eslint/parser");

function files(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files(path, out);
    else if (/\.(js|jsx|tsx)$/.test(entry.name)) out.push(path);
  }
  return out;
}

function reports(dir) {
  const file = ruleFile(dir);
  if (!existsSync(file)) return new Map();
  const linter = new Linter({ configType: "flat", cwd: app });
  const config = [{
    files: ["**/*.{js,jsx,tsx}"],
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { a: { rules: { r: require(file) } } },
    rules: { "a/r": "warn" },
  }];
  const found = new Map();
  let unparsed = 0;
  for (const path of files(app)) {
    const messages = linter.verify(readFileSync(path, "utf8"), config, { filename: path });
    if (messages.some((m) => m.fatal)) unparsed++;
    for (const m of messages) {
      if (m.ruleId === "a/r") found.set(`${relative(app, path)}:${m.line}:${m.column}`, m.message);
    }
  }
  if (unparsed) console.error(`${unparsed} files did not parse and were skipped.`);
  return found;
}

const before = reports(baseDir);
const after = reports(root);

console.log(`${base}: ${before.size} reports. Working tree: ${after.size} reports.`);
for (const [at, message] of after) {
  if (!before.has(at)) console.log(`\n+ ${at}\n  ${message}`);
  else if (before.get(at) !== message) console.log(`\n~ ${at}\n  before: ${before.get(at)}\n  after:  ${message}`);
}
for (const [at, message] of before) if (!after.has(at)) console.log(`\n- ${at}\n  ${message}`);
