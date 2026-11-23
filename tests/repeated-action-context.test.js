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
    { name: "destructured row", code: "rows.map(({ name }) => <button aria-label={`Edit ${name}`}>Edit</button>)" },
    { name: "row index", code: "rows.map((r, i) => <button aria-label={`Edit row ${i + 1}`}>Edit</button>)" },
    { name: "translated text built from the row", code: "rows.map(r => <button>{t(`edit.${r.type}`)}</button>)" },
    { name: "spread props", code: `rows.map(r => <button {...rowProps(r)}>Edit</button>)` },
    { name: "const destructured from the row", code: `rows.map(r => { const { name } = r; return <button aria-label={name}>Edit</button>; })` },
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
      name: "translated text shared by every row",
      code: `rows.map(r => <button>{t("edit")}</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: '${t("edit")}' } }],
    },
    {
      name: "aria-label from a prop",
      code: `function List({ rows, label }) { return rows.map(r => <button aria-label={label}>Edit</button>); }`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${label}" } }],
    },
    {
      name: "aria-label template with no row value",
      code: "rows.map(r => <button aria-label={`Edit ${kind}`}>Edit</button>)",
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit ${kind}" } }],
    },
    {
      name: "aria-describedby with one id for the whole list",
      code: `const helpId = useId(); rows.map(r => <button aria-describedby={helpId}>Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "const in the loop copied from outside the row",
      code: `rows.map(r => { const label = t("edit"); return <button>{label}</button>; })`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${label}" } }],
    },
    {
      name: "spread object with no name keys",
      code: `rows.map(r => <button {...{ "data-testid": r.id }}>Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "const in the loop destructured from outside the row",
      code: `function List({ rows, ...props }) { return rows.map(r => { const { label } = props; return <button aria-label={label}>Edit</button>; }); }`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${label}" } }],
    },
    {
      name: "const that refers to itself",
      code: `rows.map(r => { const label = (() => { function again() { return label; } return t("edit"); })(); return <button>{label}</button>; })`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${label}" } }],
    },
    {
      name: "parameter of a function inside the name",
      code: `rows.map(r => <button aria-label={[t("edit")].map((r) => r).join()}>Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: '${[t("edit")].map((r) => r).join()}' } }],
    },
    {
      name: "spread object with a computed key",
      code: `rows.map(r => <button {...{ ["data-testid"]: r.id }}>Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      code: `rows.flatMap(r => [<a href={r.url}>Open</a>])`,
      errors: [{ messageId: "sameName", data: { kind: "link", text: "Open" } }],
    },
  ],
});
