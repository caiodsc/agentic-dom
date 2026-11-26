const { getAttr, hasSpread, attrValue, hasAttrValue, staticText } = require("../jsx.js");
const { resolveKind } = require("../elements.js");

const words = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require a button or link's aria-label to contain the text it shows",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/label-in-name.md",
    },
    schema: [],
    messages: {
      missingText:
        "This {{kind}} shows \"{{text}}\" but its aria-label is \"{{label}}\". An agent that reads \"{{text}}\" on the screen and looks for it by name finds no match. Put the visible text in the aria-label, e.g. aria-label=\"{{text}} ...\".",
    },
  },

  create(context) {
    const { sourceCode } = context;
    return {
      JSXOpeningElement(opening) {
        const kind = resolveKind(opening, context);
        if (kind !== "button" && kind !== "link") return;
        if (hasSpread(opening) || hasAttrValue(opening, "aria-labelledby")) return;
        const label = attrValue(getAttr(opening, "aria-label"));
        if (typeof label !== "string" || !label.trim()) return;
        const text = staticText(opening.parent, sourceCode.visitorKeys, () => null);
        if (!text || !words(text)) return;
        if (words(label).includes(words(text))) return;
        context.report({ node: opening, messageId: "missingText", data: { kind, text, label } });
      },
    };
  },
};
