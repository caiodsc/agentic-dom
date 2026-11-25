const { elementName, hasSpread, hasAttrValue } = require("../jsx.js");
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
      return name === "svg" || (/^[A-Z]/.test(name) && iconPattern.test(name.split(".").pop()));
    }

    // True when every child is an icon or blank text, and there is at least one icon.
    function onlyIcons(element) {
      let icons = 0;
      for (const child of element.children) {
        if (child.type === "JSXText") {
          if (child.value.trim() !== "") return false;
        } else if (child.type === "JSXExpressionContainer" && child.expression.type === "JSXEmptyExpression") {
          continue;
        } else if (child.type === "JSXElement" && isIcon(child)) {
          icons += 1;
        } else {
          return false;
        }
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
