import { elementName, getAttr, hasSpread, attrValue, hasAttrValue, isOn, findVariable, constInit, expressionValue, staticText, DYNAMIC } from "../jsx.js";
import { resolveKind } from "../elements.js";

const REASON_ATTRS = ["aria-describedby", "aria-description", "title"];
const DEFAULT_TRANSIENT = "loading|pending|submitting|saving|fetching|busy|processing|mutating|uploading";
const NEGATED_NAME = /^(not|no)[A-Z_]|Not?[A-Z]/;

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

// A title is the button's name when nothing else names it, and a title that repeats the name explains nothing.
// A title known only at runtime counts, since it can say why.
function titleIsReason(opening, visitorKeys) {
  if (!hasAttrValue(opening, "title")) return false;
  const title = attrValue(getAttr(opening, "title"));
  if (typeof title !== "string" || hasAttrValue(opening, "aria-labelledby")) return true;
  const ariaLabel = attrValue(getAttr(opening, "aria-label"));
  const value = attrValue(getAttr(opening, "value"));
  const name = hasAttrValue(opening, "aria-label")
    ? ariaLabel
    : elementName(opening) === "input"
      ? (typeof value === "string" ? value : null)
      : staticText(opening.parent, visitorKeys);
  if (typeof name !== "string") return true;
  const normalize = (text) => text.replace(/\s+/g, " ").trim().toLowerCase();
  return normalize(name) !== "" && normalize(title) !== normalize(name);
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require disabled buttons to say why they are disabled",
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
        if (resolveKind(opening, context) !== "button") return;
        const disabled = getAttr(opening, "disabled");
        const value = attrValue(disabled);
        if (!isOn(value)) return;
        if (hasSpread(opening)) return;
        const hasReason = (name) =>
          name === "title" ? titleIsReason(opening, context.sourceCode.visitorKeys) : hasAttrValue(opening, name);
        if (reasonAttrs.some(hasReason)) return;
        if (value === DYNAMIC) {
          const expr = disabled.value.expression;
          const scope = context.sourceCode.getScope(opening);
          // A pass-through: the caller decides, so the caller explains.
          if (isPassThrough(expr, scope)) return;
          if (isTransient(expr)) return;
          const init = expr.type === "Identifier" ? constInit(scope, expr.name) : null;
          if (init && (!isOn(expressionValue(init)) || isTransient(init))) return;
        }
        context.report({ node: disabled, messageId: "noReason" });
      },
    };
  },
};
