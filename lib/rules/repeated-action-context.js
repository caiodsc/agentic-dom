import { getAttr, attrValue, expressionValue, constInit, staticText, DYNAMIC } from "../jsx.js";
import { resolveKind } from "../elements.js";

const LOOP_METHODS = new Set(["map", "flatMap"]);
const CONTEXT_ATTRS = ["aria-labelledby", "aria-describedby"];

function isLoopArgument(node) {
  const call = node.parent;
  if (call?.type !== "CallExpression" || !call.arguments.includes(node)) return false;
  const callee = call.callee;
  return callee.type === "MemberExpression" && LOOP_METHODS.has(callee.computed ? callee.property.value : callee.property.name);
}

function passedToLoop(fn, sourceCode) {
  const declared = fn.type === "FunctionDeclaration" ? fn : fn.parent?.type === "VariableDeclarator" ? fn.parent : null;
  if (!declared) return false;
  return sourceCode
    .getDeclaredVariables(declared)
    .some((v) => v.references.some((ref) => isLoopArgument(ref.identifier)));
}

function insideLoopCallback(opening, sourceCode) {
  for (let n = opening.parent; n; n = n.parent) {
    if (isLoopArgument(n)) return true;
    if (n.type.includes("Function") && passedToLoop(n, sourceCode)) return true;
  }
  return false;
}

function staticAttr(opening, name, scope) {
  const attr = getAttr(opening, name);
  const expr = attr?.value?.type === "JSXExpressionContainer" ? attr.value.expression : null;
  const init = expr?.type === "Identifier" ? constInit(scope, expr.name) : null;
  if (init) return expressionValue(init);
  return attrValue(attr);
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require buttons and links repeated in a list to name the row they act on",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/repeated-action-context.md",
    },
    schema: [],
    messages: {
      sameName:
        "Every row renders a {{kind}} named \"{{text}}\". An agent sees many identical {{kind}}s and cannot tell which row each one acts on. Add the row to its name, e.g. aria-label={`{{text}} ${item.name}`}.",
    },
  },

  create(context) {
    const { sourceCode } = context;
    const visitorKeys = sourceCode.visitorKeys;
    return {
      JSXOpeningElement(opening) {
        const kind = resolveKind(opening, context);
        if (kind !== "button" && kind !== "link") return;
        if (!insideLoopCallback(opening, sourceCode)) return;
        const scope = sourceCode.getScope(opening);
        // A fixed ID is the same on every row, so it cannot point at the row.
        if (CONTEXT_ATTRS.some((name) => staticAttr(opening, name, scope) === DYNAMIC)) return;

        let text;
        const ariaLabel = staticAttr(opening, "aria-label", scope);
        if (ariaLabel === DYNAMIC) return;
        if (typeof ariaLabel === "string") text = ariaLabel.trim();
        else if (opening.parent.type === "JSXElement") text = staticText(opening.parent, visitorKeys);
        if (!text) return;

        context.report({ node: opening, messageId: "sameName", data: { kind, text } });
      },
    };
  },
};
