import { ruleTester } from "./setup.js";
import rule from "../lib/rules/error-prop-linked.js";

const err = { messageId: "notLinked" };

ruleTester.run("error-prop-linked", rule, {
  valid: [
    `function Field({ error }) { const id = useId(); return <div><input aria-describedby={id} /><p id={id}>{error}</p></div>; }`,
    `function Field({ error }) { return <div><input /></div>; }`,
    `function Field({ error }) { return <p>{error}</p>; }`,
    { name: "spread on the control may carry aria-describedby", code: `function Field({ error, ...rest }) { return <div><input {...rest} /><p>{error}</p></div>; }` },
    { name: "spread before aria-describedby React drops", code: `function Field({ error, ...rest }) { return <div><input {...rest} aria-describedby={undefined} /><p>{error}</p></div>; }` },
    { name: "one linked control is enough", code: `function Field({ error }) { return <div><input placeholder="Search" /><div role="combobox" aria-describedby="e" /><p id="e">{error}</p></div>; }` },
    { name: "error read with brackets", code: `function Field(props) { return <div><input /><p>{props["error"]}</p></div>; }` },
    { name: "error handed to another component", code: `function Field({ error }) { return <div><input /><FieldError error={error} /></div>; }` },
    { name: "boolean error that renders other text", code: `function Field({ error }) { return <div><input />{error && <p>Required</p>}</div>; }` },
    { name: "control rendered by another component", code: `function Field({ error }) { return <div><Input /><p>{error}</p></div>; }` },
    { name: "hidden control", code: `function Field({ error }) { return <div><input type="hidden" /><p>{error}</p></div>; }` },
    { name: "error used in a class name", code: `function Field({ error }) { return <input className={error ? "red" : ""} />; }` },
    { name: "not a component", code: `function field({ error }) { return <div><input /><p>{error}</p></div>; }` },
    { name: "component without the error prop", code: `function Field({ label }) { return <div><input /><p>{label}</p></div>; }` },
    { name: "nested component owns its control", code: `function Form({ error }) { const Inner = () => <input />; return <p>{error}</p>; }` },
    { name: "callback parameter named error", code: `function Field({ error }) { return <div><input />{list.map((error) => <p>{error}</p>)}</div>; }` },
    { name: "error prop from errorProps", code: `function Field({ error }) { return <div><input /><p>{error}</p></div>; }`, options: [{ errorProps: ["fieldError"] }] },
  ],
  invalid: [
    { code: `function Field({ error }) { return <div><input /><p>{error}</p></div>; }`, errors: [err] },
    { code: `function Field({ error }) { return <div><input />{error && <p>{error}</p>}</div>; }`, errors: [err] },
    { code: `const Field = ({ errorMessage }) => <><textarea /><span>{errorMessage}</span></>;`, errors: [err] },
    { name: "error message read from an object", code: `function Field({ error }) { return <div><select /><p>{error.message}</p></div>; }`, errors: [err] },
    { name: "props object", code: `function Field(props) { return <div><input /><p>{props.error}</p></div>; }`, errors: [err] },
    { name: "control with a role", code: `function Field({ error }) { return <div><div role="combobox" /><p>{error}</p></div>; }`, errors: [err] },
    { name: "forwardRef component", code: `const Field = forwardRef(({ error }, ref) => <div><input ref={ref} /><p>{error}</p></div>);`, errors: [err] },
    { name: "error inside role alert", code: `function Field({ error }) { return <div><input />{error && <p role="alert">{error}</p>}</div>; }`, errors: [err] },
    { name: "aria-errormessage", code: `function Field({ error }) { return <div><input aria-invalid aria-errormessage="e" /><p id="e">{error}</p></div>; }`, errors: [err] },
    { name: "aria-describedby React drops", code: `function Field({ error }) { return <div><input aria-describedby="" /><p>{error}</p></div>; }`, errors: [err] },
    {
      name: "error prop from errorProps",
      code: `function Field({ fieldError }) { return <div><input /><p>{fieldError}</p></div>; }`,
      options: [{ errorProps: ["fieldError"] }],
      errors: [{ messageId: "notLinked", data: { component: "Field", prop: "fieldError" } }],
    },
  ],
});
