const { elementName, renderedElement, getAttr, attrValue, hasSpread, hasAttrValue, expressionValue, crowded } = require("../jsx.js");
const { hiddenSelf } = require("../components.js");
const { resolveKind } = require("../elements.js");

// A title on an element inside the button shows a tooltip but does not reach the button's name.
const CONTENT_NAME_ATTRS = ["aria-label", "aria-labelledby"];
const NAME_ATTRS = [...CONTENT_NAME_ATTRS, "title"];
const BLANK_TAGS = new Set(["span", "div", "i"]);

function isBlank(child) {
  if (child.type === "JSXText") return child.value.trim() === "";
  if (child.type === "JSXExpressionContainer") {
    if (child.expression.type === "JSXEmptyExpression") return true;
    const value = expressionValue(child.expression);
    return value == null || typeof value === "boolean" || (typeof value === "string" && value.trim() === "");
  }
  if (child.type === "JSXFragment") return child.children.every(isBlank);
  // A spread child ({...items}) parses only with some parsers.
  /* node:coverage ignore next */
  if (child.type !== "JSXElement") return false;
  const opening = child.openingElement;
  if (!BLANK_TAGS.has(elementName(opening)) || hasSpread(opening)) return false;
  if (hiddenSelf(opening)) return true;
  return !CONTENT_NAME_ATTRS.some((name) => hasAttrValue(opening, name)) && child.children.every(isBlank);
}

// A <label> around the button names it with whatever else it holds.
function namedByLabel(button) {
  let content = false;
  for (let cur = button; cur.parent; cur = cur.parent) {
    if ((cur.parent.children ?? []).some((sibling) => sibling !== cur && !isBlank(sibling))) content = true;
    if (cur.parent.type === "JSXElement" && elementName(cur.parent.openingElement) === "label") return content;
  }
  return false;
}

// A button handed to another element as a prop may get its content from that element.
function handedAsProp(element) {
  let cur = element.parent;
  while (cur.type === "ConditionalExpression" || cur.type === "LogicalExpression") cur = cur.parent;
  return cur.type === "JSXExpressionContainer" && cur.parent.type === "JSXAttribute";
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
      noNameAmongUnnamed:
        "This button shows no text and has no name, and other buttons with no name sit beside it. An agent cannot tell these buttons apart, so it has to click one to find out what it does. Add aria-label with what each one does.",
    },
  },

  create(context) {
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
        if (button.some((part) => [...NAME_ATTRS, "id"].some((name) => hasAttrValue(part, name)))) return;
        const children = opening.parent.children;
        const tag = elementName(opening);
        const native =
          (tag === "button" || (tag === "input" && attrValue(getAttr(opening, "type")) === "button" && !hasAttrValue(opening, "value"))) &&
          !handedAsProp(opening.parent) &&
          !["children", "dangerouslySetInnerHTML"].some((name) => getAttr(opening, name));
        if (!native && !children.some((child) => child.type === "JSXElement" || child.type === "JSXFragment")) return;
        if (!children.every(isBlank)) return;
        if (!namedByLabel(opening.parent)) unnamed.push(opening);
      },
    };
  },
};
