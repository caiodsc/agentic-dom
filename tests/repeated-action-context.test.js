import { ruleTester } from "./setup.js";
import rule from "../lib/rules/repeated-action-context.js";

ruleTester.run("repeated-action-context", rule, {
  valid: [
    `rows.map(r => <button aria-label={"Edit " + r.name}>Edit</button>)`,
    "rows.map(r => <Button aria-label={`Edit ${r.name}`}>Edit</Button>)",
    `rows.map(r => <button>{r.name}</button>)`,
    `rows.map(r => <button aria-describedby={r.id}>Edit</button>)`,
    { name: "button outside a list", code: `<button>Edit</button>` },
    { name: "icon-only button with no text", code: `rows.map(r => <button><TrashIcon /></button>)` },
    { name: "callback that is not a loop", code: `useEffect(() => { render(<button>Edit</button>); })` },
    { name: "unknown component", code: `rows.map(r => <Chip>Edit</Chip>)` },
    { name: "row text rendered by a component", code: `rows.map(r => <Link href={r.url}><ItemText item={r} />Open</Link>)` },
    { name: "anchor with a null href is not a link", code: `rows.map(r => <a href={null}>Open</a>)` },
    { name: "const built from the row", code: "rows.map(r => { const label = `Edit ${r.name}`; return <button aria-label={label}>Edit</button>; })" },
  ],
  invalid: [
    {
      code: `rows.map(r => <tr><td>{r.name}</td><td><button onClick={() => edit(r)}>Edit</button></td></tr>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      code: `items.map(function (i) { return <Link href={i.url}>View details</Link>; })`,
      errors: [{ messageId: "sameName", data: { kind: "link", text: "View details" } }],
    },
    {
      name: "number literal in the text",
      code: `rows.map(r => <button>+{1}</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "+1" } }],
    },
    {
      code: `rows.map(r => <IconButton aria-label="Delete"><TrashIcon /></IconButton>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Delete" } }],
    },
    {
      name: "button built by a helper inside the loop",
      code: `rows.map(r => { const render = () => <button>Edit</button>; return render(); })`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "static text in braces",
      code: `rows.map(r => <button>{"Edit"}</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "empty aria-describedby",
      code: `rows.map(r => <button aria-describedby="">Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "same help text on every row",
      code: `rows.map(r => <button aria-describedby="actions-help">Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "icon with a fixed size beside the text",
      code: `rows.map(r => <button><TrashIcon size={14} />Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "aria-label from a fixed const",
      code: `const DELETE = "Delete"; rows.map(r => <button aria-label={DELETE}><TrashIcon /></button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Delete" } }],
    },
    {
      name: "aria-describedby from a fixed const",
      code: `const HELP_ID = "actions-help"; rows.map(r => <button aria-describedby={HELP_ID}>Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "named callback passed to map",
      code: `function renderRow(r) { return <button>Edit</button>; } rows.map(renderRow)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "named arrow passed to flatMap",
      code: `const renderRow = (r) => [<a href={r.url}>Open</a>]; rows.flatMap(renderRow)`,
      errors: [{ messageId: "sameName", data: { kind: "link", text: "Open" } }],
    },
    {
      code: `rows.flatMap(r => [<a href={r.url}>Open</a>])`,
      errors: [{ messageId: "sameName", data: { kind: "link", text: "Open" } }],
    },
  ],
});
