const { elementName, getAttr, hasSpread, attrValue, hasAttrValue, valueKey } = require("../jsx.js");
const { isNativeTag, resolveKind } = require("../elements.js");
const { inputType, closestElement, isHidden, hiddenSelf, isLabelableTag, hasContent } = require("../components.js");

const NAME_ATTRS = ["aria-label", "aria-labelledby", "title"];

function isCheckbox(opening, context) {
  return attrValue(getAttr(opening, "role")) === "checkbox" || inputType(opening) === "checkbox" || resolveKind(opening, context) === "checkbox";
}

const isNative = (opening) => isNativeTag(elementName(opening));
// A <label> does not name a <div role="checkbox">, around it or through htmlFor.
const isLabelable = (opening) => !isNative(opening) || isLabelableTag(elementName(opening));

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
