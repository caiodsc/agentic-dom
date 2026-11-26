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
