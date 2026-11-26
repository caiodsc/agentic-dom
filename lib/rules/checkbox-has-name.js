const { elementName, getAttr, hasSpread, attrValue, hasAttrValue, valueKey, expressionValue } = require("../jsx.js");
const { resolveKind } = require("../elements.js");
const { inputType, closestElement, isHidden, hiddenSelf } = require("../components.js");

const NAME_ATTRS = ["aria-label", "aria-labelledby", "title"];

function isCheckbox(opening, context) {
  return attrValue(getAttr(opening, "role")) === "checkbox" || inputType(opening) === "checkbox" || resolveKind(opening, context) === "checkbox";
}

const isNative = (opening) => /^[a-z]/.test(elementName(opening)) && !elementName(opening).includes(".");

// Text or an expression anywhere inside may be the name. React renders nothing for null, undefined or a boolean, and hidden text names nothing.
const hasContent = (element) =>
  element.children.some((c) => {
    if (c.type === "JSXText") return c.value.trim() !== "";
    if (c.type === "JSXExpressionContainer") return c.expression.type !== "JSXEmptyExpression" && rendersText(c.expression);
    return (c.type === "JSXElement" || c.type === "JSXFragment") && rendersText(c);
  });

// `x && <Icon />` and `x ? <Icon /> : null` render only what their JSX holds.
function rendersText(e) {
  if (e.type === "JSXElement" || e.type === "JSXFragment") return !(e.openingElement && hiddenSelf(e.openingElement)) && hasContent(e);
  if (e.type === "LogicalExpression" && e.operator === "&&") return rendersText(e.right);
  if (e.type === "ConditionalExpression") return rendersText(e.consequent) || rendersText(e.alternate);
  const value = expressionValue(e);
  return value != null && typeof value !== "boolean" && !(typeof value === "string" && value.trim() === "");
}

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
        if (hasAttrValue(opening, "htmlFor") && (!isNative(opening) || isNamingLabel(opening))) labelFors.add(valueKey(getAttr(opening, "htmlFor"), sourceCode));
        if (!isCheckbox(opening, context) || hasSpread(opening) || isHidden(opening)) return;
        // A native element has no label attribute.
        const nameAttrs = isNative(opening) ? NAME_ATTRS : [...NAME_ATTRS, "label"];
        if (nameAttrs.some((name) => hasAttrValue(opening, name))) return;
        if (hasContent(opening.parent) || closestElement(opening.parent, isNamingLabel)) return;
        unnamed.push(opening);
      },
      "Program:exit"() {
        for (const opening of unnamed) {
          // A <label htmlFor> anywhere in the file with the same id names it.
          if (hasAttrValue(opening, "id") && labelFors.has(valueKey(getAttr(opening, "id"), sourceCode))) continue;
          context.report({ node: opening, messageId: "noName" });
        }
      },
    };
  },
};
