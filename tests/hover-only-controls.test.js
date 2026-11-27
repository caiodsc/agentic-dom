import { ruleTester } from "./setup.js";
import rule from "../lib/rules/hover-only-controls.js";

const reported = (element = "span", hidden = "invisible") => [{ messageId: "hiddenUntilHover", data: { element, hidden } }];

const withHover = (jsx) => `
function Row({ onEdit }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <li onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      ${jsx}
    </li>
  );
}`;

ruleTester.run("hover-only-controls", rule, {
  valid: [
    { name: "opacity keeps the controls in the page", code: `<span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100"><button>Edit</button></span>` },
    { name: "opacity from hover state", code: withHover(`<span className={isHovered ? "opacity-100" : "opacity-0"}><button>Edit</button></span>`) },
    { name: "hidden on hover, not until hover", code: withHover(`<span className={isHovered ? "invisible" : ""}><button>Edit</button></span>`) },
    { name: "nothing to click inside", code: `<span className="invisible group-hover:visible"><EditIcon /></span>` },
    { name: "nothing to click inside, from hover state", code: withHover(`<span className={isHovered ? "" : "hidden"}>Saved</span>`) },
    { name: "hidden on small screens only", code: `<div className="hidden md:flex"><button>Edit</button></div>` },
    { name: "invisible with no hover class", code: `<div className="invisible"><button>Edit</button></div>` },
    { name: "shown on focus, not hover", code: `<div className="invisible group-focus-within:visible"><button>Edit</button></div>` },
    { name: "hover state that a mouse-enter handler does not set", code: `
function Row() {
  const [isOpen, setIsOpen] = useState(false);
  return <span className={isOpen ? "" : "invisible"}><button onClick={() => setIsOpen(true)}>Edit</button></span>;
}` },
    { name: "mouse-enter that highlights a row", code: `
function Menu({ items }) {
  const [active, setActive] = useState(-1);
  return items.map((item, i) => (
    <button key={item.id} onMouseEnter={() => setActive(i)} className={active === i ? "bg-gray-100" : ""}>{item.label}</button>
  ));
}` },
    { name: "condition that is not a plain state", code: withHover(`<span className={isHovered && ready ? "" : "invisible"}><button>Edit</button></span>`) },
    { name: "class from a variable", code: withHover(`<span className={classes}><button>Edit</button></span>`) },
    { name: "hidden is not undone by visible", code: `<div className="hidden group-hover:visible"><button>Edit</button></div>` },
    { name: "hide and hover classes on different sides of a condition", code: `<div className={cn(ready ? "invisible" : "group-hover:visible")}><button>Edit</button></div>` },
    { name: "tagged template with an invalid escape", code: "<div className={css`\\unicode invisible`}><button>Edit</button></div>" },
    {
      name: "same state names in a component that shows on click",
      code: `
function Row() {
  const [isHovered, setIsHovered] = useState(false);
  return <li onMouseEnter={() => setIsHovered(true)}><span className={isHovered ? "" : "invisible"}>Saved</span></li>;
}
function Menu() {
  const [isHovered, setIsHovered] = useState(false);
  return <li onClick={() => setIsHovered(true)}><span className={isHovered ? "" : "invisible"}><button>Edit</button></span></li>;
}`,
    },
    { name: "controls rendered only on hover inside a hover-hidden element", code: withHover(`<span className="invisible group-hover:visible">{isHovered && <button>Edit</button>}</span>`) },
    { name: "controls rendered only on hover inside a hover-state element", code: withHover(`<span className={isHovered ? "" : "invisible"}>{isHovered ? <button>Edit</button> : null}</span>`) },
    { name: "controls in the branch taken when a negated hover state is false", code: withHover(`<span className="invisible group-hover:visible">{!isHovered ? null : <button>Edit</button>}</span>`) },
    { name: "controls rendered only on hover behind ||", code: withHover(`<span className="invisible group-hover:visible">{!isHovered || <button>Edit</button>}</span>`) },
    { name: "invisible on small screens only", code: `<div className="invisible md:visible group-hover:visible"><button>Edit</button></div>` },
    { name: "object key turned off", code: `<span className={clsx({ invisible: false, "group-hover:visible": true })}><button>Edit</button></span>` },
    { name: "hidden on both sides of the hover state", code: withHover(`<span className={isHovered ? "invisible" : "hidden"}><button>Edit</button></span>`) },
    { name: "condition on a property", code: withHover(`<span className={!row.isHovered ? "invisible" : ""}><button>Edit</button></span>`) },
    { name: "computed class key", code: withHover(`<span className={clsx({ [hideClass]: !isHovered, ...rest })}><button>Edit</button></span>`) },
    { name: "hover state set to false only", code: `
function Row() {
  const [shown, setShown] = useState(true);
  return <li onMouseEnter={() => setShown(false)} onMouseLeave={reset}><span className={shown ? "" : "invisible"}><button>Edit</button></span></li>;
}` },
    { name: "handler from a prop", code: `
function Row({ onEnter }) {
  const [hover] = useState(false);
  const label = "Edit", { size } = props;
  return <li onMouseEnter={onEnter} onPointerOver="x"><span className={hover ? "" : "invisible"}><button>{label}</button></span></li>;
}` },
  ],
  invalid: [
    { code: `<span className="invisible group-hover:visible"><button onClick={onEdit}>Edit</button></span>`, errors: reported() },
    { name: "hidden until the group is hovered", code: `<div className="hidden group-hover:flex"><a href="/edit">Edit</a></div>`, errors: reported("div", "hidden") },
    { name: "named group", code: `<div className="invisible group-hover/row:visible"><button>Edit</button></div>`, errors: reported("div") },
    { name: "the control itself", code: `<button className="invisible hover:visible">Edit</button>`, errors: reported("button") },
    { name: "inside a class helper", code: `<span className={cn("invisible group-hover:visible", className)}><button>Edit</button></span>`, errors: reported() },
    { name: "hover state in a ternary", code: withHover(`<span className={isHovered ? "visible" : "invisible"}><button onClick={onEdit}>Edit</button></span>`), errors: reported() },
    { name: "hover state in a template literal", code: withHover(`<span className={\`ml-2 \${isHovered ? "visible" : "invisible"}\`}><button>Edit</button></span>`), errors: reported() },
    { name: "negated hover state", code: withHover(`<span className={!isHovered ? "hidden" : "flex"}><button>Edit</button></span>`), errors: reported("span", "hidden") },
    { name: "hover state with &&", code: withHover(`<span className={cn("ml-2", !isHovered && "invisible")}><button>Edit</button></span>`), errors: reported() },
    { name: "hover state in a class object", code: withHover(`<span className={clsx({ invisible: !isHovered })}><button>Edit</button></span>`), errors: reported() },
    { name: "hide and hover classes in separate helper arguments", code: `<span className={cn("invisible", "group-hover:visible")}><button>Edit</button></span>`, errors: reported() },
    { name: "hide and hover classes joined by concatenation", code: `<span className={"invisible " + "group-hover:visible"}><button>Edit</button></span>`, errors: reported() },
    { name: "hide and hover classes in a template and its expression", code: `<span className={\`invisible \${"group-hover:visible"}\`}><button>Edit</button></span>`, errors: reported() },
    { name: "hide and hover classes in a class array", code: `<span className={cn(["invisible", "group-hover:visible"])}><button>Edit</button></span>`, errors: reported() },
    { name: "hover state with a class helper in the hiding branch", code: withHover(`<span className={isHovered ? "" : cn("invisible", size)}><button>Edit</button></span>`), errors: reported() },
    { name: "hover state with && and a class helper", code: withHover(`<span className={!isHovered && cn("invisible")}><button>Edit</button></span>`), errors: reported() },
    { name: "hide and hover classes as object keys always on", code: `<span className={clsx({ invisible: 1, "group-hover:visible": true, ...rest })}><button>Edit</button></span>`, errors: reported() },
    { name: "hide and hover classes joined from an array", code: `<span className={["invisible", "group-hover:visible"].filter(Boolean).join(" ")}><button>Edit</button></span>`, errors: reported() },
    { name: "hover state in an array joined into the class", code: withHover(`<span className={[isHovered ? "visible" : "invisible"].join(" ")}><button>Edit</button></span>`), errors: reported() },
    { name: "controls gated by another state", code: withHover(`<span className="invisible group-hover:visible">{canEdit && <button>Edit</button>}</span>`), errors: reported() },
    { name: "controls rendered only while the mouse is away", code: withHover(`<span className="invisible group-hover:visible">{!isHovered && <button>Edit</button>}</span>`), errors: reported() },
    { name: "controls in the branch taken while the mouse is away", code: withHover(`<span className={isHovered ? "" : "invisible"}>{isHovered ? null : <button>Edit</button>}</span>`), errors: reported() },
    { name: "controls in the branch taken on a negated hover state", code: withHover(`<span className="invisible group-hover:visible">{!isHovered ? <button>Edit</button> : null}</span>`), errors: reported() },
    { name: "controls rendered while the mouse is away behind ||", code: withHover(`<span className="invisible group-hover:visible">{isHovered || <button>Edit</button>}</span>`), errors: reported() },
    { name: "controls behind ?? count as always rendered", code: withHover(`<span className="invisible group-hover:visible">{isHovered ?? <button>Edit</button>}</span>`), errors: reported() },
    { name: "a control that always renders beside one rendered on hover", code: withHover(`<span className={isHovered ? "" : "invisible"}>{isHovered && <button>Edit</button>}<button>Delete</button></span>`), errors: reported() },
    {
      name: "hover state set through a helper the handler calls",
      code: `
function Row() {
  const [hover, setHover] = useState(false);
  function show() { track(); setHover(true); }
  function track() { track(); }
  return <li onMouseEnter={() => show()}><span className={hover ? "" : "invisible"}><button>Edit</button></span></li>;
}`,
      errors: reported(),
    },
    {
      name: "hover state set after a delay",
      code: `
function Row() {
  const [hover, setHover] = useState(false);
  return <li onMouseEnter={() => { setTimeout(() => setHover(true), 300); }}><span className={hover ? "" : "invisible"}><button>Edit</button></span></li>;
}`,
      errors: reported(),
    },
    { name: "class in a template literal", code: `<span className={\`invisible group-hover:visible \${size}\`}><button>Edit</button></span>`, errors: reported() },
    { name: "hover state in a string concatenation", code: withHover(`<span className={"ml-2 " + (isHovered ? "" : "invisible")}><button>Edit</button></span>`), errors: reported() },
    { name: "hover state in a class array", code: withHover(`<span className={cn(["ml-2", !isHovered && "invisible"])}><button>Edit</button></span>`), errors: reported() },
    { name: "two hiding conditions on one element", code: withHover(`<div className={cn(!isHovered && "invisible", { hidden: !isHovered })}><button>Edit</button><button>Delete</button></div>`), errors: reported("div") },
    { name: "a form field inside", code: withHover(`<span className={isHovered ? "" : "invisible"}><input type="checkbox" /></span>`), errors: reported() },
    {
      name: "handler declared apart",
      code: `
function Row() {
  const [hover, setHover] = React.useState(false);
  const show = () => setHover(true);
  return <li onPointerEnter={show}><span className={hover ? "" : "invisible"}><EditButton /></span></li>;
}`,
      errors: reported(),
    },
    {
      name: "handler declared as a function",
      code: `
function Row() {
  const [hover, setHover] = useState(false);
  function show() { setHover(true); }
  return <li onMouseOver={show}><span className={hover ? "" : "invisible"}><button>Edit</button></span></li>;
}`,
      errors: reported(),
    },
  ],
});
