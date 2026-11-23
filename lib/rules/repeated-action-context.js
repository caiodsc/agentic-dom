const { getAttr, attrValue, expressionValue, constInit, findVariable, walk, staticText, DYNAMIC } = require("../jsx.js");
const { resolveKind } = require("../elements.js");

const LOOP_METHODS = new Set(["map", "flatMap"]);
const CONTEXT_ATTRS = ["aria-labelledby", "aria-describedby"];
const NAME_PROPS = new Set(["aria-label", "aria-labelledby", "aria-describedby", "children"]);

// A spread can set a name per row, unless it is an object written out without name props.
function spreadMayName(attr) {
  const arg = attr.argument;
  if (arg.type !== "ObjectExpression") return true;
  return arg.properties.some((p) => p.type !== "Property" || p.computed || NAME_PROPS.has(p.key.name ?? p.key.value));
}

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

    // A value changes per row only when it reads a variable declared in the row's callback.
    // A const there counts by what its value reads.
    const fromRow = (expr, scope, callback) => {
      let found = false;
      walk(expr, visitorKeys, (node, parent) => {
        if (found) return false;
        if (node.type !== "Identifier") return undefined;
        if (parent?.type === "MemberExpression" && parent.property === node && !parent.computed) return undefined;
        if (parent?.type === "Property" && parent.key === node && !parent.computed && !parent.shorthand) return undefined;
        const def = findVariable(scope, node.name)?.defs[0]?.name;
        if (!def || def.range[0] < callback.range[0] || def.range[1] > callback.range[1]) return undefined;
        const init = constInit(scope, node.name);
        found = init ? fromRow(init, scope, callback) : true;
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
        if (opening.attributes.some((a) => a.type === "JSXSpreadAttribute" && spreadMayName(a))) return;
        const scope = sourceCode.getScope(opening);
        const expressionOf = (name) => getAttr(opening, name)?.value?.expression;
        if (CONTEXT_ATTRS.some((name) => staticAttr(opening, name, scope) === DYNAMIC && fromRow(expressionOf(name), scope, callback))) return;

        let text;
        const ariaLabel = staticAttr(opening, "aria-label", scope);
        if (ariaLabel === DYNAMIC) {
          const expr = expressionOf("aria-label");
          if (fromRow(expr, scope, callback)) return;
          text = sharedText(expr);
        } else if (typeof ariaLabel === "string") text = ariaLabel.trim();
        else if (opening.parent.type === "JSXElement") {
          text = staticText(opening.parent, visitorKeys, (expr) => (fromRow(expr, scope, callback) ? null : sharedText(expr)));
        }
        if (!text) return;

        context.report({ node: opening, messageId: "sameName", data: { kind, text } });
      },
    };
  },
};
