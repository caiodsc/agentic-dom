const { findVariable, elementName, renderedElement, hasSpread, hasAttrValue, expressionValue, walk, crowded } = require("../jsx.js");
const { resolveKind } = require("../elements.js");

const NAME_ATTRS = ["aria-label", "aria-labelledby", "title"];
const DEFAULT_ICON_PATTERN = "^Icon[A-Z]|Icon$";
const ICON_PACKAGE = /^lucide-react(\/|$)/;

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
      noNameAmongUnnamed:
        "This button shows only an icon and has no name, and other buttons with no name sit beside it. An agent cannot tell these buttons apart, so it has to click one to find out what it does. Add aria-label with what it does, e.g. aria-label=\"Delete\".",
    },
  },

  create(context) {
    const iconPattern = new RegExp(context.options[0]?.iconPattern ?? DEFAULT_ICON_PATTERN);

    function isIcon(element) {
      const name = elementName(element.openingElement);
      const def = findVariable(context.sourceCode.getScope(element), name.split(".")[0])?.defs[0];
      if (name === "svg" || (def?.type === "ImportBinding" && ICON_PACKAGE.test(def.parent.source.value))) return true;
      return (name.includes(".") || /^[A-Z]/.test(name)) && iconPattern.test(name.split(".").pop());
    }

    // Icons a child shows: 0 for nothing, null when it may show something else.
    // With oneBranch, a ternary with an icon branch counts that branch, since the button shows it in some state.
    function iconsIn(node, oneBranch) {
      if (node.type === "JSXExpressionContainer") return iconsIn(node.expression, oneBranch);
      if (node.type === "JSXFragment") return iconsInAll(node.children, oneBranch);
      if (node.type === "JSXText") return node.value.trim() === "" ? 0 : null;
      if (node.type === "JSXElement") return isIcon(node) ? 1 : null;
      if (node.type === "JSXEmptyExpression") return 0;
      if (node.type === "ConditionalExpression") {
        const [a, b] = [iconsIn(node.consequent, oneBranch), iconsIn(node.alternate, oneBranch)];
        if (oneBranch && (a > 0 || b > 0)) return Math.max(a, b);
        return a === null || b === null ? null : Math.max(a, b);
      }
      if (node.type === "LogicalExpression" && node.operator === "&&") return iconsIn(node.right, oneBranch);
      const value = expressionValue(node);
      return value == null || typeof value === "boolean" || value === "" ? 0 : null;
    }

    function iconsInAll(children, oneBranch) {
      let icons = 0;
      for (const child of children) {
        const n = iconsIn(child, oneBranch);
        if (n === null) return null;
        icons += n;
      }
      return icons;
    }

    const unnamed = [];
    return {
      "Program:exit"() {
        const together = crowded(unnamed.map((opening) => opening.parent));
        for (const opening of unnamed) {
          context.report({ node: opening, messageId: together.has(opening.parent) ? "noNameAmongUnnamed" : "noName" });
        }
      },
      JSXOpeningElement(opening) {
        const button = [opening, renderedElement(opening)].filter(Boolean);
        if (!button.some((part) => resolveKind(part, context) === "button") || button.some(hasSpread)) return;
        if (button.some((part) => NAME_ATTRS.some((name) => hasAttrValue(part, name)))) return;
        const children = opening.parent.children;
        // Two ternaries may share a condition, so their branches cannot be paired freely.
        let ternaries = 0;
        for (const child of children) {
          walk(child, context.sourceCode.visitorKeys, (n) => {
            if (n.type === "JSXOpeningElement") return false;
            if (n.type === "ConditionalExpression") ternaries += 1;
            return undefined;
          });
        }
        if (iconsInAll(children, ternaries === 1) > 0) unnamed.push(opening);
      },
    };
  },
};
