import disabledHasReason from "./lib/rules/disabled-has-reason.js";
import labelPropLinked from "./lib/rules/label-prop-linked.js";
import repeatedActionContext from "./lib/rules/repeated-action-context.js";
import { createRequire } from "node:module";

const { name, version } = createRequire(import.meta.url)("./package.json");

const plugin = {
  meta: { name, version },
  rules: {
    "disabled-has-reason": disabledHasReason,
    "label-prop-linked": labelPropLinked,
    "repeated-action-context": repeatedActionContext,
  },
  configs: {},
};

plugin.configs.recommended = {
  name: "agent-ready/recommended",
  files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { "agent-ready": plugin },
  rules: {
    "agent-ready/disabled-has-reason": "warn",
    "agent-ready/label-prop-linked": "error",
    "agent-ready/repeated-action-context": "warn",
  },
};

export default plugin;
