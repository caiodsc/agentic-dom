const { elementName, getAttr, attrValue, isOn, findVariable, walk, DYNAMIC } = require("./jsx.js");
const { BUTTON_INPUT_TYPES } = require("./elements.js");

const CONTROL_TAGS = new Set(["input", "textarea", "select"]);
const CONTROL_ROLES = new Set([
  "combobox", "textbox", "searchbox", "listbox", "checkbox", "radio", "switch", "spinbutton", "slider",
]);
const WRAPPERS = new Set(["forwardRef", "memo"]);

function isComponentName(name) {
  return typeof name === "string" && /^[A-Z]/.test(name);
}

function componentNameOf(fn) {
  if (fn.type === "FunctionDeclaration") return isComponentName(fn.id?.name) ? fn.id.name : null;
  let node = fn;
  let parent = fn.parent;
  while (parent?.type === "CallExpression") {
    const callee = parent.callee;
    const calleeName = callee.type === "MemberExpression" ? callee.property.name : callee.name;
    if (!WRAPPERS.has(calleeName)) return null;
    node = parent;
    parent = parent.parent;
  }
  if (parent?.type === "VariableDeclarator" && parent.init === node && parent.id.type === "Identifier") {
    return isComponentName(parent.id.name) ? parent.id.name : null;
  }
  return null;
}

function patternBinding(pattern, propNames) {
  const locals = new Map();
  let node = null;
  for (const prop of pattern.properties) {
    if (prop.type !== "Property" || (prop.computed && prop.key.type !== "Literal")) continue;
    const key = prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
    if (!propNames.includes(key)) continue;
    let value = prop.value;
    if (value.type === "AssignmentPattern") value = value.left;
    if (value.type !== "Identifier") continue;
    locals.set(value.name, { key, id: value });
    node ??= prop;
  }
  return node ? { kind: "local", locals, node } : null;
}

function propBinding(fn, propNames) {
  const param = fn.params[0];
  if (param?.type === "ObjectPattern") return patternBinding(param, propNames);
  if (param?.type !== "Identifier") return null;
  for (const stmt of fn.body.type === "BlockStatement" ? fn.body.body : []) {
    if (stmt.type !== "VariableDeclaration") continue;
    for (const d of stmt.declarations) {
      if (d.id.type !== "ObjectPattern" || d.init?.type !== "Identifier" || d.init.name !== param.name) continue;
      const local = patternBinding(d.id, propNames);
      if (local) return local;
    }
  }
  return { kind: "props", name: param.name, node: param, propNames };
}

// The prop the expression reads, or null. A callback parameter with the same name is not the prop.
function refersToProp(expr, binding, sourceCode) {
  const isBoundTo = (id, declared) => findVariable(sourceCode.getScope(id), id.name)?.defs[0]?.name === declared;
  let found = null;
  walk(expr, sourceCode.visitorKeys, (node, parent) => {
    if (found) return false;
    if (binding.kind === "local" && node.type === "Identifier" && binding.locals.has(node.name)) {
      const isMemberProp = parent?.type === "MemberExpression" && parent.property === node && !parent.computed;
      const isKey = parent?.type === "Property" && parent.key === node && !parent.computed;
      const local = binding.locals.get(node.name);
      if (!isMemberProp && !isKey && isBoundTo(node, local.id)) found = local.key;
    }
    if (
      binding.kind === "props" &&
      node.type === "MemberExpression" &&
      !node.computed &&
      node.object.type === "Identifier" &&
      node.object.name === binding.name &&
      binding.propNames.includes(node.property.name) &&
      isBoundTo(node.object, binding.node)
    ) {
      found = node.property.name;
    }
    return undefined;
  });
  return found;
}

function inputType(opening) {
  if (elementName(opening) !== "input") return null;
  const type = attrValue(getAttr(opening, "type"));
  return typeof type === "string" ? type.toLowerCase() : null;
}

function isControl(opening) {
  const name = elementName(opening);
  const role = attrValue(getAttr(opening, "role"));
  if (typeof role === "string" && CONTROL_ROLES.has(role)) return true;
  if (!CONTROL_TAGS.has(name)) return false;
  const type = inputType(opening);
  return type !== "hidden" && !BUTTON_INPUT_TYPES.has(type);
}

const SHOWN_AGAIN = /:(block|inline|flex|grid|table|contents|flow-root|list-item|inline-[a-z]+|table-[a-z-]+)$/;

// Left out of the accessibility tree. The `hidden` class is Tailwind's display:none,
// unless a variant like `md:block` shows the element again.
function hiddenSelf(opening) {
  // A hidden known only at runtime is shown at some point, so the control is still checked.
  const hidden = attrValue(getAttr(opening, "hidden"));
  if (hidden !== DYNAMIC && isOn(hidden)) return true;
  if (attrValue(getAttr(opening, "aria-hidden")) === true || attrValue(getAttr(opening, "aria-hidden")) === "true") return true;
  const cls = attrValue(getAttr(opening, "className"));
  const classes = typeof cls === "string" ? cls.split(/\s+/) : [];
  return classes.includes("hidden") && !classes.some((c) => SHOWN_AGAIN.test(c));
}

function containsJsx(expr, visitorKeys) {
  let found = false;
  walk(expr, visitorKeys, (node) => {
    if (found) return false;
    if (node.type === "JSXElement" || node.type === "JSXFragment") found = true;
    return undefined;
  });
  return found;
}

// Returns the first truthy test(opening) among the enclosing elements, not the element.
// Callers pass only nodes inside a component, so the walk always reaches a function.
function closestElement(node, test) {
  for (let n = node.parent; !n.type.includes("Function"); n = n.parent) {
    if (n.type === "JSXElement") {
      const hit = test(n.openingElement);
      if (hit) return hit;
    }
  }
  return null;
}

function isHidden(opening) {
  return Boolean(closestElement(opening, hiddenSelf));
}

module.exports = { isComponentName, componentNameOf, propBinding, refersToProp, inputType, isControl, containsJsx, closestElement, hiddenSelf, isHidden };
