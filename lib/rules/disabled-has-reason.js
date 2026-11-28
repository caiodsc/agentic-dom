const { elementName, getAttr, hasSpread, attrValue, hasAttrValue, isOn, findVariable, constInit, expressionValue, DYNAMIC } = require("../jsx.js");
const { BUTTON_INPUT_TYPES, isNativeTag, resolveKind } = require("../elements.js");

const REASON_ATTRS = ["aria-describedby"];
const DEFAULT_TRANSIENT = "loading|pending|submitting|saving|fetching|busy|processing|mutating|uploading";
const NEGATED_NAME = /^(not|no)[A-Z_]|Not?[A-Z]/;
const NOT_TYPED_INTO = new Set([...BUTTON_INPUT_TYPES, "checkbox", "radio", "hidden", "file", "range", "color"]);

function isTextField(opening) {
  const name = elementName(opening);
  if (!isNativeTag(name)) return /(Input|Textarea|TextArea)$/.test(name.split(".").pop());
  if (name === "textarea") return true;
  if (name !== "input") return false;
  const type = attrValue(getAttr(opening, "type"));
  return type === undefined || (typeof type === "string" && !NOT_TYPED_INTO.has(type.toLowerCase()));
}

// Returns null when a leaf is something other than a name.
function leafNames(expr) {
  switch (expr.type) {
    case "Identifier":
      return [expr.name];
    case "MemberExpression":
      if (!expr.computed && expr.property.type === "Identifier") return [expr.property.name];
      return expr.computed && typeof expr.property.value === "string" ? [expr.property.value] : null;
    case "ChainExpression":
      return leafNames(expr.expression);
    case "LogicalExpression": {
      const l = leafNames(expr.left);
      const r = leafNames(expr.right);
      return l && r ? [...l, ...r] : null;
    }
    default:
      return null;
  }
}

function isParameter(expr, scope) {
  return expr?.type === "Identifier" && findVariable(scope, expr.name)?.defs[0]?.type === "Parameter";
}

// A name bound to the caller's disabled prop: a parameter named disabled, or the disabled key
// destructured from the parameters or from a parameter.
function isCallerDisabled(scope, name) {
  const def = findVariable(scope, name)?.defs[0];
  if (def?.type !== "Parameter" && def?.type !== "Variable") return false;
  const id = def.name.parent.type === "AssignmentPattern" ? def.name.parent : def.name;
  const prop = id.parent;
  const isDisabledKey =
    prop.type === "Property" && prop.value === id && !prop.computed && (prop.key.name ?? prop.key.value) === "disabled";
  if (def.type === "Parameter") return isDisabledKey || (prop === def.node && name === "disabled");
  return isDisabledKey && prop.parent === def.node.id && isParameter(def.node.init, scope);
}

function isPassThrough(expr, scope) {
  if (expr.type === "Identifier") return isCallerDisabled(scope, expr.name);
  return (
    expr.type === "MemberExpression" &&
    !expr.computed &&
    expr.property.type === "Identifier" &&
    expr.property.name === "disabled" &&
    expr.object.type === "Identifier" &&
    expr.object.name === "props" &&
    isParameter(expr.object, scope)
  );
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require disabled buttons and text fields to say why they are disabled",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/disabled-has-reason.md",
    },
    schema: [
      {
        type: "object",
        properties: {
          reasonProps: { type: "array", items: { type: "string" }, uniqueItems: true },
          transientPattern: { type: "string", minLength: 1 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noReason:
        "This button can be disabled without saying why. An agent sees a dead button and cannot tell what to fix. Show the reason as text and point aria-describedby at it.",
      noFieldReason:
        "This field can be disabled without saying why. An agent sees a field it cannot type in and keeps looking for another way. Show the reason as text and point aria-describedby at it.",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const reasonAttrs = [...REASON_ATTRS, ...(options.reasonProps ?? [])];
    const transient = new RegExp(options.transientPattern ?? DEFAULT_TRANSIENT, "i");
    const isTransient = (expr) => {
      const names = leafNames(expr);
      return Boolean(names) && names.every((n) => transient.test(n) && !NEGATED_NAME.test(n));
    };

    return {
      JSXOpeningElement(opening) {
        const isButton = resolveKind(opening, context) === "button";
        if (!isButton && !isTextField(opening)) return;
        const disabled = getAttr(opening, "disabled");
        const value = attrValue(disabled);
        if (!isOn(value)) return;
        if (hasSpread(opening)) return;
        if (reasonAttrs.some((name) => hasAttrValue(opening, name))) return;
        if (value === DYNAMIC) {
          const expr = disabled.value.expression;
          const scope = context.sourceCode.getScope(opening);
          // A pass-through: the caller decides, so the caller explains.
          if (isPassThrough(expr, scope)) return;
          if (isTransient(expr)) return;
          const init = expr.type === "Identifier" ? constInit(scope, expr.name) : null;
          if (init && (!isOn(expressionValue(init)) || isTransient(init))) return;
        }
        context.report({ node: disabled, messageId: isButton ? "noReason" : "noFieldReason" });
      },
    };
  },
};
