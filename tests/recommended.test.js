import { test } from "node:test";
import assert from "node:assert/strict";
import { Linter } from "eslint";
import unsupported from "eslint/use-at-your-own-risk";
import { fileURLToPath } from "node:url";
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
