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

    const inside = (range, outer) => range[0] >= outer.range[0] && range[1] <= outer.range[1];

    // A property write, a call or another name for the object outside the value can change what it holds.
    const changedOutside = (id, expr, seen = new Set()) => {
      if (inside(id.range, expr)) return false;
      let top = id;
      while (top.parent.type === "MemberExpression" && top.parent.object === top) top = top.parent;
      const { parent } = top;
      if (parent.type === "CallExpression") return parent.callee === top ? top !== id : parent.arguments.includes(top);
      // A second name counts by what is done through it. Seen names stop names that point at each other.
      if (parent.type === "VariableDeclarator" && parent.init === top && parent.id.type === "Identifier") {
        const alias = sourceCode.getDeclaredVariables(parent)[0];
        if (seen.has(alias)) return false;
        return alias.references.some((ref) => changedOutside(ref.identifier, expr, seen.add(alias)));
      }
      if (
        (parent.type === "VariableDeclarator" && parent.init === top) ||
        (parent.type === "AssignmentExpression" && parent.right === top) ||
        (parent.type === "Property" && parent.value === top && parent.parent.type === "ObjectExpression") ||
        parent.type === "ArrayExpression"
      )
        return true;
      if (top === id) return false;
      return (parent.type === "AssignmentExpression" && parent.left === top) || parent.type === "UpdateExpression" || parent.operator === "delete";
    };

    // A value changes per row only when it reads a variable declared in the row's callback,
    // outside the value itself. A variable or function there that nothing reassigns or changes counts by what its declaration reads.
    const fromRow = (expr, callback, followed = new Set()) => {
      let found = false;
      walk(expr, visitorKeys, (node, parent) => {
        if (found) return false;
        if (node.type !== "Identifier") return undefined;
        if (parent?.type === "MemberExpression" && parent.property === node && !parent.computed) return undefined;
        if (parent?.type === "Property" && parent.key === node && !parent.computed && !parent.shorthand) return undefined;
        const variable = findVariable(sourceCode.getScope(node), node.name);
        const def = variable?.defs[0];
        if (!def || !inside(def.name.range, callback) || inside(def.name.range, expr)) return undefined;
        const declared = def.type === "FunctionName" || (def.type === "Variable" && def.node.init);
        // Written-out text is a string, so no call or property write can change it.
        const text = ["Literal", "TemplateLiteral"].includes(def.node.init?.type);
        if (!declared || variable.references.some((ref) => (ref.isWrite() && !ref.init) || (!text && changedOutside(ref.identifier, expr)))) found = true;
        else if (!followed.has(variable)) found = fromRow(def.node, callback, followed.add(variable));
        return undefined;
      });
      return found;
    };

    // An element, or a const set to null or a boolean, renders no text.
    const notText = (expr) => {
      const init = expr.type === "Identifier" ? constInit(sourceCode.getScope(expr), expr.name) : null;
      const value = init ? expressionValue(init) : DYNAMIC;
      if (value !== DYNAMIC && typeof value !== "string" && typeof value !== "number") return true;
      let element = false;
      walk(init ?? expr, visitorKeys, (node) => {
        if (node.type === "JSXElement" || node.type === "JSXFragment") element = true;
        return element ? false : undefined;
      });
      return element;
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
        const expressionOf = (name) => {
          const value = getAttr(opening, name)?.value;
          return value?.expression ?? value;
        };
        if (CONTEXT_ATTRS.some((name) => staticAttr(opening, name, scope) === DYNAMIC && fromRow(expressionOf(name), callback))) return;

        let text;
        const ariaLabel = staticAttr(opening, "aria-label", scope);
        if (ariaLabel === DYNAMIC) {
          const expr = expressionOf("aria-label");
          if (fromRow(expr, callback)) return;
          text = sharedText(expr);
        } else if (typeof ariaLabel === "string") text = ariaLabel.trim();
        else if (opening.parent.type === "JSXElement") {
          // An element written inside braces counts as if written without them.
          const childText = (expr) =>
            expr.type === "JSXElement" || expr.type === "JSXFragment"
              ? staticText({ children: [expr] }, visitorKeys, childText)
              : fromRow(expr, callback) || notText(expr) ? null : sharedText(expr);
          text = staticText(opening.parent, visitorKeys, childText);
        }
        if (!text) return;

        context.report({ node: opening, messageId: "sameName", data: { kind, text } });
      },
    };
  },
};
