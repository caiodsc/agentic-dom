const checkboxHasName = require("./lib/rules/checkbox-has-name.js");
const collapsedContentInert = require("./lib/rules/collapsed-content-inert.js");
const disabledHasReason = require("./lib/rules/disabled-has-reason.js");
const errorPropLinked = require("./lib/rules/error-prop-linked.js");
const iconButtonHasName = require("./lib/rules/icon-button-has-name.js");
const labelInName = require("./lib/rules/label-in-name.js");
const labelPropLinked = require("./lib/rules/label-prop-linked.js");
const repeatedActionContext = require("./lib/rules/repeated-action-context.js");
const selectedHasState = require("./lib/rules/selected-has-state.js");
const toggleHasState = require("./lib/rules/toggle-has-state.js");
const { name, version } = require("./package.json");

const plugin = {
  meta: { name, version },
  rules: {
    "checkbox-has-name": checkboxHasName,
    "collapsed-content-inert": collapsedContentInert,
    "disabled-has-reason": disabledHasReason,
    "error-prop-linked": errorPropLinked,
    "icon-button-has-name": iconButtonHasName,
    "label-in-name": labelInName,
    "label-prop-linked": labelPropLinked,
    "repeated-action-context": repeatedActionContext,
    "selected-has-state": selectedHasState,
    "toggle-has-state": toggleHasState,
  },
  configs: {},
};

const rules = {
  "agentic-dom/checkbox-has-name": "error",
  "agentic-dom/collapsed-content-inert": "warn",
  "agentic-dom/disabled-has-reason": "warn",
  "agentic-dom/error-prop-linked": "warn",
  "agentic-dom/icon-button-has-name": "error",
  "agentic-dom/label-in-name": "warn",
  "agentic-dom/label-prop-linked": "error",
  "agentic-dom/repeated-action-context": "warn",
  "agentic-dom/selected-has-state": "warn",
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
