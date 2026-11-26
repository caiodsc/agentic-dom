const { elementName, getAttr, hasSpread, attrValue, isOn } = require("../jsx.js");

const DEFAULT_COLLAPSE_CLASSES = ["max-h-0", "h-0"];

const stringOf = (node) => {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  if (node?.type === "TemplateLiteral") return node.quasis.map((q) => q.value.cooked).join(" ");
  return null;
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require content that collapses to zero height to be inert while collapsed",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/collapsed-content-inert.md",
    },
    schema: [
      {
        type: "object",
        properties: { collapseClasses: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 } },
        additionalProperties: false,
      },
    ],
    messages: {
      notInert:
        "This <{{element}}> collapses to zero height when {{when}} but stays in the page. An agent still reads what is inside and can try to click it. Add inert={{{when}}}, which hides it from agents and the keyboard while collapsed.",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const collapseClasses = new Set(context.options[0]?.collapseClasses ?? DEFAULT_COLLAPSE_CLASSES);
    const collapses = (node) => stringOf(node)?.split(/\s+/).some((c) => collapseClasses.has(c)) ?? false;
    const negate = (test) => {
      if (test.type === "UnaryExpression" && test.operator === "!") return sourceCode.getText(test.argument);
      const text = sourceCode.getText(test);
      return test.type === "Identifier" || test.type === "MemberExpression" ? `!${text}` : `!(${text})`;
    };

    function collapseWhen(node) {
      switch (node?.type) {
        case "ConditionalExpression": {
          const [yes, no] = [collapses(node.consequent), collapses(node.alternate)];
          if (yes === no) return null;
          return yes ? sourceCode.getText(node.test) : negate(node.test);
        }
        case "LogicalExpression":
          return node.operator === "&&" && collapses(node.right) ? sourceCode.getText(node.left) : null;
        case "BinaryExpression":
          return collapseWhen(node.left) ?? collapseWhen(node.right);
        case "TemplateLiteral":
          return firstOf(node.expressions);
        case "CallExpression":
          return firstOf(node.arguments);
        case "ArrayExpression":
          return firstOf(node.elements);
        case "ObjectExpression": {
          const property = node.properties.find((p) => p.type === "Property" && !p.computed && collapses(p.key));
          return property ? sourceCode.getText(property.value) : null;
        }
        default:
          return null;
      }
    }

    function firstOf(nodes) {
      for (const node of nodes) {
        const when = collapseWhen(node);
        if (when) return when;
      }
      return null;
    }

    return {
      JSXOpeningElement(opening) {
        const element = elementName(opening);
        const empty = opening.parent.children.every((child) => child.type === "JSXText" && !child.value.trim());
        if (!/^[a-z][a-z0-9-]*$/.test(element) || empty || hasSpread(opening)) return;
        if (["inert", "hidden"].some((name) => isOn(attrValue(getAttr(opening, name))))) return;
        const value = getAttr(opening, "className")?.value;
        if (value?.type !== "JSXExpressionContainer") return;
        const when = collapseWhen(value.expression);
        if (when) context.report({ node: opening, messageId: "notInert", data: { element, when } });
      },
    };
  },
};
