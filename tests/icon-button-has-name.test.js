import { ruleTester } from "./setup.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Linter } from "eslint";
import rule from "../lib/rules/icon-button-has-name.js";

test("empty iconPattern is rejected", () => {
  const config = { plugins: { a: { rules: { r: rule } } }, rules: { "a/r": ["error", { iconPattern: "" }] } };
  assert.throws(() => new Linter({ configType: "flat" }).verify("", config), /shorter than 1/);
});

ruleTester.run("icon-button-has-name", rule, {
  valid: [
    `<button aria-label="Close"><CloseIcon /></button>`,
    `<button aria-labelledby="close-text"><CloseIcon /></button>`,
    { name: "title on the button", code: `<button title="Close"><CloseIcon /></button>` },
    `<button><CloseIcon /> Close</button>`,
    `<Button aria-label={t("close")}><CloseIcon /></Button>`,
    { name: "spread on the button may carry a name", code: `<button {...props}><CloseIcon /></button>` },
    { name: "spread before aria-label React drops", code: `<button {...props} aria-label={undefined}><CloseIcon /></button>` },
    { name: "text from an expression", code: `<button><CloseIcon />{label}</button>` },
    { name: "text in both branches", code: `<button>{open ? "Hide" : "Show"}</button>` },
    { name: "two ternaries that may share a condition", code: `<button>{open ? <ChevronUpIcon /> : "Show"}{open ? "Hide" : null}</button>` },
    { name: "fallback that may be text", code: `<button>{icon || <CloseIcon />}</button>` },
    { name: "fragment with text in both branches", code: `<button>{open ? <><CloseIcon /> Close</> : "Open"}</button>` },
    { name: "branches that show nothing", code: `<button>{open ? null : false}</button>` },
    { name: "component name not matching iconPattern", code: `<button><Trash2 /></button>` },
    { name: "icon inside another element", code: `<button><span><CloseIcon /></span></button>` },
    { name: "fragment with text beside the icon", code: `<button><><CloseIcon /> Close</></button>` },
    { name: "icon passed as a prop", code: `<IconButton icon={<CloseIcon />} />` },
    { name: "button with no children", code: `<button onClick={close} />` },
    { name: "link with an icon only", code: `<a href="/settings"><SettingsIcon /></a>` },
    { name: "unknown component is not a button", code: `<Card><CloseIcon /></Card>` },
    { name: "lowercase element ending in Icon", code: `<button><myIcon /></button>` },
    { name: "component mapped to none", code: `<Action><CloseIcon /></Action>`, settings: { "agentic-dom": { components: { Action: { as: "none" } } } } },
    { name: "same name from another package", code: `import { Plus } from "./plus";\n<button><Plus /></button>` },
    { name: "require of an icon package", code: `const { Trash2 } = require("lucide-react");\n<button><Trash2 /></button>` },
    { name: "local name that hides an icon import", code: `import { Plus } from "lucide-react";\nconst A = ({ Plus }) => <button><Plus /></button>;` },
    { name: "custom iconPattern replaces the default", code: `<button><CloseIcon /></button>`, options: [{ iconPattern: "^Lucide" }] },
  ],
  invalid: [
    { code: `<button><CloseIcon /></button>`, errors: [{ messageId: "noName" }] },
    { code: `<Button onClick={remove}><TrashIcon size={16} /></Button>`, errors: [{ messageId: "noName" }] },
    { code: `<button><IconTrash /></button>`, errors: [{ messageId: "noName" }] },
    { name: "plain svg", code: `<button><svg viewBox="0 0 24 24"><path d="M0 0" /></svg></button>`, errors: [{ messageId: "noName" }] },
    { name: "aria-hidden icon", code: `<button><CloseIcon aria-hidden="true" /></button>`, errors: [{ messageId: "noName" }] },
    { name: "icon from a namespace", code: `<button><Icons.CloseIcon /></button>`, errors: [{ messageId: "noName" }] },
    { name: "icon from a lowercase namespace", code: `<button><icons.CloseIcon /></button>`, errors: [{ messageId: "noName" }] },
    { name: "icon inside a fragment", code: `<button><><CloseIcon /></></button>`, errors: [{ messageId: "noName" }] },
    { name: "two icons and whitespace", code: `<button>\n  <PlusIcon />\n  <ChevronIcon />\n</button>`, errors: [{ messageId: "noName" }] },
    { name: "icon in both branches", code: `<button>{open ? <ChevronUpIcon /> : <ChevronDownIcon />}</button>`, errors: [{ messageId: "noName" }] },
    { name: "icon in one branch, text in the other", code: `<button>{open ? <ChevronUpIcon /> : "Close"}</button>`, errors: [{ messageId: "noName" }] },
    { name: "text in one branch, icon fragment in the other", code: `<button><MenuIcon />{open ? "Close" : <><ChevronDownIcon /></>}</button>`, errors: [{ messageId: "noName" }] },
    { name: "ternary in an icon prop is not a second branch", code: `<button><CloseIcon size={big ? 20 : 16} />{open ? <ChevronUpIcon /> : "Close"}</button>`, errors: [{ messageId: "noName" }] },
    { name: "icon shown only when true", code: `<button>{busy && <SpinnerIcon />}</button>`, errors: [{ messageId: "noName" }] },
    { name: "icon fragments in both branches", code: `<button>{open ? <><CloseIcon /></> : <><PlusIcon /></>}</button>`, errors: [{ messageId: "noName" }] },
    { name: "icon or nothing", code: `<button>{open ? <CloseIcon /> : undefined}{busy ? "" : <PlusIcon />}</button>`, errors: [{ messageId: "noName" }] },
    { name: "empty expression beside the icon", code: `<button>{/* close */}<CloseIcon /></button>`, errors: [{ messageId: "noName" }] },
    { name: "aria-label React drops", code: `<button aria-label=""><CloseIcon /></button>`, errors: [{ messageId: "noName" }] },
    { name: "icon with its own aria-label", code: `<button><CloseIcon aria-label="Close" /></button>`, errors: [{ messageId: "noName" }] },
    { name: "icon with its own title", code: `<button><CloseIcon title="Close" /></button>`, errors: [{ messageId: "noName" }] },
    { name: "svg with a title child", code: `<button><svg><title>Close</title><path d="M0 0" /></svg></button>`, errors: [{ messageId: "noName" }] },
    { name: "spread on the icon", code: `<button><CloseIcon {...iconProps} /></button>`, errors: [{ messageId: "noName" }] },
    { name: "role button on a div", code: `<div role="button" onClick={close}><CloseIcon /></div>`, errors: [{ messageId: "noName" }] },
    {
      name: "component mapped to a button",
      code: `<Action><CloseIcon /></Action>`,
      settings: { "agentic-dom": { components: { Action: { as: "button" } } } },
      errors: [{ messageId: "noName" }],
    },
    { name: "named import from an icon package", code: `import { Trash2 } from "lucide-react";\n<button><Trash2 /></button>`, errors: [{ messageId: "noName" }] },
    { name: "renamed import from an icon package", code: `import { Trash2 as Trash } from "lucide-react";\n<button><Trash /></button>`, errors: [{ messageId: "noName" }] },
    { name: "import written after the button", code: `const A = () => <button><Trash2 /></button>;\nimport { Trash2 } from "lucide-react";`, errors: [{ messageId: "noName" }] },
    { name: "namespace import from an icon package", code: `import * as Icons from "lucide-react";\n<button><Icons.Trash /></button>`, errors: [{ messageId: "noName" }] },
    { name: "custom iconPattern", code: `<button><LucideX /></button>`, options: [{ iconPattern: "^Lucide" }], errors: [{ messageId: "noName" }] },
  ],
});
