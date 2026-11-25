const disabledHasReason = require("./lib/rules/disabled-has-reason.js");
const errorPropLinked = require("./lib/rules/error-prop-linked.js");
const iconButtonHasName = require("./lib/rules/icon-button-has-name.js");
const labelPropLinked = require("./lib/rules/label-prop-linked.js");
const repeatedActionContext = require("./lib/rules/repeated-action-context.js");
const toggleHasState = require("./lib/rules/toggle-has-state.js");
const { name, version } = require("./package.json");

const plugin = {
  meta: { name, version },
  rules: {
    "disabled-has-reason": disabledHasReason,
    "error-prop-linked": errorPropLinked,
    "icon-button-has-name": iconButtonHasName,
    "label-prop-linked": labelPropLinked,
    "repeated-action-context": repeatedActionContext,
    "toggle-has-state": toggleHasState,
  },
  configs: {},
};

const rules = {
  "agentic-dom/disabled-has-reason": "warn",
  "agentic-dom/error-prop-linked": "warn",
  "agentic-dom/icon-button-has-name": "error",
  "agentic-dom/label-prop-linked": "error",
  "agentic-dom/repeated-action-context": "warn",
  "agentic-dom/toggle-has-state": "warn",
};

plugin.configs.recommended = {
  name: "agentic-dom/recommended",
  files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { "agentic-dom": plugin },
  rules,
};

plugin.configs["legacy-recommended"] = {
  plugins: ["agentic-dom"],
  parserOptions: { ecmaFeatures: { jsx: true } },
  rules,
};

module.exports = plugin;
