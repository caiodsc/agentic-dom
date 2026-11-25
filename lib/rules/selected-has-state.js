const { getAttr, hasSpread, DYNAMIC, attrValue, walk } = require("../jsx.js");
const { resolveKind } = require("../elements.js");
const { ROLE_STATE, stateOf, handlerOf } = require("../state.js");

const STYLE_ATTRS = ["className", "style"];

function statesSet(handler, sourceCode) {
  const states = new Set();
  walk(handler, sourceCode.visitorKeys, (node) => {
    if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
    const variable = stateOf(node.callee, sourceCode.getScope(node));
    if (variable) states.add(variable);
  });
  return states;
}

const within = (inner, outer) => inner.range[0] >= outer.range[0] && inner.range[1] <= outer.range[1];

function styleTest(opening, states, sourceCode) {
  let test = null;
  for (const name of STYLE_ATTRS) {
    const expr = getAttr(opening, name)?.value?.expression;
    if (!expr || test) continue;
    walk(expr, sourceCode.visitorKeys, (node) => {
      if (test) return false;
      if (node.type !== "BinaryExpression" || (node.operator !== "===" && node.operator !== "==")) return undefined;
      if ([...states].some((state) => state.references.some((ref) => within(ref.identifier, node)))) test = node;
      return undefined;
    });
  }
  return test;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require buttons that look selected to say whether they are selected",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/selected-has-state.md",
    },
    schema: [],
    messages: {
      noState:
        "This button looks selected when {{test}} but never says so. An agent sees every option alike and cannot tell which one is chosen. Add aria-pressed={{{test}}}, or aria-selected with role=\"tab\" for a tab.",
      noRoleState:
        "This button has role=\"{{role}}\" and looks selected when {{test}} but never says so. An agent cannot tell which option is chosen. Add {{attr}}={{{test}}}.",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    return {
      JSXOpeningElement(opening) {
        if (resolveKind(opening, context) !== "button" || hasSpread(opening)) return;
        const role = attrValue(getAttr(opening, "role"));
        const attr = ROLE_STATE.get(role);
        if ((attr ? [attr] : ["aria-pressed", "aria-current"]).some((name) => attrValue(getAttr(opening, name)) === DYNAMIC)) return;
        const handler = handlerOf(opening, sourceCode);
        const states = handler ? statesSet(handler, sourceCode) : new Set();
        const test = states.size > 0 && styleTest(opening, states, sourceCode);
        if (!test) return;
        context.report({ node: opening, messageId: attr ? "noRoleState" : "noState", data: { test: sourceCode.getText(test), role, attr } });
      },
    };
  },
};
