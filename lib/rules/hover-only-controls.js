const { elementName, getAttr, findVariable, walk } = require("../jsx.js");
const { resolveKind } = require("../elements.js");
const { isControl } = require("../components.js");

const HOVER_EVENTS = new Set(["onMouseEnter", "onMouseOver", "onPointerEnter", "onPointerOver"]);
// A Tailwind class that applies only while the mouse is over the element, a group or a peer.
const ON_HOVER = /(^|:)(group-|peer-)?hover(\/[\w-]+)?:/;
const SHOWN = /:(visible|block|inline|flex|grid|table|contents|flow-root|list-item|inline-[a-z]+|table-[a-z-]+)$/;

const classesOf = (node) => {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value.split(/\s+/);
  if (node?.type === "TemplateLiteral") return node.quasis.flatMap((q) => q.value.cooked?.split(/\s+/) ?? []);
  return [];
};

const keyClasses = (p) => (p.key.type === "Identifier" && !p.computed ? [p.key.name] : classesOf(p.key));

// The classes a value adds whatever its conditions hold, so a branch of a ternary or && never counts.
const alwaysClasses = (node) => {
  switch (node?.type) {
    case "TemplateLiteral":
      return [...classesOf(node), ...node.expressions.flatMap(alwaysClasses)];
    case "CallExpression":
      return [...alwaysClasses(node.callee.object), ...node.arguments.flatMap(alwaysClasses)];
    case "ObjectExpression":
      return node.properties.filter((p) => p.value?.type === "Literal" && Boolean(p.value.value)).flatMap(keyClasses);
    case "ArrayExpression":
      return node.elements.flatMap(alwaysClasses);
    case "ConditionalExpression": {
      const no = alwaysClasses(node.alternate);
      return alwaysClasses(node.consequent).filter((c) => no.includes(c));
    }
    case "BinaryExpression":
      return [...alwaysClasses(node.left), ...alwaysClasses(node.right)];
    default:
      return classesOf(node);
  }
};

// The class in a list that takes the element out of the page: `invisible` unless a non-hover variant like
// `md:visible` shows it again, or Tailwind's `hidden` unless one like `md:flex` does.
const hideClass = (classes) => {
  const shownElsewhere = classes.filter((c) => SHOWN.test(c) && !ON_HOVER.test(c));
  if (classes.includes("invisible")) return shownElsewhere.some((c) => c.endsWith(":visible")) ? null : "invisible";
  return classes.includes("hidden") && !shownElsewhere.some((c) => !c.endsWith(":visible")) ? "hidden" : null;
};

const hiddenUntilHover = (classes) => {
  const hidden = hideClass(classes);
  const shownOnHover = classes.some((c) => ON_HOVER.test(c) && SHOWN.test(c) && (hidden === "invisible" ? c.endsWith(":visible") : !c.endsWith(":visible")));
  return hidden && shownOnHover ? hidden : null;
};

// The state a test reads, and whether the test is true when that state is.
const readState = (test) => {
  if (test.type === "Identifier") return { id: test, same: true };
  if (test.type === "UnaryExpression" && test.operator === "!" && test.argument.type === "Identifier") return { id: test.argument, same: false };
  return null;
};

// readState for a class object value, also read through `state ? false : true`.
const valueState = (value) => {
  if (value.type !== "ConditionalExpression") return readState(value);
  const state = readState(value.test);
  const [yes, no] = [value.consequent, value.alternate].map((n) => (n.type === "Literal" ? Boolean(n.value) : null));
  return state && yes !== null && no !== null && yes !== no ? { id: state.id, same: yes === state.same } : null;
};

const operands = (node, operator) => (node.type === "LogicalExpression" && node.operator === operator ? [...operands(node.left, operator), ...operands(node.right, operator)] : [node]);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require controls to stay in the page while they wait for the mouse",
      url: "https://github.com/caiodsc/agentic-dom/blob/main/docs/rules/hover-only-controls.md",
    },
    schema: [],
    messages: {
      hiddenUntilHover:
        "This <{{element}}> holds controls but is left out of the page with `{{hidden}}` until the mouse is over it. An agent reads the page without moving the mouse, so it never finds them, and the keyboard cannot reach them. Hide it with opacity-0 instead and show it on hover and on focus-within, which keeps the controls in the page.",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const visitorKeys = sourceCode.visitorKeys;
    const setters = new Map();
    const hoverSetters = new Set();
    const waiting = [];

    const isControlTag = (node) => {
      if (node.type !== "JSXOpeningElement") return false;
      const kind = resolveKind(node, context);
      return kind ? kind !== "none" : isControl(node);
    };

    const holdsControls = (element) => {
      let found = false;
      walk(element, visitorKeys, (node) => {
        if (found) return false;
        if (isControlTag(node)) found = true;
        return undefined;
      });
      return found;
    };

    // The states each control inside needs to be true to render, one list per control, like [[open]] for `{open && <button />}`.
    const controlsIn = (element, needed = []) => {
      const gates = [];
      walk(element, visitorKeys, (node) => {
        // `a && b && <button />` renders the button only when every operand is true, and `a || b || <button />` only when every one is false, so any of them can be the hover state.
        if (node.type === "LogicalExpression" && node.operator !== "??" && holdsControls(node.right)) {
          const wanted = node.operator === "&&";
          const ids = operands(node.left, node.operator).map(readState).filter((s) => s?.same === wanted).map((s) => s.id);
          gates.push(...controlsIn(node.right, [...needed, ...ids]));
          return false;
        }
        const state = node.type === "ConditionalExpression" && readState(node.test);
        if (state) {
          const [onState, offState] = state.same ? [node.consequent, node.alternate] : [node.alternate, node.consequent];
          gates.push(...controlsIn(onState, [...needed, state.id]), ...controlsIn(offState, needed));
          return false;
        }
        if (!isControlTag(node)) return undefined;
        gates.push(needed);
        return false;
      });
      return gates;
    };

    // Each condition in a class value that adds a hiding class, as the state it reads and whether it hides when that state is true.
    function conditions(node, out = []) {
      switch (node?.type) {
        case "ConditionalExpression": {
          const state = readState(node.test);
          const [yes, no] = [hideClass(alwaysClasses(node.consequent)), hideClass(alwaysClasses(node.alternate))];
          if (state && Boolean(yes) !== Boolean(no)) out.push({ ...state, hidden: yes ?? no, whenTrue: Boolean(yes) === state.same });
          break;
        }
        case "LogicalExpression": {
          const state = node.operator === "&&" && readState(node.left);
          const hidden = hideClass(alwaysClasses(node.right));
          if (state && hidden) out.push({ ...state, hidden, whenTrue: state.same });
          break;
        }
        case "ObjectExpression":
          for (const p of node.properties) {
            const state = p.type === "Property" && valueState(p.value);
            const hidden = p.type === "Property" && hideClass(keyClasses(p));
            if (state && hidden) out.push({ ...state, hidden, whenTrue: state.same });
          }
          break;
        case "TemplateLiteral":
          node.expressions.forEach((e) => conditions(e, out));
          break;
        case "BinaryExpression":
          conditions(node.left, out);
          conditions(node.right, out);
          break;
        case "CallExpression":
          conditions(node.callee.object, out);
          node.arguments.forEach((a) => conditions(a, out));
          break;
        case "ArrayExpression":
          node.elements.forEach((e) => conditions(e, out));
          break;
        default:
      }
      return out;
    }

    function collectHoverSetters(handler, seen = new Set()) {
      let body = handler;
      if (handler.type === "Identifier") {
        const def = findVariable(sourceCode.getScope(handler), handler.name)?.defs[0];
        body = def?.type === "FunctionName" ? def.node : def?.type === "Variable" ? def.node.init : null;
      }
      if (!body || seen.has(body)) return;
      seen.add(body);
      walk(body, visitorKeys, (node) => {
        if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return undefined;
        const [arg] = node.arguments;
        const updater = arg?.type === "ArrowFunctionExpression" || arg?.type === "FunctionExpression";
        const value = !updater ? arg : arg.body.type === "BlockStatement" ? arg.body.body.find((s) => s.type === "ReturnStatement")?.argument : arg.body;
        if (value?.type === "Literal" && value.value === true) hoverSetters.add(findVariable(sourceCode.getScope(node), node.callee.name));
        else collectHoverSetters(node.callee, seen);
        return undefined;
      });
    }

    return {
      VariableDeclarator(node) {
        const callee = node.init?.type === "CallExpression" ? node.init.callee : null;
        const def = callee?.type === "Identifier" && findVariable(sourceCode.getScope(node), callee.name)?.defs[0];
        const aliased = def?.type === "ImportBinding" && def.node.imported?.name === "useState";
        const isUseState = callee && (callee.name === "useState" || callee.property?.name === "useState" || aliased);
        const [state, setter] = node.id.type === "ArrayPattern" ? node.id.elements : [];
        if (!isUseState || state?.type !== "Identifier" || setter?.type !== "Identifier") return;
        const [stateVar, setterVar] = [state, setter].map((id) => sourceCode.getDeclaredVariables(node).find((v) => v.name === id.name));
        setters.set(setterVar, stateVar);
      },
      JSXAttribute(attr) {
        if (HOVER_EVENTS.has(attr.name.name) && attr.value?.type === "JSXExpressionContainer") {
          collectHoverSetters(attr.value.expression);
        }
      },
      JSXOpeningElement(opening) {
        const value = getAttr(opening, "className")?.value;
        const controls = value && controlsIn(opening.parent);
        if (!controls?.length) return;
        const literals = value.type === "Literal" ? [value] : [];
        if (value.type === "JSXExpressionContainer") {
          walk(value.expression, visitorKeys, (node) => {
            if (node.type === "Literal" || node.type === "TemplateLiteral") literals.push(node);
            return undefined;
          });
        }
        const hidden = literals.map((l) => hiddenUntilHover(classesOf(l))).find(Boolean) ?? hiddenUntilHover(alwaysClasses(value.expression));
        if (hidden) return waiting.push({ opening, controls, hidden });
        if (value.type === "JSXExpressionContainer") {
          for (const c of conditions(value.expression)) if (!c.whenTrue) waiting.push({ opening, controls, ...c });
        }
      },
      "Program:exit"() {
        const hoverStates = new Set([...hoverSetters].map((s) => setters.get(s)).filter(Boolean));
        const isHoverState = (id) => hoverStates.has(findVariable(sourceCode.getScope(id), id.name));
        const reported = new Set();
        for (const { opening, controls, id, hidden } of waiting) {
          if ((id && !isHoverState(id)) || reported.has(opening)) continue;
          // Controls that render only once the mouse is over them are not hidden by the class.
          if (controls.every((ids) => ids.some(isHoverState))) continue;
          reported.add(opening);
          context.report({ node: opening, messageId: "hiddenUntilHover", data: { element: elementName(opening), hidden } });
        }
      },
    };
  },
};
