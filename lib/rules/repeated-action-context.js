const { getAttr, hasSpread, attrValue, expressionValue, constInit, findVariable, walk, staticText, DYNAMIC } = require("../jsx.js");
const { resolveKind } = require("../elements.js");

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

function loopCallback(opening, sourceCode) {
  for (let n = opening.parent; n; n = n.parent) {
    if (isLoopArgument(n)) return n;
    if (n.type.includes("Function") && passedToLoop(n, sourceCode)) return n;
  }
  return null;
}

function staticAttr(opening, name, scope) {
  const attr = getAttr(opening, name);
  const expr = attr?.value?.type === "JSXExpressionContainer" ? attr.value.expression : null;
  const init = expr?.type === "Identifier" ? constInit(scope, expr.name) : null;
  if (init) return expressionValue(init);
  return attrValue(attr);
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
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

    // A value changes per row only when it reads a variable declared in the row's callback,
    // outside the value itself. A variable there that is never reassigned counts by what its value reads.
    const fromRow = (expr, callback, followed = new Set()) => {
      const inside = (range, outer) => range[0] >= outer.range[0] && range[1] <= outer.range[1];
      let found = false;
      walk(expr, visitorKeys, (node, parent) => {
        if (found) return false;
        if (node.type !== "Identifier") return undefined;
        if (parent?.type === "MemberExpression" && parent.property === node && !parent.computed) return undefined;
        if (parent?.type === "Property" && parent.key === node && !parent.computed && !parent.shorthand) return undefined;
        const variable = findVariable(sourceCode.getScope(node), node.name);
        const def = variable?.defs[0];
        if (!def || !inside(def.name.range, callback) || inside(def.name.range, expr)) return undefined;
        const assignedOnce = def.type === "Variable" && def.node.init && variable.references.every((ref) => ref.init || !ref.isWrite());
        if (!assignedOnce) found = true;
        else if (!followed.has(variable)) found = fromRow(def.node.init, callback, followed.add(variable));
        return undefined;
      });
      return found;
    };

    // A value shared by every row shows as `${source}`, so the message's suggestion stays valid code.
    const sharedText = (expr) =>
      expr.type === "TemplateLiteral" ? sourceCode.getText(expr).slice(1, -1) : `\${${sourceCode.getText(expr)}}`;

    return {
      JSXOpeningElement(opening) {
        const kind = resolveKind(opening, context);
        if (kind !== "button" && kind !== "link") return;
        const callback = loopCallback(opening, sourceCode);
        if (!callback) return;
        // Spread props can set a name per row.
        if (hasSpread(opening)) return;
        const scope = sourceCode.getScope(opening);
        const expressionOf = (name) => getAttr(opening, name)?.value?.expression;
        if (CONTEXT_ATTRS.some((name) => staticAttr(opening, name, scope) === DYNAMIC && fromRow(expressionOf(name), callback))) return;

        let text;
        const ariaLabel = staticAttr(opening, "aria-label", scope);
        if (ariaLabel === DYNAMIC) {
          const expr = expressionOf("aria-label");
          if (fromRow(expr, callback)) return;
          text = sharedText(expr);
        } else if (typeof ariaLabel === "string") text = ariaLabel.trim();
        else if (opening.parent.type === "JSXElement") {
          text = staticText(opening.parent, visitorKeys, (expr) => (fromRow(expr, callback) ? null : sharedText(expr)));
        }
        if (!text) return;

        context.report({ node: opening, messageId: "sameName", data: { kind, text } });
      },
    };
  },
};
