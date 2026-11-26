const { elementName, hasSpread, hasAttrValue, expressionValue } = require("../jsx.js");
const { resolveKind } = require("../elements.js");

const NAME_ATTRS = ["aria-label", "aria-labelledby", "title"];
const BLANK_TAGS = new Set(["span", "div", "i"]);

// True when a child shows no text: blank text, a value React renders as nothing, or a fragment, span, div or i with only such children.
function isBlank(child) {
  if (child.type === "JSXText") return child.value.trim() === "";
  if (child.type === "JSXExpressionContainer") {
    if (child.expression.type === "JSXEmptyExpression") return true;
    const value = expressionValue(child.expression);
    return value == null || typeof value === "boolean" || value === "";
  }
  if (child.type === "JSXFragment") return child.children.every(isBlank);
  // A spread child ({...items}) parses only with some parsers.
  /* node:coverage ignore next */
  if (child.type !== "JSXElement") return false;
  const opening = child.openingElement;
  if (!BLANK_TAGS.has(elementName(opening)) || hasSpread(opening)) return false;
  return !NAME_ATTRS.some((name) => hasAttrValue(opening, name)) && child.children.every(isBlank);
}

// A <label> around the button names it.
function insideLabel(node) {
  for (let cur = node.parent; cur; cur = cur.parent) {
    if (cur.type === "JSXElement" && elementName(cur.openingElement) === "label") return true;
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require buttons that show no text to have a name",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/empty-button-has-name.md",
    },
    schema: [],
    messages: {
      noName:
        "This button shows no text and has no name. An agent sees a button with no name and cannot tell what it does. Add aria-label with what it does, or aria-labelledby with the id of the text beside it.",
    },
  },

  create(context) {
    return {
      JSXOpeningElement(opening) {
        if (resolveKind(opening, context) !== "button" || hasSpread(opening)) return;
        if ([...NAME_ATTRS, "id"].some((name) => hasAttrValue(opening, name))) return;
        const children = opening.parent.children;
        if (!children.some((child) => child.type === "JSXElement" || child.type === "JSXFragment") || !children.every(isBlank)) return;
        if (insideLabel(opening.parent)) return;
        context.report({ node: opening, messageId: "noName" });
      },
    };
  },
};
