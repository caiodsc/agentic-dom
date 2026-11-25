const { elementName, getAttr, hasSpread, attrValue, hasAttrValue } = require("../jsx.js");
const { isComponentName, componentNameOf, propBinding, refersToProp, inputType, isControl, containsJsx, closestElement, isHidden } = require("../components.js");

const LABELABLE_TAGS = new Set(["button", "input", "meter", "output", "progress", "select", "textarea"]);

// Whether the label prop reaches the aria-label value. A label read only by the condition that picks the value names nothing.
function labelInValue(expr, binding, sourceCode) {
  if (expr.type === "JSXExpressionContainer") return labelInValue(expr.expression, binding, sourceCode);
  if (expr.type === "ConditionalExpression") return labelInValue(expr.consequent, binding, sourceCode) || labelInValue(expr.alternate, binding, sourceCode);
  if (expr.type === "LogicalExpression" && expr.operator === "&&") return labelInValue(expr.right, binding, sourceCode);
  return Boolean(refersToProp(expr, binding, sourceCode));
}

function enclosingControl(node, controls) {
  return closestElement(node, (opening) => controls.find((c) => c.opening === opening));
}

// htmlFor names a control only on a label: a <label>, or a component that may render one.
function isLabelFor(opening) {
  const name = elementName(opening);
  return (name === "label" || name.includes(".") || isComponentName(name)) && hasAttrValue(opening, "htmlFor");
}

function enclosingLabelFor(node) {
  return closestElement(node, (opening) => (isLabelFor(opening) ? opening : null));
}

// A label names only a labelable element, or a component or custom element that may be one, and not one that is hidden.
function canTakeLabel(opening) {
  const name = elementName(opening);
  return (LABELABLE_TAGS.has(name) || isComponentName(name) || name.includes("-")) && !isHidden(opening) && inputType(opening) !== "hidden";
}

function insideLabelElement(opening) {
  return Boolean(closestElement(opening.parent, (o) => elementName(o) === "label"));
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require components that show a label prop to link it to the control they render",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/label-prop-linked.md",
    },
    schema: [
      {
        type: "object",
        properties: { labelProps: { type: "array", items: { type: "string" }, uniqueItems: true } },
        additionalProperties: false,
      },
    ],
    messages: {
      notLinked:
        "`{{component}}` shows `{{prop}}` as text but never links it to its <{{control}}>. Agents see a field with no name. Render the text in <label htmlFor={id}> with the same id on the control, or point aria-labelledby at it.",
    },
  },

  create(context) {
    const propNames = context.options[0]?.labelProps ?? ["label"];
    const visitorKeys = context.sourceCode.visitorKeys;
    const stack = [];

    function enter(fn) {
      const name = componentNameOf(fn);
      const binding = name ? propBinding(fn, propNames) : null;
      stack.push(
        binding
          ? { fn, name, binding, controls: [], ids: [], labelFors: [], rendered: null }
          : { fn, passthrough: !name },
      );
    }

    function current() {
      // A nested component owns its controls, so the outer component stops there.
      for (let i = stack.length - 1; i >= 0; i--) if (!stack[i].passthrough) return stack[i].binding ? stack[i] : null;
      return null;
    }

    function exit(fn) {
      const state = stack.pop();
      if (!state || state.fn !== fn || !state.binding) return;
      for (const { prop, target } of state.labelFors) {
        // An element with a spread may get its id from it.
        const targets = state.ids.filter((t) => t.key === target || t.key === null);
        const control = state.controls.find((c) => canTakeLabel(c.opening) && targets.some((t) => t.opening === c.opening));
        if (control) control.linked = true;
        else if (prop && !targets.some((t) => canTakeLabel(t.opening))) state.rendered = prop;
      }
      const unlinked = state.controls.find((c) => !c.linked);
      if (!state.rendered || !unlinked) return;
      context.report({
        node: state.binding.node,
        messageId: "notLinked",
        data: {
          component: state.name,
          prop: state.rendered,
          control: unlinked.tag,
        },
      });
    }

    const idKey = (attr) => {
      const value = attrValue(attr);
      return typeof value === "string" ? value : context.sourceCode.getText(attr.value.expression ?? attr.value);
    };

    return {
      FunctionDeclaration: enter,
      FunctionExpression: enter,
      ArrowFunctionExpression: enter,
      "FunctionDeclaration:exit": exit,
      "FunctionExpression:exit": exit,
      "ArrowFunctionExpression:exit": exit,

      JSXOpeningElement(opening) {
        const state = current();
        if (!state) return;
        const id = hasAttrValue(opening, "id") ? idKey(getAttr(opening, "id")) : undefined;
        if (id !== undefined) state.ids.push({ key: id, opening });
        else if (hasSpread(opening)) state.ids.push({ key: null, opening });
        // Any label can name a control, not only one that shows the label prop.
        if (isLabelFor(opening)) state.labelFors.push({ prop: null, target: idKey(getAttr(opening, "htmlFor")) });
        const name = elementName(opening);
        if (!isControl(opening) || isHidden(opening)) return;
        const ariaLabel = getAttr(opening, "aria-label");
        const linked =
          hasAttrValue(opening, "aria-labelledby") ||
          Boolean(ariaLabel?.value && labelInValue(ariaLabel.value, state.binding, context.sourceCode)) ||
          insideLabelElement(opening);
        state.controls.push({ tag: name, linked, opening });
      },

      JSXExpressionContainer(node) {
        const state = current();
        if (!state) return;
        const p = node.parent?.type;
        if (p !== "JSXElement" && p !== "JSXFragment") return;
        const prop = refersToProp(node.expression, state.binding, context.sourceCode);
        if (!prop) return;
        // A condition around JSX: the label text inside it is checked on its own.
        if (containsJsx(node.expression, visitorKeys)) return;
        const control = enclosingControl(node, state.controls);
        if (control) control.linked = true;
        else {
          const labelFor = enclosingLabelFor(node);
          if (labelFor) state.labelFors.push({ prop, target: idKey(getAttr(labelFor, "htmlFor")) });
          else state.rendered = prop;
        }
      },
    };
  },
};
