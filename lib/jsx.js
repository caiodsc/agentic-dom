function elementName(opening) {
  const n = opening.name;
  if (n.type === "JSXIdentifier") return n.name;
  if (n.type === "JSXMemberExpression") {
    const parts = [];
    let cur = n;
    while (cur.type === "JSXMemberExpression") {
      parts.unshift(cur.property.name);
      cur = cur.object;
    }
    parts.unshift(cur.name);
    return parts.join(".");
  }
  return `${n.namespace.name}:${n.name.name}`;
}

function getAttr(opening, name) {
  return opening.attributes.find(
    (a) => a.type === "JSXAttribute" && a.name.type === "JSXIdentifier" && a.name.name === name,
  );
}

function hasSpread(opening) {
  return opening.attributes.some((a) => a.type === "JSXSpreadAttribute");
}

const DYNAMIC = Symbol("dynamic");

// Static value of an attribute: undefined when absent or set to undefined, true when written without a value.
function attrValue(attr) {
  if (!attr) return undefined;
  if (attr.value === null) return true;
  const v = attr.value;
  if (v.type === "Literal") return v.value;
  if (v.type === "JSXExpressionContainer") return expressionValue(v.expression);
  return DYNAMIC;
}

function expressionValue(e) {
  if (e.type === "Literal") return e.value;
  if ((e.type === "Identifier" && e.name === "undefined") || (e.type === "UnaryExpression" && e.operator === "void")) return undefined;
  if (e.type === "TemplateLiteral" && e.expressions.length === 0) return e.quasis[0].value.cooked;
  return DYNAMIC;
}

// React drops a boolean attribute, like disabled or hidden, set to a falsy value.
// A value known only at runtime counts as on, since it can be.
function isOn(value) {
  return Boolean(value);
}

// React drops an attribute set to null, and a boolean on an attribute that takes text, unless it is aria-* or data-*.
// An empty string names nothing.
function hasAttrValue(opening, name) {
  const value = attrValue(getAttr(opening, name));
  if (typeof value === "boolean") return /^(aria|data)-/.test(name);
  return value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "");
}

function findVariable(scope, name) {
  for (let s = scope; s; s = s.upper) {
    const variable = s.set.get(name);
    if (variable) return variable;
  }
  return null;
}

// Null for let, var and destructured consts, whose init is not the name's value.
function constInit(scope, name) {
  const def = findVariable(scope, name)?.defs[0];
  return def?.type === "Variable" && def.parent.kind === "const" && def.node.id.type === "Identifier" ? def.node.init : null;
}

function walk(node, visitorKeys, visit, parent = null) {
  if (!node || typeof node.type !== "string") return;
  if (visit(node, parent) === false) return;
  /* node:coverage ignore next */
  for (const key of visitorKeys[node.type] ?? []) {
    const child = node[key];
    if (Array.isArray(child)) for (const c of child) walk(c, visitorKeys, visit, node);
    else walk(child, visitorKeys, visit, node);
  }
}

// "" when the element has no text, null when part of it is known only at runtime.
// textOf(expr) gives the text of a runtime value, or null when it cannot be known.
function staticText(element, visitorKeys, textOf) {
  let text = "";
  let dynamic = false;
  for (const child of element.children) {
    walk(child, visitorKeys, (node) => {
      if (dynamic) return false;
      if (node.type === "JSXOpeningElement") {
        // A component may render a runtime prop as text.
        if (/^[A-Z]/.test(elementName(node))) {
          dynamic = node.attributes.some((a) => a.type === "JSXSpreadAttribute" || (attrValue(a) === DYNAMIC && textOf(a.value.expression ?? a.value) === null));
        }
        return false;
      }
      if (node.type === "JSXText") text += node.value;
      if (node.type === "JSXExpressionContainer" && node.expression.type !== "JSXEmptyExpression") {
        const value = expressionValue(node.expression);
        const runtime = value === DYNAMIC ? textOf(node.expression) : null;
        // React renders null, undefined and booleans as nothing. A name like undefined can be a local, so it stays unknown.
        if (typeof value === "string" || typeof value === "number") text += value;
        else if (value !== DYNAMIC && node.expression.type !== "Identifier") return false;
        else if (runtime === null) dynamic = true;
        else text += runtime;
        return false;
      }
      return undefined;
    });
  }
  return dynamic ? null : text.replace(/\s+/g, " ").trim();
}

// A component with render={<Button />} renders that element around its own children, with both elements' props.
function renderedElement(opening) {
  const value = getAttr(opening, "render")?.value;
  return value?.type === "JSXExpressionContainer" && value.expression.type === "JSXElement" ? value.expression.openingElement : null;
}

// The nearest HTML element around a button, or the function or file holding it when none sits in between. Components
// are skipped because the rule cannot see what they render, and fragments and conditions render no element.
function placeOf(element) {
  let cur = element.parent;
  while (cur.type !== "JSXElement" || /^[A-Z]|\./.test(elementName(cur.openingElement))) {
    if (/Function/.test(cur.type)) return cur;
    if (!cur.parent) return cur;
    cur = cur.parent;
  }
  return cur;
}

// The buttons, of those given, that share their place with another one, or repeat side by side from a .map callback.
function crowded(buttons) {
  const byPlace = new Map();
  for (const button of buttons) {
    const place = placeOf(button);
    byPlace.set(place, [...(byPlace.get(place) ?? []), button]);
  }
  return new Set(
    buttons.filter((button) => {
      const place = placeOf(button);
      const call = place.parent;
      const mapped = /Function/.test(place.type) && call?.type === "CallExpression" && call.arguments[0] === place && call.callee.property?.name === "map";
      return mapped || byPlace.get(place).some((other) => other !== button && !eitherOr(button, other));
    }),
  );
}

// Two elements on opposite sides of one `a ? b : c`, so the page never shows them together.
function eitherOr(a, b) {
  const above = new Set();
  for (let node = a; node; node = node.parent) above.add(node);
  let common = b;
  while (!above.has(common)) common = common.parent;
  return common.type === "ConditionalExpression";
}

// What an attribute compares by: its string when the code fixes one, otherwise the expression as written.
function valueKey(attr, sourceCode) {
  const value = attrValue(attr);
  return typeof value === "string" ? value : sourceCode.getText(attr.value.expression ?? attr.value);
}

module.exports = { elementName, renderedElement, valueKey, getAttr, hasSpread, DYNAMIC, attrValue, expressionValue, isOn, hasAttrValue, findVariable, constInit, walk, staticText, crowded };
