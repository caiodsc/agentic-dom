import { test } from "node:test";
import assert from "node:assert/strict";
import { Linter } from "eslint";
import plugin from "../index.js";

test("recommended config alone parses JSX", () => {
  const messages = new Linter().verify("export const A = () => <button>Pay</button>;", [plugin.configs.recommended], "a.jsx");
  assert.deepEqual(messages, []);
});
