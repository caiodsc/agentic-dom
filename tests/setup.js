import { describe, it } from "node:test";
import * as eslint from "eslint";
import unsupported from "eslint/use-at-your-own-risk";

const RuleTester = unsupported.FlatRuleTester ?? eslint.RuleTester;

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

export const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});
