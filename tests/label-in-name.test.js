import { ruleTester } from "./setup.js";
import rule from "../lib/rules/label-in-name.js";

ruleTester.run("label-in-name", rule, {
  valid: [
    `<button aria-label="Delete invoice">Delete</button>`,
    `<a href="/orders" aria-label="View all orders">View all</a>`,
    { name: "case and punctuation differ", code: `<button aria-label="save, then close">Save!</button>` },
    { name: "line break inside the text", code: `<button aria-label="Cancel now">Cancel<br />now</button>` },
    { name: "hyphen only on one side", code: `<button aria-label="Email the team">E-mail</button>` },
    { name: "no aria-label", code: `<button>Save</button>` },
    { name: "aria-labelledby names it", code: `<button aria-labelledby="t" aria-label="Close">Cancel</button>` },
    { name: "spread may replace the aria-label", code: `<button {...props} aria-label="Close">Cancel</button>` },
    { name: "aria-label from an expression", code: `<button aria-label={label}>Cancel</button>` },
    { name: "empty aria-label", code: `<button aria-label=" ">Cancel</button>` },
    { name: "text from an expression", code: `<button aria-label="Close">{text}</button>` },
    { name: "component with a runtime prop", code: `<button aria-label="Close"><Trans id={key} /></button>` },
    { name: "icon only", code: `<button aria-label="Close"><CloseIcon /></button>` },
    { name: "symbol only", code: `<button aria-label="Close">×</button>` },
    { name: "text inside a longer word", code: `<button aria-label="Learn about order statuses">Status</button>` },
    { name: "input button with a value", code: `<input type="button" value="Cancel" aria-label="Close" />` },
    { name: "not a button or link", code: `<div aria-label="Summary">Totals</div>` },
  ],
  invalid: [
    {
      code: `<button aria-label="Close">Cancel</button>`,
      errors: [{ messageId: "missingText", data: { kind: "button", text: "Cancel", label: "Close" } }],
    },
    {
      name: "link",
      code: `<a href="/new" aria-label="Create block">Block off time</a>`,
      errors: [{ messageId: "missingText", data: { kind: "link", text: "Block off time", label: "Create block" } }],
    },
    {
      name: "icon beside the text",
      code: `<Button aria-label="Upload file"><UploadIcon /> Drop a PDF here</Button>`,
      errors: [{ messageId: "missingText", data: { kind: "button", text: "Drop a PDF here", label: "Upload file" } }],
    },
    {
      name: "aria-label with only a symbol",
      code: `<button aria-label="×">Cancel</button>`,
      errors: [{ messageId: "missingText", data: { kind: "button", text: "Cancel", label: "×" } }],
    },
    {
      name: "aria-labelledby React drops",
      code: `<button aria-labelledby={undefined} aria-label="Close">Cancel</button>`,
      errors: [{ messageId: "missingText" }],
    },
  ],
});
