import { ruleTester } from "./setup.js";
import rule from "../lib/rules/label-prop-linked.js";

ruleTester.run("label-prop-linked", rule, {
  valid: [
    {
      name: "label linked with htmlFor",
      code: `const Field = ({ label, name }) => (<div><label htmlFor={name}>{label}</label><input id={name} /></div>);`,
    },
    {
      name: "label shown only when set, linked with htmlFor",
      code: `const Field = ({ label, name }) => (<div>{label && (<label htmlFor={name}>{label}</label>)}<input id={name} /></div>);`,
    },
    {
      name: "control wrapped by the label",
      code: `function Field({ label }) { return <label>{label}<input /></label>; }`,
    },
    {
      name: "aria-labelledby on the control",
      code: `const Select = ({ label, id }) => (<><span id={id}>{label}</span><div role="combobox" aria-labelledby={id} /></>);`,
    },
    {
      name: "control named by a label with text of its own, label prop shown as a hint",
      code: `const Field = ({ label }) => (<div><label htmlFor="email">Email</label><input id="email" /><small>{label}</small></div>);`,
    },
    {
      name: "aria-label built from the label prop",
      code: `const Field = ({ label }) => (<div><span>{label}</span><input aria-label={label} /></div>);`,
    },
    {
      name: "label handed to another component",
      code: `const Field = ({ label }) => <Base label={label} />;`,
    },
    {
      name: "no control rendered",
      code: `const Title = ({ label }) => <h2>{label}</h2>;`,
    },
    {
      name: "option.label is not the label prop",
      code: `const List = ({ options }) => (<div>{options.map(o => <span>{o.label}</span>)}<input /></div>);`,
    },
    {
      name: "hidden input is not a control",
      code: `const Field = ({ label }) => (<div><span>{label}</span><input type="hidden" /></div>);`,
    },
    {
      name: "htmlFor points at a button",
      code: `const Picker = ({ label, id }) => (<div><label htmlFor={id}>{label}</label><button id={id} /><div role="listbox" /></div>);`,
    },
    {
      name: "htmlFor points at a control that may get its id from a spread",
      code: `const Field = ({ label, name, inputProps }) => (<div><label htmlFor={name}>{label}</label><input {...inputProps} /></div>);`,
    },
    {
      name: "polymorphic label element with htmlFor",
      code: `const Field = ({ label, name }) => (<div><Typography as="label" htmlFor={name}>{label}</Typography><input id={name} /></div>);`,
    },
    {
      name: "label element from a namespace with htmlFor",
      code: `const Field = ({ label, name }) => (<div><motion.label htmlFor={name}>{label}</motion.label><input id={name} /></div>);`,
    },
    {
      name: "label pointing at a custom element with a control role",
      code: `const Field = ({ label, id }) => (<div><label htmlFor={id}>{label}</label><x-date-input role="textbox" id={id} /></div>);`,
    },
    {
      name: "label rendered inside the control",
      code: `function Toggle({ label, on }) { return <button role="switch" aria-checked={on}><span>{label}</span></button>; }`,
    },
    {
      name: "control with its own fixed aria-label",
      code: `const ColorPicker = ({ label }) => (<div><div>{label}</div><input aria-label="Select custom color" /></div>);`,
    },
    {
      name: "control with a fixed aria-label in braces",
      code: `const ColorPicker = ({ label }) => (<div><div>{label}</div><input aria-label={"Select custom color"} /></div>);`,
    },
    {
      name: "control with a fixed aria-label template",
      code: "const Search = ({ label, scope }) => (<div><div>{label}</div><input aria-label={`Search ${scope}`} /></div>);",
    },
    {
      name: "file input hidden by class",
      code: `const Photos = ({ label }) => (<div><h3>{label}</h3><input type="file" className="hidden" /></div>);`,
    },
    {
      name: "lowercase function is not a component",
      code: `const field = ({ label }) => (<div><span>{label}</span><input /></div>);`,
    },
    {
      name: "callback parameter named label is not the prop",
      code: `const Tags = ({ label, items }) => (<div>{items.map((label) => <span key={label}>{label}</span>)}<input /></div>);`,
    },
    {
      name: "callback parameter named props is not the component's props",
      code: `function Tags(props) { return <div>{props.items.map((props) => <span>{props.label}</span>)}<input /></div>; }`,
    },
    {
      name: "control inside a hidden wrapper",
      code: `const Field = ({ label }) => (<div hidden><span>{label}</span><input /></div>);`,
    },
    {
      name: "submit input in capitals is not a field",
      code: `const Form = ({ label }) => (<div><span>{label}</span><input type="SUBMIT" /></div>);`,
    },
    { name: "component with no name", code: `export default ({ label }) => (<div><span>{label}</span><input /></div>);` },
    { name: "label key in brackets", code: `const Field = ({ ["label"]: text }) => (<div><span>{text}</span><input /></div>);` },
    { name: "label destructured further", code: `const Field = ({ label: { text } }) => (<div><span>{text}</span><input /></div>);` },
    { name: "control hidden with aria-hidden text", code: `const Field = ({ label }) => (<div><span>{label}</span><input aria-hidden="true" /></div>);` },
    { name: "id and htmlFor set to the same element", code: `const Field = ({ label }) => (<div><label htmlFor=<b />>{label}</label><input id=<b /> /></div>);` },
  ],
  invalid: [
    {
      name: "a bare id gives the control no id",
      code: `const Field = ({ label }) => (<div><label htmlFor="field">{label}</label><input id /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
    {
      name: "a bare htmlFor points at nothing",
      code: `const Field = ({ label }) => (<div><label htmlFor>{label}</label><input id="field" /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
    {
      name: "htmlFor points at an id no element has",
      code: `const Field = ({ label }) => (<div><label htmlFor="other">{label}</label><input id="field" /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
    {
      name: "htmlFor points at a hidden input",
      code: `const Picker = ({ label, name }) => (<div><label htmlFor={name}>{label}</label><input type="hidden" id={name} /><div role="listbox" /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "Picker", prop: "label", control: "div" } }],
    },
    {
      name: "wrapper hidden only at times",
      code: `const Field = ({ label, collapsed }) => (<div hidden={collapsed}><span>{label}</span><input /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
    {
      name: "a named search box does not link the label to another control",
      code: `const Picker = ({ label }) => (<div><p>{label}</p><input aria-label="Search" /><div role="listbox" /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "Picker", prop: "label", control: "div" } }],
    },
    {
      name: "a linked branch does not cover an unlinked one",
      code: `const Field = ({ label, multiline }) => (multiline ? <textarea aria-label={label} /> : <div><span>{label}</span><input /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
    {
      name: "hidden only on small screens",
      code: `const Field = ({ label }) => (<div className="hidden md:block"><span>{label}</span><input /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
    {
      name: "nested component's named field does not link the outer field",
      code: `function Field({ label }) { const Search = () => <input aria-label="Search" />; return <div><span>{label}</span><input /><Search /></div>; }`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
    {
      name: "second configured label prop rendered",
      code: `const Field = ({ label, title }) => (<div><span>{title}</span><input /></div>);`,
      options: [{ labelProps: ["label", "title"] }],
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "title", control: "input" } }],
    },
    {
      name: "aria-labelledby set to null",
      code: `const Field = ({ label }) => (<div><span>{label}</span><input aria-labelledby={null} /></div>);`,
      errors: [{ messageId: "notLinked" }],
    },
    {
      name: "label in a div, input without a link",
      code: `const InputText = ({ label, name }) => (<div><div>{label.charAt(0).toUpperCase()}</div><input id={name} name={name} /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "InputText", prop: "label", control: "input" } }],
    },
    {
      name: "aria-label from a different prop",
      code: `function DatePicker({ label, ariaLabel }) { return <div><Typography>{label}</Typography><input type="text" aria-label={ariaLabel} /></div>; }`,
      errors: [{ messageId: "notLinked", data: { component: "DatePicker", prop: "label", control: "input" } }],
    },
    {
      name: "aria-label template with only a different prop",
      code: "function DatePicker({ label, ariaLabel }) { return <div><Typography>{label}</Typography><input type=\"text\" aria-label={`${ariaLabel}`} /></div>; }",
      errors: [{ messageId: "notLinked", data: { component: "DatePicker", prop: "label", control: "input" } }],
    },
    {
      name: "aria-label template with only spaces and a line break around a different prop",
      code: "function DatePicker({ label, ariaLabel }) { return <div><Typography>{label}</Typography><input type=\"text\" aria-label={`  ${ariaLabel}\n  `} /></div>; }",
      errors: [{ messageId: "notLinked", data: { component: "DatePicker", prop: "label", control: "input" } }],
    },
    {
      name: "label without htmlFor beside the control",
      code: `const TextArea = ({ label = "" }) => (<div><label>{label}</label><textarea /></div>);`,
      errors: [{ messageId: "notLinked" }],
    },
    {
      name: "htmlFor on a div showing the prop",
      code: `const Field = ({ label }) => (<div><div htmlFor="email">{label}</div><input id="email" /></div>);`,
      errors: [{ messageId: "notLinked" }],
    },
    {
      name: "htmlFor on an output beside an unnamed control",
      code: `const Field = ({ label }) => (<div><div>{label}</div><input id="sum" /><output htmlFor="sum" /></div>);`,
      errors: [{ messageId: "notLinked" }],
    },
    {
      name: "label showing the prop pointing at an element with a control role",
      code: `const Field = ({ label }) => (<div><label htmlFor="pick">{label}</label><div role="combobox" id="pick" /></div>);`,
      errors: [{ messageId: "notLinked" }],
    },
    {
      name: "label with text of its own pointing at an element with a control role",
      code: `const Field = ({ label }) => (<div><label htmlFor="pick">Pick</label><div role="combobox" id="pick" /><small>{label}</small></div>);`,
      errors: [{ messageId: "notLinked" }],
    },
    {
      name: "htmlFor on a label that does not show the prop",
      code: `const Field = ({ label }) => (<div><label htmlFor="other">Other</label><div>{label}</div><input /></div>);`,
      errors: [{ messageId: "notLinked" }],
    },
    {
      name: "empty aria-labelledby",
      code: `const Field = ({ label }) => (<div><span>{label}</span><input aria-labelledby="" /></div>);`,
      errors: [{ messageId: "notLinked" }],
    },
    {
      name: "label destructured from props in the body",
      code: `function Field(props) { const { label } = props; return <div><span>{label}</span><input /></div>; }`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
    {
      name: "control with hidden set to false",
      code: `const Field = ({ label }) => (<div><span>{label}</span><input hidden={false} /></div>);`,
      errors: [{ messageId: "notLinked" }],
    },
    {
      name: "props.label inside forwardRef",
      code: `const Field = React.forwardRef((props, ref) => (<div><p>{props.label}</p><select ref={ref} /></div>));`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "select" } }],
    },
    {
      name: "custom label prop from labelProps",
      code: `const Field = ({ title }) => (<div><b>{title}</b><input /></div>);`,
      options: [{ labelProps: ["title"] }],
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "title", control: "input" } }],
    },
    {
      name: "label key in quotes",
      code: `const Field = ({ "label": text }) => (<div><span>{text}</span><input /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
    {
      name: "props destructured from a call",
      code: `function Field(props) { const { id } = useField(); return (<div><span>{props.label}</span><input /></div>); }`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
    {
      name: "label used as a lookup key",
      code: `const Field = ({ label }) => (<div><span>{names[label]}</span><input /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
    {
      name: "label as a computed key in an object",
      code: `const Field = ({ label }) => (<div><span>{format({ [label]: true })}</span><input /></div>);`,
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "label", control: "input" } }],
    },
  ],
});
