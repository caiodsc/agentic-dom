import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const rules = new URL("../lib/rules/", import.meta.url);
const pages = new URL("../docs/rules/", import.meta.url);
const SPREAD_SKIP = "even when an attribute after the spread replaces that value";
const READS_SPREAD_AS_ID = new Set(["label-prop-linked"]);

for (const file of readdirSync(rules)) {
  const rule = file.replace(/\.js$/, "");
  if (READS_SPREAD_AS_ID.has(rule) || !readFileSync(new URL(file, rules), "utf8").includes("hasSpread(")) continue;
  test(`${rule} page says what a spread skip covers`, () => {
    assert.ok(
      readFileSync(new URL(`${rule}.md`, pages), "utf8").includes(SPREAD_SKIP),
      `docs/rules/${rule}.md must say, under "Not reported", that the rule skips an element with a spread ${SPREAD_SKIP}. The shared spread check skips any spread, whatever comes after it.`,
    );
  });
}
