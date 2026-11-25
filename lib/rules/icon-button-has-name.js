const { elementName, hasSpread, hasAttrValue, expressionValue } = require("../jsx.js");
const { resolveKind } = require("../elements.js");

const NAME_ATTRS = ["aria-label", "aria-labelledby"];
const DEFAULT_ICON_PATTERN = "^Icon[A-Z]|Icon$";

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require buttons that show only an icon to have a name",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/icon-button-has-name.md",
    },
    schema: [
      {
        type: "object",
        properties: { iconPattern: { type: "string", minLength: 1 } },
        additionalProperties: false,
      },
    ],
    messages: {
      noName:
        "This button shows only an icon and has no name. An agent sees a button with no name and cannot tell what it does. Add aria-label with what it does, e.g. aria-label=\"Close\".",
    },
  },

  create(context) {
    const iconPattern = new RegExp(context.options[0]?.iconPattern ?? DEFAULT_ICON_PATTERN);

    function isIcon(element) {
      const name = elementName(element.openingElement);
      return name === "svg" || ((name.includes(".") || /^[A-Z]/.test(name)) && iconPattern.test(name.split(".").pop()));
    }

    const unwrap = (children) => children.flatMap((c) => (c.type === "JSXFragment" ? unwrap(c.children) : [c]));

    // Icons a child shows: 0 for nothing, null when it may show something else.
    function iconsIn(node) {
      if (node.type === "JSXText") return node.value.trim() === "" ? 0 : null;
      if (node.type === "JSXElement") return isIcon(node) ? 1 : null;
      if (node.type === "JSXEmptyExpression") return 0;
      if (node.type === "ConditionalExpression") {
        const [a, b] = [iconsIn(node.consequent), iconsIn(node.alternate)];
        return a === null || b === null ? null : Math.max(a, b);
      }
      if (node.type === "LogicalExpression" && node.operator === "&&") return iconsIn(node.right);
      const value = expressionValue(node);
      return value == null || typeof value === "boolean" || value === "" ? 0 : null;
    }

    function onlyIcons(element) {
      let icons = 0;
      for (const child of unwrap(element.children)) {
        const n = iconsIn(child.type === "JSXExpressionContainer" ? child.expression : child);
        if (n === null) return false;
        icons += n;
      }
      return icons > 0;
    }

    return {
      JSXOpeningElement(opening) {
        if (resolveKind(opening, context) !== "button" || hasSpread(opening)) return;
        if (NAME_ATTRS.some((name) => hasAttrValue(opening, name)) || !onlyIcons(opening.parent)) return;
        context.report({ node: opening, messageId: "noName" });
      },
    };
  },
};
