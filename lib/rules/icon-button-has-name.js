const { findVariable, elementName, renderedElement, hasSpread, hasAttrValue, expressionValue, walk } = require("../jsx.js");
const { resolveKind } = require("../elements.js");

const NAME_ATTRS = ["aria-label", "aria-labelledby", "title"];
const DEFAULT_ICON_PATTERN = "^Icon[A-Z]|Icon$";
const ICON_PACKAGE = /^lucide-react(\/|$)/;
// A picture of a person says nothing about what the button does.
const AVATAR = /Avatar$/;

const nameParts = (opening) => elementName(opening).split(".");
const isTooltip = (opening) => {
  const [last, owner] = nameParts(opening).reverse();
  return last === "Tooltip" || (owner === "Tooltip" && last === "Root");
};
const isTooltipContent = (opening) => {
  const [last, owner] = nameParts(opening).reverse();
  return /^Tooltip(Content|Popup)$/.test(last) || (owner === "Tooltip" && /^(Content|Popup|Portal)$/.test(last));
};
const hasText = (c) =>
  (c.type === "JSXText" && c.value.trim() !== "") ||
  (c.type === "JSXExpressionContainer" && c.expression.type !== "JSXEmptyExpression") ||
  (c.type === "JSXElement" && c.children.some(hasText));

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
      const def = findVariable(context.sourceCode.getScope(element), name.split(".")[0])?.defs[0];
      if (name === "svg" || (def?.type === "ImportBinding" && ICON_PACKAGE.test(def.parent.source.value))) return true;
      const last = name.split(".").pop();
      return (name.includes(".") || /^[A-Z]/.test(name)) && (iconPattern.test(last) || AVATAR.test(last));
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

    // The button is the tooltip's trigger, or the child of a trigger with asChild.
    function showsTooltipText(opening) {
      let n = opening.parent.parent;
      for (let depth = 0; depth < 2 && n?.type === "JSXElement"; depth++, n = n.parent) {
        if (!isTooltip(n.openingElement)) continue;
        return n.children.some((c) => c.type === "JSXElement" && isTooltipContent(c.openingElement) && c.children.some(hasText));
      }
      return false;
    }

    return {
      JSXOpeningElement(opening) {
        const button = [opening, renderedElement(opening)].filter(Boolean);
        if (!button.some((part) => resolveKind(part, context) === "button")) return;
        // A spread may carry a name, unless a tooltip shows the name: its text is never the trigger's name.
        if (button.some(hasSpread) && !showsTooltipText(opening)) return;
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
        if (!(iconsInAll(children, ternaries === 1) > 0)) return;
        context.report({ node: opening, messageId: "noName" });
      },
    };
  },
};
