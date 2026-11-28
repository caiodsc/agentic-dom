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

// A button a .map callback returns counts even alone, since its copies sit side by side.
function crowded(buttons, sourceCode) {
  // A button stored in a variable shows everywhere the variable is read, through any chain of such variables. A
  // variable never read or assigned again gives the button no known place, so it has no neighbors.
  const sitesOf = (node) => (node.parent.type === "VariableDeclarator" ? (readsOf(node.parent, sourceCode) ?? []).flatMap((r) => sitesOf(r.identifier)) : [node]);
  const sites = new Map(buttons.map((button) => [button, sitesOf(button)]));
  const byPlace = new Map();
  // A mapped button also stands at its .map call, beside the call's siblings.
  const callsOf = (place) => (/Function/.test(place.type) ? mapCalls(place, sourceCode) : []);
  for (const site of [...sites.values()].flat()) {
    for (const at of [site, ...callsOf(placeOf(site))]) {
      const place = placeOf(at);
      if (!byPlace.has(place)) byPlace.set(place, []);
      byPlace.get(place).push(at);
    }
  }
  return new Set(
    buttons.filter((button) =>
      sites.get(button).some((site) => {
        const place = placeOf(site);
        return callsOf(place).length > 0 || byPlace.get(place).some((other) => other !== site && !eitherOr(site, other));
      }),
    ),
  );
}

// The reads of a declarator's variable, or null when it is assigned again and a read may see another value.
function readsOf(declarator, sourceCode) {
  const references = sourceCode.getDeclaredVariables(declarator).flatMap((v) => v.references);
  return references.some((r) => r.isWrite() && !r.init) ? null : references.filter((r) => r.isRead());
}

// The .map calls that render fn, written in the call or passed by its name, or as this.<name> for a class method, or
// through a callback that returns a call to fn. A .map whose result is thrown away renders nothing.
function mapCalls(fn, sourceCode, seen = new Set()) {
  if (seen.has(fn)) return [];
  seen.add(fn);
  const mapCall = (node) =>
    node.parent?.type === "CallExpression" && node.parent.arguments[0] === node && node.parent.callee.property?.name === "map" && node.parent.parent.type !== "ExpressionStatement" ? node.parent : null;
  // A wrapper like `useCallback(fn)` still gives fn the name it is assigned to.
  const value = fn.parent?.type === "CallExpression" && fn.parent.arguments[0] === fn ? fn.parent : fn;
  const declaration = fn.type === "FunctionDeclaration" ? fn : value.parent?.type === "VariableDeclarator" ? value.parent : null;
  const name = declaration && sourceCode.getDeclaredVariables(declaration).find((v) => v.identifiers.includes(declaration.id));
  const member = /^(MethodDefinition|PropertyDefinition)$/.test(fn.parent.type) ? fn.parent : null;
  const memberReads = [];
  if (member) {
    walk(member.parent, sourceCode.visitorKeys, (node) => {
      if (node.type === "MemberExpression" && node.object.type === "ThisExpression" && sourceCode.getText(node.property) === sourceCode.getText(member.key)) memberReads.push(node);
    });
  }
  const passed = (id) => (id.parent.property?.name === "bind" ? id.parent.parent : id);
  // fn stored in another variable, bound or not, is used where that variable is read.
  const usesOf = (node) => (node.parent.type === "VariableDeclarator" ? (readsOf(node.parent, sourceCode) ?? []).flatMap((r) => usesOf(passed(r.identifier))) : [node]);
  const uses = [fn, ...(name?.references.map((r) => r.identifier) ?? []), ...memberReads].map(passed).flatMap(usesOf);
  // A call returned by a function, also as a branch of `a ? b : c` or a side of `||` or `??` or the right of `&&`,
  // renders through that function. The left of `&&` renders only when falsy, so never as an element.
  const returning = (call) => {
    let node = call;
    const yields = (parent) => parent.test !== node && !(parent.operator === "&&" && parent.left === node);
    while (/^(ConditionalExpression|LogicalExpression)$/.test(node.parent.type) && yields(node.parent)) node = node.parent;
    let holder = node.parent;
    if (holder.type === "ReturnStatement") while (!/Function/.test(holder.type)) holder = holder.parent;
    return /Function/.test(holder.type) ? holder : null;
  };
  const callers = uses.filter((use) => use.parent.type === "CallExpression" && use.parent.callee === use).map((use) => returning(use.parent));
  return [
    ...uses.map(mapCall).filter(Boolean),
    ...callers.filter(Boolean).flatMap((caller) => mapCalls(caller, sourceCode, seen)),
  ];
}

// Two elements the page never shows together: on opposite sides of one `a ? b : c` or `if`, in switch cases with a case
// that ends in a jump between them, or returned by different returns.
function eitherOr(a, b) {
  const above = new Set();
  for (let node = a; node; node = node.parent) above.add(node);
  let common = b;
  while (!above.has(common)) common = common.parent;
  const returned = (node) => {
    for (let n = node; n !== common; n = n.parent) if (n.type === "ReturnStatement") return true;
    return false;
  };
  if (common.type === "SwitchStatement") {
    const caseOf = (node) => {
      let n = node;
      while (n.parent !== common) n = n.parent;
      return common.cases.indexOf(n);
    };
    const jumps = (statement) => (statement.type === "BlockStatement" ? statement.body.slice(-1).some(jumps) : /^(Break|Return|Throw|Continue)Statement$/.test(statement.type));
    const [from, to] = [caseOf(a), caseOf(b)].sort((x, y) => x - y);
    return common.cases.slice(from, to).some((c) => c.consequent.slice(-1).some(jumps));
  }
  return /^(ConditionalExpression|IfStatement)$/.test(common.type) || (returned(a) && returned(b));
}

// What an attribute compares by: its string when the code fixes one, otherwise the expression as written.
function valueKey(attr, sourceCode) {
  const value = attrValue(attr);
  return typeof value === "string" ? value : sourceCode.getText(attr.value.expression ?? attr.value);
}

module.exports = { elementName, renderedElement, valueKey, getAttr, hasSpread, DYNAMIC, attrValue, expressionValue, isOn, hasAttrValue, findVariable, constInit, walk, staticText, crowded };
