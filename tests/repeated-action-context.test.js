import { ruleTester } from "./setup.js";
import rule from "../lib/rules/repeated-action-context.js";

ruleTester.run("repeated-action-context", rule, {
  valid: [
    `rows.map(r => <button aria-label={"Edit " + r.name}>Edit</button>)`,
    "rows.map(r => <Button aria-label={`Edit ${r.name}`}>Edit</Button>)",
    `rows.map(r => <button>{r.name}</button>)`,
    `rows.map(r => <button aria-labelledby={r.id}>Edit</button>)`,
    { name: "button outside a list", code: `<button>Edit</button>` },
    { name: "icon-only button with no text", code: `rows.map(r => <button><TrashIcon /></button>)` },
    { name: "icon from a const outside the loop", code: `const icon = <TrashIcon />; rows.map(r => <button>{icon}</button>)` },
    { name: "icon picked by a condition", code: `rows.map(r => <button>{busy ? <Spinner /> : <TrashIcon />}</button>)` },
    { name: "const set to null", code: `const empty = null; rows.map(r => <button>{empty}</button>)` },
    { name: "icon in a let that nothing changes", code: `rows.map(r => { let icon = <TrashIcon />; return <button>{icon}</button>; })` },
    { name: "icon beside a const set to empty text", code: `const empty = " "; rows.map(r => <button><TrashIcon />{empty}</button>)` },
    { name: "aria-label from a let set to null on an icon button", code: `rows.map(r => { let label = null; return <button aria-label={label}><TrashIcon /></button>; })` },
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
    { name: "object set from the row through an assigned copy", code: `rows.map(r => { const name = {}; let copy; copy = name; copy.value = r.name; return <button aria-label={name.value}>Edit</button>; })` },
    { name: "object set from the row through an array", code: `rows.map(r => { const name = {}; const list = [name]; list[0].value = r.name; return <button aria-label={name.value}>Edit</button>; })` },
    { name: "function in the loop that reads the row", code: `rows.map(r => { function label() { return \`Edit \${r.name}\`; } return <button aria-label={label()}>Edit</button>; })` },
    { name: "row parameter named undefined in the text", code: `rows.map(undefined => <button onClick={() => edit(undefined)}>{undefined}Edit</button>)` },
    { name: "icon-only button with a variable set to undefined", code: `const empty = undefined; rows.map(r => <button onClick={() => del(r)}>{empty}<TrashIcon /></button>)` },
    {
      name: "object passed to a function outside the name",
      code: `rows.map(r => { const label = { value: "Edit" }; fill(label, r); return <button aria-label={label.value}>Edit</button>; })`,
    },
    {
      name: "object copied to an undeclared name",
      code: `rows.map(r => { const label = { value: "Edit" }; copy = label; return <button aria-label={label.value}>Edit</button>; })`,
    },
    {
      name: "element that holds itself",
      code: `rows.map(r => { const icon = <i>{icon}</i>; return <button onClick={() => edit(r)}>{icon}Edit</button>; })`,
    },
  ],
  invalid: [
    {
      name: "null and booleans in the text render nothing",
      code: `rows.map(r => <button onClick={() => edit(r)}>{null}{false}Edit{true}</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
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
      name: "empty aria-labelledby",
      code: `rows.map(r => <button aria-labelledby="">Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "same label id on every row",
      code: `rows.map(r => <button aria-labelledby="actions-label">Edit</button>)`,
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
      name: "aria-labelledby from a fixed const",
      code: `const LABEL_ID = "actions-label"; rows.map(r => <button aria-labelledby={LABEL_ID}>Edit</button>)`,
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
      name: "aria-labelledby with one id for the whole list",
      code: `const labelId = useId(); rows.map(r => <button aria-labelledby={labelId}>Edit</button>)`,
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
      name: "object with a second name set by assignment that nothing changes",
      code: `rows.map(r => { const label = { value: "Edit" }; let copy; copy = label; return <button aria-label={label.value}>Edit</button>; })`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${label.value}" } }],
    },
    {
      name: "text from a const outside the loop",
      code: `const EDIT = "Edit"; rows.map(r => <button>{EDIT}</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "two names that point at each other",
      code: `rows.map(r => { var a = b; var b = a; return <button aria-label={a.value}>Edit</button>; })`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "${a.value}" } }],
    },
    {
      name: "icon from a const beside the text",
      code: `const icon = <TrashIcon />; rows.map(r => <button>{icon}Delete</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Delete" } }],
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
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
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
      name: "aria-describedby from the row",
      code: `rows.map(r => <button aria-describedby={r.id}>Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      code: `rows.flatMap(r => [<a href={r.url}>Open</a>])`,
      errors: [{ messageId: "sameName", data: { kind: "link", text: "Open" } }],
    },
    {
      name: "map called with a quoted name",
      code: `rows["map"](r => <button onClick={() => edit(r)}>Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "element with a link role",
      code: `rows.map(r => <span role="link" onClick={() => open(r)}>Open</span>)`,
      errors: [{ messageId: "sameName", data: { kind: "link", text: "Open" } }],
    },
    {
      name: "aria-label template with no values",
      code: "rows.map(r => <button aria-label={`Edit`} onClick={() => edit(r)}>Edit</button>)",
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "namespaced element in the row",
      code: `rows.map(r => <li><svg:title>Row</svg:title><button onClick={() => edit(r)}>Edit</button></li>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
    {
      name: "component in the name with an element as a prop",
      code: `rows.map(r => <button onClick={() => edit(r)}><Icon title=<b>x</b> />Edit</button>)`,
      errors: [{ messageId: "sameName", data: { kind: "button", text: "Edit" } }],
    },
  ],
});
