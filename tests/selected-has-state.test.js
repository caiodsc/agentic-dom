import { ruleTester } from "./setup.js";
import rule from "../lib/rules/selected-has-state.js";

const wrap = (button, hook = 'const [tab, setTab] = useState("all");') =>
  `function Tabs({ tabs }) { ${hook} return <div>{tabs.map((t) => ${button})}</div>; }`;
const err = (test = "tab === t.id") => [{ messageId: "noState", data: { test } }];
const roleErr = (role, attr) => [{ messageId: "noRoleState", data: { role, attr, test: "tab === t.id" } }];

ruleTester.run("selected-has-state", rule, {
  valid: [
    wrap(`<button aria-pressed={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`),
    wrap(`<button aria-current={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`),
    { name: "role tab with aria-selected", code: wrap(`<button role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`) },
    { name: "role radio with aria-checked", code: wrap(`<button role="radio" aria-checked={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`) },
    { name: "spread may carry aria-pressed", code: wrap(`<button {...props} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`) },
    { name: "style that reads no state", code: wrap(`<button className={t.id === "all" ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`) },
    { name: "style reads a state the handler does not set", code: wrap(`<button className={tab === t.id ? "on" : ""} onClick={() => setOther(t.id)}>{t.name}</button>`, 'const [tab, setTab] = useState("all"); const [other, setOther] = useState("");') },
    { name: "boolean state with no comparison", code: wrap(`<button className={saving ? "opacity-50" : ""} onClick={() => setSaving(true)}>Save</button>`, "const [saving, setSaving] = useState(false);") },
    { name: "comparison with !==", code: wrap(`<button className={tab !== t.id ? "dim" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`) },
    { name: "comparison outside the style", code: wrap(`<button data-on={tab === t.id} onClick={() => setTab(t.id)}>{t.name}</button>`) },
    { name: "className as text", code: wrap(`<button className="tab" onClick={() => setTab(t.id)}>{t.name}</button>`) },
    { name: "state from a custom hook", code: wrap(`<button className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`, 'const [tab, setTab] = useTabs();') },
    { name: "setter from props", code: `function Tabs({ tab, setTab }) { return <button className={tab === "a" ? "on" : ""} onClick={() => setTab("a")}>A</button>; }` },
    { name: "handler is a function declaration", code: wrap(`<button className={tab === t.id ? "on" : ""} onClick={pick}>{t.name}</button>`, 'const [tab, setTab] = useState("all"); function pick() { setTab("a"); }') },
    { name: "method call in the handler", code: wrap(`<button className={tab === t.id ? "on" : ""} onClick={() => tabs.pick(t.id)}>{t.name}</button>`) },
    { name: "button with no onClick", code: wrap(`<button className={tab === t.id ? "on" : ""}>{t.name}</button>`) },
    { name: "not a button", code: wrap(`<div className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</div>`) },
  ],
  invalid: [
    { code: wrap(`<button className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`), errors: err() },
    { code: wrap(`<Button className={cn("tab", tab === t.id && "on")} onClick={() => setTab(t.id)}>{t.name}</Button>`), errors: err() },
    { name: "comparison in a template", code: wrap('<button className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>{t.name}</button>'), errors: err() },
    { name: "comparison in style", code: wrap(`<button style={{ fontWeight: tab === t.id ? 700 : 400 }} onClick={() => setTab(t.id)}>{t.name}</button>`), errors: err() },
    { name: "value on the left", code: wrap(`<button className={t.id == tab ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`), errors: err("t.id == tab") },
    { name: "member of the state", code: wrap(`<button className={draft.kind === "fixed" ? "on" : ""} onClick={() => setDraft((d) => ({ ...d, kind: "fixed" }))}>Fixed</button>`, "const [draft, setDraft] = useState({});"), errors: err('draft.kind === "fixed"') },
    { name: "const handler", code: wrap(`<button className={tab === t.id ? "on" : ""} onClick={pick}>{t.name}</button>`, 'const [tab, setTab] = useState("all"); const pick = () => setTab("a");'), errors: err() },
    { name: "aria-pressed React drops", code: wrap(`<button aria-pressed={undefined} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`), errors: err() },
    { name: "aria-selected without a role", code: wrap(`<button aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`), errors: err() },
    { name: "role tab without aria-selected", code: wrap(`<button role="tab" className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`), errors: roleErr("tab", "aria-selected") },
    { name: "role tab with aria-pressed", code: wrap(`<button role="tab" aria-pressed={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.name}</button>`), errors: roleErr("tab", "aria-selected") },
  ],
});
