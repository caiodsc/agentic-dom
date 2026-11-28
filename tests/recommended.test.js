import { test } from "node:test";
import assert from "node:assert/strict";
import { Linter } from "eslint";
import unsupported from "eslint/use-at-your-own-risk";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
import plugin from "../index.cjs";

test("recommended config alone parses JSX", () => {
  const messages = new Linter({ configType: "flat" }).verify("export const A = () => <button>Pay</button>;", [plugin.configs.recommended], "a.jsx");
  assert.deepEqual(messages, []);
});

test("legacy-recommended config loads from an .eslintrc", { skip: !unsupported.LegacyESLint && "this ESLint has no .eslintrc support" }, async () => {
  const eslint = new unsupported.LegacyESLint({
    useEslintrc: false,
    resolvePluginsRelativeTo: fileURLToPath(new URL("..", import.meta.url)),
    overrideConfig: { extends: ["plugin:agentic-dom/legacy-recommended"], parserOptions: { ecmaVersion: "latest", sourceType: "module" } },
  });
  const [result] = await eslint.lintText("export const A = ({ on }) => <button disabled={!on}>Pay</button>;", { filePath: "a.jsx" });
  assert.deepEqual(result.messages.map((m) => m.ruleId), ["agentic-dom/disabled-has-reason"]);
});

test("every rule file is in the plugin, the recommended config and the README table", () => {
  const files = readdirSync(new URL("../lib/rules/", import.meta.url)).map((file) => file.replace(/\.js$/, "")).sort();
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const table = [...readme.matchAll(/^\| \d+ \| \[([a-z-]+)\]\(docs\/rules\/\1\.md\)/gm)].map((match) => match[1]).sort();
  assert.deepEqual(Object.keys(plugin.rules).sort(), files);
  assert.deepEqual(Object.keys(plugin.configs.recommended.rules).map((rule) => rule.replace("agentic-dom/", "")).sort(), files);
  assert.deepEqual(table, files);
});
