const { elementName, getAttr, hasSpread, attrValue, hasAttrValue, isOn, findVariable, walk, DYNAMIC } = require("../jsx.js");
const { BUTTON_INPUT_TYPES } = require("../elements.js");

const CONTROL_TAGS = new Set(["input", "textarea", "select"]);
const LABELABLE_TAGS = new Set(["button", "input", "meter", "output", "progress", "select", "textarea"]);
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

function labelBinding(fn, propNames) {
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

// The label prop the expression reads, or null. A callback parameter with the same name is not the prop.
function refersToLabel(expr, binding, sourceCode) {
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

// A literal aria-label, or a template with text of its own, names the control, so the label prop needs no link.
function hasStaticName(opening) {
  if (!hasAttrValue(opening, "aria-label")) return false;
  const attr = getAttr(opening, "aria-label");
  const expr = attr.value?.expression;
  return typeof attrValue(attr) === "string" || (expr?.type === "TemplateLiteral" && expr.quasis.some((q) => q.value.cooked.trim()));
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
function closestElement(node, test) {
  for (let n = node.parent; n; n = n.parent) {
    if (n.type === "JSXElement") {
      const hit = test(n.openingElement);
      if (hit) return hit;
    }
    if (n.type.includes("Function")) return null;
  }
  return null;
}

function isHidden(opening) {
  return Boolean(closestElement(opening, hiddenSelf));
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
      const binding = name ? labelBinding(fn, propNames) : null;
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

    // React drops an id or htmlFor set to a boolean, which is what a bare attribute is.
    const idKey = (attr) => {
      const value = attrValue(attr);
      if (typeof value === "boolean") return undefined;
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
          hasStaticName(opening) ||
          Boolean(ariaLabel?.value && refersToLabel(ariaLabel.value, state.binding, context.sourceCode)) ||
          insideLabelElement(opening);
        state.controls.push({ tag: name, linked, opening });
      },

      JSXExpressionContainer(node) {
        const state = current();
        if (!state) return;
        const p = node.parent?.type;
        if (p !== "JSXElement" && p !== "JSXFragment") return;
        const prop = refersToLabel(node.expression, state.binding, context.sourceCode);
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
