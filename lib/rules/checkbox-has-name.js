const { elementName, getAttr, hasSpread, attrValue, hasAttrValue } = require("../jsx.js");
const { inputType, closestElement, isHidden } = require("../components.js");

const NAME_ATTRS = ["aria-label", "aria-labelledby", "title"];

function isCheckbox(opening, context) {
  const name = elementName(opening);
  const mapped = context.settings?.["agentic-dom"]?.components?.[name]?.as;
  if (mapped) return mapped === "checkbox";
  if (attrValue(getAttr(opening, "role")) === "checkbox") return true;
  if (inputType(opening) === "checkbox") return true;
  return (/^[A-Z]/.test(name) || name.includes(".")) && /Checkbox$/.test(name.split(".").pop());
}

const isLabel = (opening) => {
  const name = elementName(opening);
  return name === "label" || /Label$/.test(name.split(".").pop());
};

// Text or an expression anywhere inside may be the name.
const hasContent = (element) =>
  element.children.some((c) => {
    if (c.type === "JSXText") return c.value.trim() !== "";
    if (c.type === "JSXExpressionContainer") return c.expression.type !== "JSXEmptyExpression";
    return (c.type === "JSXElement" || c.type === "JSXFragment") && hasContent(c);
  });

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
    const valueText = (attr) => (attr.value.type === "JSXExpressionContainer" ? sourceCode.getText(attr.value.expression) : sourceCode.getText(attr.value));

    return {
      JSXOpeningElement(opening) {
        const htmlFor = getAttr(opening, "htmlFor");
        if (htmlFor?.value) labelFors.add(valueText(htmlFor));
        if (!isCheckbox(opening, context) || hasSpread(opening) || isHidden(opening)) return;
        if ([...NAME_ATTRS, "label"].some((name) => hasAttrValue(opening, name))) return;
        if (hasContent(opening.parent) || closestElement(opening.parent, isLabel)) return;
        unnamed.push(opening);
      },
      "Program:exit"() {
        for (const opening of unnamed) {
          const id = getAttr(opening, "id");
          // A <label htmlFor> anywhere in the file with the same id names it.
          if (id?.value && labelFors.has(valueText(id))) continue;
          context.report({ node: opening, messageId: "noName" });
        }
      },
    };
  },
};
