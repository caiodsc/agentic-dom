const { elementName, getAttr, hasSpread, attrValue, hasAttrValue, valueKey, expressionValue } = require("../jsx.js");
const { resolveKind } = require("../elements.js");
const { inputType, closestElement, isHidden } = require("../components.js");

const NAME_ATTRS = ["aria-label", "aria-labelledby", "title"];

function isCheckbox(opening, context) {
  return attrValue(getAttr(opening, "role")) === "checkbox" || inputType(opening) === "checkbox" || resolveKind(opening, context) === "checkbox";
}

const isNative = (opening) => /^[a-z]/.test(elementName(opening)) && !elementName(opening).includes(".");

// Text or an expression anywhere inside may be the name. React renders nothing for null, undefined or a boolean.
const hasContent = (element) =>
  element.children.some((c) => {
    if (c.type === "JSXText") return c.value.trim() !== "";
    if (c.type === "JSXExpressionContainer") {
      if (c.expression.type === "JSXEmptyExpression") return false;
      const value = expressionValue(c.expression);
      return value != null && typeof value !== "boolean" && !(typeof value === "string" && value.trim() === "");
    }
    return (c.type === "JSXElement" || c.type === "JSXFragment") && hasContent(c);
  });

// A <label> names the checkbox with the text it holds. A Label component may take its text from a prop.
const isNamingLabel = (opening) => {
  if (isNative(opening)) return elementName(opening) === "label" && hasContent(opening.parent);
  return /Label$/.test(elementName(opening).split(".").pop());
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require checkboxes to have a name",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/checkbox-has-name.md",
    },
    schema: [],
    messages: {
      noName:
        "This checkbox has no name. An agent sees a checkbox and cannot tell what it turns on. Wrap it with its text in a <label>, point aria-labelledby at the text next to it, or add aria-label.",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const labelFors = new Set();
    const unnamed = [];

    return {
      JSXOpeningElement(opening) {
        const htmlFor = getAttr(opening, "htmlFor");
        if (htmlFor?.value) labelFors.add(valueKey(htmlFor, sourceCode));
        if (!isCheckbox(opening, context) || hasSpread(opening) || isHidden(opening)) return;
        // A native element has no label attribute.
        const nameAttrs = isNative(opening) ? NAME_ATTRS : [...NAME_ATTRS, "label"];
        if (nameAttrs.some((name) => hasAttrValue(opening, name))) return;
        if (hasContent(opening.parent) || closestElement(opening.parent, isNamingLabel)) return;
        unnamed.push(opening);
      },
      "Program:exit"() {
        for (const opening of unnamed) {
          const id = getAttr(opening, "id");
          // A <label htmlFor> anywhere in the file with the same id names it.
          if (id?.value && labelFors.has(valueKey(id, sourceCode))) continue;
          context.report({ node: opening, messageId: "noName" });
        }
      },
    };
  },
};
