const { getAttr, findVariable, constInit } = require("./jsx.js");

const ROLE_STATE = new Map([["switch", "aria-checked"], ["checkbox", "aria-checked"], ["radio", "aria-checked"], ["tab", "aria-selected"], ["option", "aria-selected"]]);

const isFunction = (node) => node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";

function isUseState(init) {
  const callee = init?.type === "CallExpression" ? init.callee : null;
  if (callee?.type === "Identifier") return callee.name === "useState";
  return callee?.type === "MemberExpression" && callee.object.name === "React" && callee.property.name === "useState";
}

// The state variable of `const [x, setX] = useState()` when `id` reads setX, or null.
function stateOf(id, scope) {
  const def = findVariable(scope, id.name)?.defs[0];
  if (def?.type !== "Variable" || def.node.id.type !== "ArrayPattern" || !isUseState(def.node.init)) return null;
  const [state, setter] = def.node.id.elements;
  if (setter !== def.name || state?.type !== "Identifier") return null;
  return findVariable(scope, state.name);
}

function handlerOf(opening, sourceCode) {
  const expr = getAttr(opening, "onClick")?.value?.expression;
  if (isFunction(expr)) return expr;
  if (expr?.type !== "Identifier") return null;
  const init = constInit(sourceCode.getScope(expr), expr.name);
  return isFunction(init) ? init : null;
}

module.exports = { ROLE_STATE, isFunction, stateOf, handlerOf };
