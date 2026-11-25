const { getAttr, hasSpread, DYNAMIC, attrValue, findVariable, walk } = require("../jsx.js");
const { resolveKind } = require("../elements.js");
const { ROLE_STATE, isFunction, stateOf, handlerOf } = require("../state.js");

const isJsx = (node) => node.type === "JSXElement" || node.type === "JSXFragment";

function reads(node, variable, scope) {
  return node.type === "Identifier" && findVariable(scope, node.name) === variable;
}

function flips(arg, variable, sourceCode) {
  if (arg?.type === "UnaryExpression" && arg.operator === "!") return reads(arg.argument, variable, sourceCode.getScope(arg));
  const param = isFunction(arg) && arg.params.length === 1 ? arg.params[0] : null;
  const body = param?.type === "Identifier" ? arg.body : null;
  return body?.type === "UnaryExpression" && body.operator === "!" && body.argument.type === "Identifier" && body.argument.name === param.name;
}

function toggledStates(handler, sourceCode) {
  const states = [];
  walk(handler, sourceCode.visitorKeys, (node) => {
    if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return undefined;
    const variable = stateOf(node.callee, sourceCode.getScope(node));
    if (variable && flips(node.arguments[0], variable, sourceCode)) states.push(variable);
    return undefined;
  });
  return states;
}

// The value the state attribute should read, like `x` or `!x`, or null for any other use of the state.
function stateValue(id) {
  const negated = id.parent.type === "UnaryExpression" && id.parent.operator === "!";
  const node = negated ? id.parent : id;
  const p = node.parent;
  let shownIfTrue = null;
  if (p.type === "LogicalExpression" && p.operator === "&&" && p.left === node && isJsx(p.right)) shownIfTrue = true;
  else if (p.type === "ConditionalExpression" && p.test === node && isJsx(p.consequent) && isJsx(p.alternate)) return id.name;
  else if (p.type === "ConditionalExpression" && p.test === node && (isJsx(p.consequent) || isJsx(p.alternate))) shownIfTrue = isJsx(p.consequent);
  if (shownIfTrue === null) return null;
  return shownIfTrue === negated ? `!${id.name}` : id.name;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require buttons that show and hide content to say whether it is shown",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/toggle-has-state.md",
    },
    schema: [],
    messages: {
      noState:
        "This button shows and hides content but never says whether it is shown. An agent clicks it and cannot tell if it opened or closed. Add aria-expanded={{{shown}}}, or aria-pressed for an on/off button.",
      noRoleState:
        "This button has role=\"{{role}}\" but never says its state. An agent clicks it and cannot tell what changed. Add {{attr}}={{{shown}}}.",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    return {
      JSXOpeningElement(opening) {
        if (resolveKind(opening, context) !== "button" || hasSpread(opening)) return;
        const role = attrValue(getAttr(opening, "role"));
        const attr = ROLE_STATE.get(role);
        if ((attr ? [attr] : ["aria-expanded", "aria-pressed"]).some((name) => attrValue(getAttr(opening, name)) === DYNAMIC)) return;
        const handler = handlerOf(opening, sourceCode);
        const states = handler ? toggledStates(handler, sourceCode) : [];
        const shown = states.flatMap((state) => state.references.map((r) => stateValue(r.identifier))).find(Boolean);
        if (!shown) return;
        context.report({ node: opening, messageId: attr ? "noRoleState" : "noState", data: { shown, role, attr } });
      },
    };
  },
};
