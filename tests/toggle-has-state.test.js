import { ruleTester } from "./setup.js";
import rule from "../lib/rules/toggle-has-state.js";

const wrap = (button, gate = "{open && <Menu />}", hook = "const [open, setOpen] = useState(false);") =>
  `function Nav() { ${hook} return <div>${button}${gate}</div>; }`;
const err = (shown = "open") => [{ messageId: "noState", data: { shown } }];
const roleErr = (role, attr) => [{ messageId: "noRoleState", data: { role, attr, shown: "open" } }];

ruleTester.run("toggle-has-state", rule, {
  valid: [
    wrap(`<button aria-expanded={open} onClick={() => setOpen(!open)}>Menu</button>`),
    wrap(`<button aria-pressed={open} onClick={() => setOpen(!open)}>Bold</button>`),
    { name: "spread may carry aria-expanded", code: wrap(`<button {...props} onClick={() => setOpen(!open)}>Menu</button>`) },
    { name: "role switch with aria-checked", code: wrap(`<button role="switch" aria-checked={open} onClick={() => setOpen(!open)}>Menu</button>`) },
    { name: "role tab with aria-selected", code: wrap(`<button role="tab" aria-selected={open} onClick={() => setOpen(!open)}>Menu</button>`) },
    { name: "state that gates no JSX", code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`, `{open ? "Open" : "Closed"}`) },
    { name: "state read by ||", code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`, `{open || <Menu />}`) },
    { name: "state on the right of &&", code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`, `{ready && open}`) },
    { name: "setter called with a value", code: wrap(`<button onClick={() => setOpen(true)}>Menu</button>`) },
    { name: "setter flips another value", code: wrap(`<button onClick={() => setOpen(!other)}>Menu</button>`) },
    { name: "updater with a block body", code: wrap(`<button onClick={() => setOpen((v) => { return !v; })}>Menu</button>`) },
    { name: "updater that flips another name", code: wrap(`<button onClick={() => setOpen((v) => !w)}>Menu</button>`) },
    { name: "updater with two params", code: wrap(`<button onClick={() => setOpen((v, w) => !v)}>Menu</button>`) },
    { name: "updater with a destructured param", code: wrap(`<button onClick={() => setOpen(({ v }) => !v)}>Menu</button>`) },
    { name: "state from a custom hook", code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`, undefined, "const [open, setOpen] = useToggle();") },
    { name: "state from a call that is not useState", code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`, undefined, "const [open, setOpen] = Foo.useState();") },
    { name: "state from a variable", code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`, undefined, "const [open, setOpen] = pair;") },
    { name: "setter in the first slot", code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`, undefined, "const [setOpen, open] = useState(false);") },
    { name: "state destructured from an object", code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`, undefined, "const [{ open }, setOpen] = useState({});") },
    { name: "setter from props", code: `function Nav({ open, setOpen }) { return <div><button onClick={() => setOpen(!open)}>Menu</button>{open && <Menu />}</div>; }` },
    { name: "handler is a function declaration", code: wrap(`<button onClick={toggle}>Menu</button>`, undefined, "const [open, setOpen] = useState(false); function toggle() { setOpen(!open); }") },
    { name: "handler from useCallback", code: wrap(`<button onClick={toggle}>Menu</button>`, undefined, "const [open, setOpen] = useState(false); const toggle = useCallback(() => setOpen(!open), []);") },
    { name: "onClick from a member", code: wrap(`<button onClick={handlers.toggle}>Menu</button>`) },
    { name: "method call in the handler", code: wrap(`<button onClick={() => menu.toggle()}>Menu</button>`) },
    { name: "not a button", code: wrap(`<div onClick={() => setOpen(!open)}>Menu</div>`) },
    { name: "button with no onClick", code: wrap(`<button>Menu</button>`) },
  ],
  invalid: [
    { code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`), errors: err() },
    { code: wrap(`<Button onClick={() => setOpen((v) => !v)}>Menu</Button>`), errors: err() },
    { name: "React.useState", code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`, undefined, "const [open, setOpen] = React.useState(false);"), errors: err() },
    { name: "const handler", code: wrap(`<button onClick={toggle}>Menu</button>`, undefined, "const [open, setOpen] = useState(false); const toggle = () => setOpen(!open);"), errors: err() },
    { name: "function expression handler", code: wrap(`<button onClick={function () { setOpen(!open); }}>Menu</button>`), errors: err() },
    { name: "gate by a negated state", code: wrap(`<button onClick={() => setCollapsed(!collapsed)}>Menu</button>`, "{!collapsed && <Menu />}", "const [collapsed, setCollapsed] = useState(false);"), errors: err("!collapsed") },
    { name: "ternary with JSX first", code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`, "{open ? <Menu /> : null}"), errors: err() },
    { name: "ternary with JSX second", code: wrap(`<button onClick={() => setOpen(!open)}>Menu</button>`, "{open ? null : <><Menu /></>}"), errors: err("!open") },
    { name: "text that reads the state", code: wrap(`<button onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"}</button>`), errors: err() },
    { name: "aria-label that reads the state", code: wrap(`<button aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}><MenuIcon /></button>`), errors: err() },
    { name: "title that reads the state", code: wrap(`<button title={open ? "Close" : "Open"} onClick={() => setOpen(!open)}><MenuIcon /></button>`), errors: err() },
    { name: "icon that reads the state", code: wrap(`<button onClick={() => setOpen(!open)}><ChevronIcon direction={open ? "up" : "down"} /></button>`), errors: err() },
    { name: "class name that reads the state", code: wrap(`<button className={open ? "on" : ""} onClick={() => setOpen(!open)}>Menu</button>`), errors: err() },
    { name: "fixed aria-expanded", code: wrap(`<button aria-expanded={false} onClick={() => setOpen(!open)}>Menu</button>`), errors: err() },
    { name: "fixed aria-pressed", code: wrap(`<button aria-pressed="true" onClick={() => setOpen(!open)}>Bold</button>`), errors: err() },
    { name: "second setter shows the content", code: wrap(`<button onClick={() => { setSeen(!seen); setOpen(!open); }}>Menu</button>`, undefined, "const [seen, setSeen] = useState(false); const [open, setOpen] = useState(false);"), errors: err() },
    { name: "aria-expanded React drops", code: wrap(`<button aria-expanded={undefined} onClick={() => setOpen(!open)}>Menu</button>`), errors: err() },
    { name: "role switch without aria-checked", code: wrap(`<button role="switch" onClick={() => setOpen(!open)}>Menu</button>`), errors: roleErr("switch", "aria-checked") },
    { name: "role checkbox with aria-pressed", code: wrap(`<button role="checkbox" aria-pressed={open} onClick={() => setOpen(!open)}>Menu</button>`), errors: roleErr("checkbox", "aria-checked") },
    { name: "role tab without aria-selected", code: wrap(`<button role="tab" onClick={() => setOpen(!open)}>Menu</button>`), errors: roleErr("tab", "aria-selected") },
    { name: "role that does not carry state", code: wrap(`<button role="button" onClick={() => setOpen(!open)}>Menu</button>`), errors: err() },
  ],
});
