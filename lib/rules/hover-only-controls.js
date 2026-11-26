const { elementName, getAttr, findVariable, walk } = require("../jsx.js");
const { resolveKind } = require("../elements.js");
const { isControl } = require("../components.js");

const HOVER_EVENTS = new Set(["onMouseEnter", "onMouseOver", "onPointerEnter", "onPointerOver"]);
// A Tailwind class that applies only while the mouse is over the element, a group or a peer.
const ON_HOVER = /(^|:)(group-|peer-)?hover(\/[\w-]+)?:/;
const SHOWN = /:(visible|block|inline|flex|grid|table|contents|flow-root|list-item|inline-[a-z]+|table-[a-z-]+)$/;

const classesOf = (node) => {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value.split(/\s+/);
  if (node?.type === "TemplateLiteral") return node.quasis.flatMap((q) => q.value.cooked.split(/\s+/));
  return [];
};

// The class in a list that takes the element out of the page: `invisible`, or Tailwind's `hidden` unless a
// non-hover variant like `md:flex` shows it again.
const hideClass = (classes) => {
  if (classes.includes("invisible")) return "invisible";
  const shownElsewhere = classes.some((c) => SHOWN.test(c) && !ON_HOVER.test(c));
  return classes.includes("hidden") && !shownElsewhere ? "hidden" : null;
};

// `invisible group-hover:visible` in one class string: out of the page until the mouse is over the group.
const hiddenUntilHover = (classes) => {
  const hidden = hideClass(classes);
  const shownOnHover = classes.some((c) => ON_HOVER.test(c) && SHOWN.test(c) && (hidden === "invisible" ? c.endsWith(":visible") : !c.endsWith(":visible")));
  return hidden && shownOnHover ? hidden : null;
};

// The state name a test reads, and whether the test is true when that state is.
const readState = (test) => {
  if (test.type === "Identifier") return { name: test.name, same: true };
  if (test.type === "UnaryExpression" && test.operator === "!" && test.argument.type === "Identifier") return { name: test.argument.name, same: false };
  return null;
};

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

    const holdsControls = (element) => {
      let found = false;
      walk(element, visitorKeys, (node) => {
        if (found) return false;
        if (node.type === "JSXOpeningElement" && (resolveKind(node, context) || isControl(node))) found = true;
        return undefined;
      });
      return found;
    };

    const report = (opening, hidden) => context.report({ node: opening, messageId: "hiddenUntilHover", data: { element: elementName(opening), hidden } });

    // Each condition in a class value that adds a hiding class, as the state it reads and whether it hides when that state is true.
    function conditions(node, out = []) {
      switch (node?.type) {
        case "ConditionalExpression": {
          const state = readState(node.test);
          const [yes, no] = [hideClass(classesOf(node.consequent)), hideClass(classesOf(node.alternate))];
          if (state && Boolean(yes) !== Boolean(no)) out.push({ ...state, hidden: yes ?? no, whenTrue: Boolean(yes) === state.same });
          break;
        }
        case "LogicalExpression": {
          const state = node.operator === "&&" && readState(node.left);
          const hidden = hideClass(classesOf(node.right));
          if (state && hidden) out.push({ ...state, hidden, whenTrue: state.same });
          break;
        }
        case "ObjectExpression":
          for (const p of node.properties) {
            const state = p.type === "Property" && readState(p.value);
            const hidden = p.type === "Property" && hideClass(p.key.type === "Identifier" && !p.computed ? [p.key.name] : classesOf(p.key));
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
          node.arguments.forEach((a) => conditions(a, out));
          break;
        case "ArrayExpression":
          node.elements.forEach((e) => conditions(e, out));
          break;
        default:
      }
      return out;
    }

    // Setters a mouse-enter handler calls with true, like `onMouseEnter={() => setHover(true)}`.
    function collectHoverSetters(handler, scope) {
      let body = handler;
      if (handler.type === "Identifier") {
        const def = findVariable(scope, handler.name)?.defs[0];
        body = def?.type === "FunctionName" ? def.node : def?.type === "Variable" ? def.node.init : null;
      }
      walk(body, visitorKeys, (node) => {
        const [arg] = node.type === "CallExpression" ? node.arguments : [];
        if (node.callee?.type === "Identifier" && arg?.type === "Literal" && arg.value === true) hoverSetters.add(node.callee.name);
        return undefined;
      });
    }

    return {
      VariableDeclarator(node) {
        const callee = node.init?.type === "CallExpression" ? node.init.callee : null;
        const isUseState = callee && (callee.name === "useState" || callee.property?.name === "useState");
        const [state, setter] = node.id.type === "ArrayPattern" ? node.id.elements : [];
        if (isUseState && state?.type === "Identifier" && setter?.type === "Identifier") setters.set(setter.name, state.name);
      },
      JSXAttribute(attr) {
        if (HOVER_EVENTS.has(attr.name.name) && attr.value?.type === "JSXExpressionContainer") {
          collectHoverSetters(attr.value.expression, sourceCode.getScope(attr));
        }
      },
      JSXOpeningElement(opening) {
        const value = getAttr(opening, "className")?.value;
        if (!value || !holdsControls(opening.parent)) return;
        const literals = value.type === "Literal" ? [value] : [];
        if (value.type === "JSXExpressionContainer") {
          walk(value.expression, visitorKeys, (node) => {
            if (node.type === "Literal" || node.type === "TemplateLiteral") literals.push(node);
            return undefined;
          });
        }
        const hidden = literals.map((l) => hiddenUntilHover(classesOf(l))).find(Boolean);
        if (hidden) return report(opening, hidden);
        if (value.type === "JSXExpressionContainer") {
          for (const c of conditions(value.expression)) if (!c.whenTrue) waiting.push({ opening, ...c });
        }
      },
      "Program:exit"() {
        const hoverStates = new Set([...hoverSetters].map((s) => setters.get(s)).filter(Boolean));
        const reported = new Set();
        for (const { opening, name, hidden } of waiting) {
          if (!hoverStates.has(name) || reported.has(opening)) continue;
          reported.add(opening);
          report(opening, hidden);
        }
      },
    };
  },
};
