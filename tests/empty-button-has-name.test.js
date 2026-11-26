import { ruleTester } from "./setup.js";
import rule from "../lib/rules/empty-button-has-name.js";

ruleTester.run("empty-button-has-name", rule, {
  valid: [
    `<button aria-label="Show cancelled"><span className="knob" /></button>`,
    `<button aria-labelledby="cancelled-text"><span className="knob" /></button>`,
    `<button title="Show cancelled"><span className="knob" /></button>`,
    `<button>Save</button>`,
    `<button><span>Save</span></button>`,
    `<button><span className="dot" /> Save</button>`,
    `<button><span className="dot" />{label}</button>`,
    `<button><img src="/a.png" alt="Photo 1" /></button>`,
    `<button><svg /></button>`,
    `<button><Avatar user={user} /></button>`,
    `<button />`,
    `<Button />`,
    `<a href="/a"><span className="dot" /></a>`,
    { name: "name on the inner element", code: `<button><span aria-label="Show cancelled" /></button>` },
    { name: "spread on the button", code: `<button {...props}><span className="knob" /></button>` },
    { name: "spread on the inner element", code: `<button><span {...knobProps} /></button>` },
    { name: "id a label can point at", code: `<button id="cancelled"><span className="knob" /></button>` },
    { name: "inside a label", code: `<label>Show cancelled <button><span className="knob" /></button></label>` },
  ],
  invalid: [
    { code: `<button onClick={toggle}><span className="knob" /></button>`, errors: [{ messageId: "noName" }] },
    { code: `<Button onClick={toggle}><span className="knob" /></Button>`, errors: [{ messageId: "noName" }] },
    { code: `<button><i className="fa fa-trash" /></button>`, errors: [{ messageId: "noName" }] },
    { name: "switch role", code: `<button role="switch" aria-checked={on}><span aria-hidden="true" /></button>`, errors: [{ messageId: "noName" }] },
    { name: "nested empty elements", code: `<button><div className="track"><span className="knob" /></div></button>`, errors: [{ messageId: "noName" }] },
    { name: "values React renders as nothing", code: `<button><span />{null}{false}{""}{/* knob */}</button>`, errors: [{ messageId: "noName" }] },
    { name: "fragment with empty elements", code: `<button><><span className="knob" /></></button>`, errors: [{ messageId: "noName" }] },
    { name: "inside another element", code: `<div><button><span className="knob" /></button></div>`, errors: [{ messageId: "noName" }] },
    { name: "empty name attribute", code: `<button aria-label=""><span className="knob" /></button>`, errors: [{ messageId: "noName" }] },
  ],
});
