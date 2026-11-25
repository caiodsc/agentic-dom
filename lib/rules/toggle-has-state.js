const { getAttr, hasSpread, attrValue, findVariable, constInit, walk } = require("../jsx.js");
const { resolveKind } = require("../elements.js");

const STATE_ROLES = new Set(["switch", "checkbox", "tab"]);

const isJsx = (node) => node.type === "JSXElement" || node.type === "JSXFragment";
const isFunction = (node) => node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";

function isUseState(init) {
  const callee = init?.type === "CallExpression" ? init.callee : null;
  if (callee?.type === "Identifier") return callee.name === "useState";
  return callee?.type === "MemberExpression" && callee.object.name === "React" && callee.property.name === "useState";
}

// The state variable of `const [x, setX] = useState()` when `id` reads setX, or null.
function stateOf(id, scope) {
  const def = findVariable(scope, id.name)?.defs[0];
  if (def?.type !== "Variable" || def.node.id.type !== "ArrayPattern" || !isUseState(def.node.init)) return null;
  const [state, setter] = def.node.id.elements;
  if (setter !== def.name || state?.type !== "Identifier") return null;
  return findVariable(scope, state.name);
}

function reads(node, variable, scope) {
  return node.type === "Identifier" && findVariable(scope, node.name) === variable;
}

function flips(arg, variable, sourceCode) {
  if (arg?.type === "UnaryExpression" && arg.operator === "!") return reads(arg.argument, variable, sourceCode.getScope(arg));
  const param = isFunction(arg) && arg.params.length === 1 ? arg.params[0] : null;
  const body = param?.type === "Identifier" ? arg.body : null;
  return body?.type === "UnaryExpression" && body.operator === "!" && body.argument.type === "Identifier" && body.argument.name === param.name;
}

function toggledState(handler, sourceCode) {
  let state = null;
  walk(handler, sourceCode.visitorKeys, (node) => {
    if (state) return false;
    if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return undefined;
    const variable = stateOf(node.callee, sourceCode.getScope(node));
    if (variable && flips(node.arguments[0], variable, sourceCode)) state = variable;
    return undefined;
  });
  return state;
}

// What aria-expanded reads: `x` for `x && <JSX>` or `x ? <JSX> : …`, `!x` for `!x && <JSX>` or `x ? … : <JSX>`, else null.
function shownWhen(id) {
  const negated = id.parent.type === "UnaryExpression" && id.parent.operator === "!";
  const node = negated ? id.parent : id;
  const p = node.parent;
  let shownIfTrue = null;
  if (p.type === "LogicalExpression" && p.operator === "&&" && p.left === node && isJsx(p.right)) shownIfTrue = true;
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
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    function handlerOf(opening) {
      const expr = getAttr(opening, "onClick")?.value?.expression;
      if (isFunction(expr)) return expr;
      if (expr?.type !== "Identifier") return null;
      const init = constInit(sourceCode.getScope(expr), expr.name);
      return isFunction(init) ? init : null;
    }

    return {
      JSXOpeningElement(opening) {
        if (resolveKind(opening, context) !== "button" || hasSpread(opening)) return;
        if (getAttr(opening, "aria-expanded") || getAttr(opening, "aria-pressed")) return;
        if (STATE_ROLES.has(attrValue(getAttr(opening, "role")))) return;
        const handler = handlerOf(opening);
        const state = handler && toggledState(handler, sourceCode);
        const shown = state && state.references.map((r) => shownWhen(r.identifier)).find(Boolean);
        if (!shown) return;
        context.report({ node: opening, messageId: "noState", data: { shown } });
      },
    };
  },
};
