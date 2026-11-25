import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const rules = new URL("../lib/rules/", import.meta.url);
const pages = new URL("../docs/rules/", import.meta.url);
const CANT_FOLLOW = "- Code the rule can't follow, like ";
const SPREAD_SKIP = "even with attributes after it";
const READS_SPREAD_AS_ID = new Set(["label-prop-linked"]);

for (const file of readdirSync(rules)) {
  const rule = file.replace(/\.js$/, "");
  const notReported = readFileSync(new URL(`${rule}.md`, pages), "utf8").split(/^## Not reported$/m)[1]?.split(/^## /m)[0] ?? "";
  const cantFollow = notReported.split("\n").filter((line) => line.startsWith(CANT_FOLLOW));
  test(`${rule} page has one item for the code it can't follow`, () => {
    assert.equal(
      cantFollow.length,
      1,
      `docs/rules/${rule}.md must start one "Not reported" item with "${CANT_FOLLOW}" and add a skipped code shape there as an example, not as its own item.`,
    );
  });
  if (READS_SPREAD_AS_ID.has(rule) || !readFileSync(new URL(file, rules), "utf8").includes("hasSpread(")) continue;
  test(`${rule} page says what a spread skip covers`, () => {
    assert.ok(
      cantFollow.some((line) => line.includes(SPREAD_SKIP)),
      `docs/rules/${rule}.md must list a spread among the code it can't follow, ${SPREAD_SKIP}. The shared spread check skips any spread, whatever comes after it.`,
    );
  });
}
