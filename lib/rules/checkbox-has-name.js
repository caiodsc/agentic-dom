const { elementName, getAttr, hasSpread, attrValue, hasAttrValue, valueKey, expressionValue, DYNAMIC } = require("../jsx.js");
const { isNativeTag, resolveKind } = require("../elements.js");
const { inputType, closestElement, isHidden, hiddenSelf, isLabelableTag } = require("../components.js");

const NAME_ATTRS = ["aria-label", "aria-labelledby", "title"];
// These always give a boolean.
const BOOLEAN_OPERATORS = new Set(["!", "==", "!=", "===", "!==", "<", "<=", ">", ">=", "in", "instanceof"]);

function isCheckbox(opening, context) {
  return attrValue(getAttr(opening, "role")) === "checkbox" || inputType(opening) === "checkbox" || resolveKind(opening, context) === "checkbox";
}

const isNative = (opening) => isNativeTag(elementName(opening));
// A <label> does not name a <div role="checkbox">, around it or through htmlFor.
const isLabelable = (opening) => !isNative(opening) || isLabelableTag(elementName(opening));

// Text or an expression anywhere inside may be the name. React renders nothing for null, undefined or a boolean.
// `x && <Icon />` and `x ? <Icon /> : null` render only what their JSX holds.
function rendersText(e) {
  if (e.type === "JSXText") return e.value.trim() !== "";
  if (e.type === "JSXEmptyExpression") return false;
  if (e.type === "JSXExpressionContainer") return rendersText(e.expression);
  if (e.type === "JSXElement" && hiddenSelf(e.openingElement)) return false;
  if (e.type === "JSXElement" || e.type === "JSXFragment") return hasContent(e);
  if (e.type === "LogicalExpression") {
    const left = expressionValue(e.left);
    if (left === DYNAMIC) return (e.operator !== "&&" && rendersText(e.left)) || rendersText(e.right);
    const takesLeft = e.operator === "&&" ? !left : e.operator === "||" ? Boolean(left) : left != null;
    return rendersText(takesLeft ? e.left : e.right);
  }
  if (e.type === "ConditionalExpression") return rendersText(e.consequent) || rendersText(e.alternate);
  if ((e.type === "UnaryExpression" || e.type === "BinaryExpression") && BOOLEAN_OPERATORS.has(e.operator)) return false;
  const value = expressionValue(e);
  return value != null && typeof value !== "boolean" && !(typeof value === "string" && value.trim() === "");
}

const hasContent = (element) => element.children.some(rendersText);

// A Label component may take its text from a prop, so with one it needs none inside.
const isNamingLabel = (opening) => {
  if (isNative(opening)) return elementName(opening) === "label" && hasContent(opening.parent);
  return /Label$/.test(elementName(opening).split(".").pop()) && (opening.attributes.length > 0 || hasContent(opening.parent));
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
        if (hasContent(opening.parent) || (isLabelable(opening) && closestElement(opening.parent, isNamingLabel))) return;
        unnamed.push(opening);
      },
      "Program:exit"() {
        for (const opening of unnamed) {
          // A <label htmlFor> anywhere in the file with the same id names it.
          if (isLabelable(opening) && hasAttrValue(opening, "id") && labelFors.has(valueKey(getAttr(opening, "id"), sourceCode))) continue;
          context.report({ node: opening, messageId: "noName" });
        }
      },
    };
  },
};
