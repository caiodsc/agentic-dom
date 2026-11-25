const { hasSpread, hasAttrValue, getAttr, attrValue } = require("../jsx.js");
const { componentNameOf, propBinding, refersToProp, isControl, containsJsx, closestElement, isHidden } = require("../components.js");

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require components that show an error prop to link it to the control they render",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/error-prop-linked.md",
    },
    schema: [
      {
        type: "object",
        properties: { errorProps: { type: "array", items: { type: "string" }, uniqueItems: true } },
        additionalProperties: false,
      },
    ],
    messages: {
      notLinked:
        "`{{component}}` shows `{{prop}}` as text but none of its controls points at it. An agent sees the field but not why it was rejected. Give the error text an id from useId and point the control's aria-describedby at it.",
    },
  },

  create(context) {
    const propNames = context.options[0]?.errorProps ?? ["error", "errorMessage"];
    const visitorKeys = context.sourceCode.visitorKeys;
    const stack = [];

    function enter(fn) {
      const name = componentNameOf(fn);
      const binding = name ? propBinding(fn, propNames) : null;
      stack.push(binding ? { fn, name, binding, hasControl: false, linked: false, rendered: null } : { fn, passthrough: !name });
    }

    function current() {
      // A nested component owns its controls, so the outer component stops there.
      for (let i = stack.length - 1; i >= 0; i--) if (!stack[i].passthrough) return stack[i].binding ? stack[i] : null;
      return null;
    }

    function exit(fn) {
      const state = stack.pop();
      if (!state || state.fn !== fn || !state.binding || !state.rendered || !state.hasControl || state.linked) return;
      context.report({
        node: state.binding.node,
        messageId: "notLinked",
        data: { component: state.name, prop: state.rendered },
      });
    }

    return {
      FunctionDeclaration: enter,
      FunctionExpression: enter,
      ArrowFunctionExpression: enter,
      "FunctionDeclaration:exit": exit,
      "FunctionExpression:exit": exit,
      "ArrowFunctionExpression:exit": exit,

      JSXOpeningElement(opening) {
        const state = current();
        if (!state || !isControl(opening) || isHidden(opening)) return;
        state.hasControl = true;
        // One linked control is enough: the others may be a search box or a part of the same field.
        if (hasSpread(opening) || hasAttrValue(opening, "aria-describedby")) state.linked = true;
      },

      JSXExpressionContainer(node) {
        const state = current();
        if (!state || state.rendered) return;
        const p = node.parent?.type;
        if (p !== "JSXElement" && p !== "JSXFragment") return;
        // A condition around JSX: the error text inside it is checked on its own.
        if (containsJsx(node.expression, visitorKeys)) return;
        // An agent reads text inside role="alert" as an error already.
        if (closestElement(node, (o) => attrValue(getAttr(o, "role")) === "alert")) return;
        state.rendered = refersToProp(node.expression, state.binding, context.sourceCode);
      },
    };
  },
};
