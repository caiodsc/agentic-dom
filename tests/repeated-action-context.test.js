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
    { name: "icon from a const outside the loop", code: `const icon = <TrashIcon />; rows.map(r => <button>{icon}</button>)` },
    { name: "icon picked by a condition", code: `rows.map(r => <button>{busy ? <Spinner /> : <TrashIcon />}</button>)` },
    { name: "const set to null", code: `const empty = null; rows.map(r => <button>{empty}</button>)` },
    { name: "icon in a let that nothing changes", code: `rows.map(r => { let icon = <TrashIcon />; return <button>{icon}</button>; })` },
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
    { name: "let changed per row", code: `rows.map(r => { let label = "Edit"; if (r.locked) label = "View"; return <button aria-label={label}>x</button>; })` },
    { name: "default value from the row", code: `function List({ rows, ...props }) { return rows.map(r => { const { label = r.name } = props; return <button aria-label={label}>Edit</button>; }); }` },
    { name: "array filled from the row", code: `rows.map(r => { const parts = []; parts.push(r.name); return <button aria-label={parts.join(" ")}>Edit</button>; })` },
    { name: "object property set from the row", code: `rows.map(r => { const name = {}; name.value = r.name; return <button aria-label={name.value}>Edit</button>; })` },
    { name: "object set from the row through a copy", code: `rows.map(r => { const name = {}; const copy = name; copy.value = r.name; return <button aria-label={name.value}>Edit</button>; })` },
    { name: "object set from the row through another object", code: `rows.map(r => { const name = {}; const copy = { name }; copy.name.value = r.name; return <button aria-label={name.value}>Edit</button>; })` },
    { name: "object set from the row through an array", code: `rows.map(r => { const name = {}; const list = [name]; list[0].value = r.name; return <button aria-label={name.value}>Edit</button>; })` },
    { name: "function in the loop that reads the row", code: `rows.map(r => { function label() { return \`Edit \${r.name}\`; } return <button aria-label={label()}>Edit</button>; })` },
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
      name: "const in the loop destructured from outside the row",
      code: `function List({ rows, ...props }) { return rows.map(r => { const { label } = props; return <button aria-label={label}>Edit</button>; }); }`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${label}" } }],
    },
    {
      name: "let in the loop never reassigned",
      code: `rows.map(r => { let label = t("edit"); return <button aria-label={label}>Edit</button>; })`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${label}" } }],
    },
    {
      name: "object with a second name that nothing changes",
      code: `rows.map(r => { const label = { value: "Edit" }; const copy = label; return <button aria-label={label.value}>Edit</button>; })`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${label.value}" } }],
    },
    {
      name: "two names that point at each other",
      code: `rows.map(r => { var a = b; var b = a; return <button aria-label={a.value}>Edit</button>; })`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${a.value}" } }],
    },
    {
      name: "element written inside braces",
      code: `rows.map(r => <button>{<span>Edit</span>}</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "function in the loop that reads no row value",
      code: `rows.map(r => { function label() { return t("edit"); } return <button aria-label={label()}>Edit</button>; })`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${label()}" } }],
    },
    {
      name: "text in the loop passed to a function",
      code: `rows.map(r => { let label = "Edit"; log(label); return <button aria-label={label}>Edit</button>; })`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${label}" } }],
    },
    {
      name: "element as the aria-label value",
      code: `rows.map(r => <button aria-label=<b>Edit</b>>Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${<b>Edit</b>}" } }],
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
      code: `rows.flatMap(r => [<a href={r.url}>Open</a>])`,
      errors: [{ messageId: "sameName", data: { kind: "link", text: "Open" } }],
    },
  ],
});
