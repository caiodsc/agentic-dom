import { ruleTester } from "./setup.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Linter } from "eslint";
import rule from "../lib/rules/disabled-has-reason.js";

test("empty transientPattern is rejected", () => {
  const config = { plugins: { a: { rules: { r: rule } } }, rules: { "a/r": ["warn", { transientPattern: "" }] } };
  assert.throws(() => new Linter({ configType: "flat" }).verify("", config), /shorter than 1/);
});

ruleTester.run("disabled-has-reason", rule, {
  valid: [
    `<button disabled={!hasCard} aria-describedby="card-hint">Pay</button>`,
    { name: "aria-describedby set to a boolean, which React renders as text", code: `<button disabled={!ok} aria-describedby={true}>Pay</button>` },
    `<Button disabled={!hasCard} aria-describedby="hint">Pay</Button>`,
    { name: "disabled only while loading", code: `<button disabled={isLoading}>Save</button>` },
    { name: "disabled only while a request is pending", code: `<Button disabled={mutation.isPending || isSubmitting}>Save</Button>` },
    `<button disabled={false}>Save</button>`,
    { name: "disabled set to null", code: `<button disabled={null}>Save</button>` },
    { name: "disabled set to zero", code: `<button disabled={0}>Save</button>` },
    { name: "disabled set to undefined", code: `<button disabled={undefined}>Save</button>` },
    { name: "own disabled prop passed through", code: `function Save({ disabled }) { return <button disabled={disabled}>Save</button>; }` },
    {
      name: "local const disabled only while loading",
      code: `function Save() { const disabled = isSaving || isLoading; return <button disabled={disabled}>Save</button>; }`,
    },
    { name: "disabled destructured from props", code: `function Save(props) { const { disabled } = props; return <button disabled={disabled}>Save</button>; }` },
    { name: "disabled prop renamed while destructuring", code: `function Save({ disabled: isDisabled }) { return <button disabled={isDisabled}>Save</button>; }` },
    { name: "local const disabled set to false", code: `function Save() { const disabled = false; return <button disabled={disabled}>Save</button>; }` },
    { name: "pending flag read with brackets", code: `<button disabled={mutation["isPending"]}>Save</button>` },
    { name: "props.disabled passed through", code: `function Save(props) { return <Button disabled={props.disabled}>Save</Button>; }` },
    { name: "spread props may carry the reason", code: `<button {...props} disabled={!ok}>Save</button>` },
    { name: "input is not a button", code: `<input disabled={!editable} />` },
    { name: "unknown component is not a button", code: `<Card disabled={!ok} />` },
    {
      name: "reason prop from reasonProps",
      code: `<Button disabled={!ok} disabledReason="Fill the form">Save</Button>`,
      options: [{ reasonProps: ["disabledReason"] }],
    },
    { name: "flag read with optional chaining", code: `<button disabled={query?.isPending}>Save</button>` },
    { name: "own disabled prop with a default", code: `function Save({ disabled = false }) { return <button disabled={disabled}>Save</button>; }` },
    { name: "own disabled prop with a quoted key", code: `function Save({ "disabled": off }) { return <button disabled={off}>Save</button>; }` },
    { name: "parameter named disabled", code: `function Save(disabled) { return <button disabled={disabled}>Save</button>; }` },
  ],
  invalid: [
    { name: "title is no reason", code: `<button disabled={!hasCard} title="Add a card first">Pay</button>`, errors: [{ messageId: "noReason" }] },
    { name: "runtime title is no reason", code: `<button disabled={!ok} title={busy ? "A payment is in progress" : undefined}><TrashIcon /></button>`, errors: [{ messageId: "noReason" }] },
    { name: "aria-description is no reason", code: `<button disabled={!hasCard} aria-description="Add a card first">Pay</button>`, errors: [{ messageId: "noReason" }] },
    {
      name: "local disabled copied from another prop",
      code: `function Save({ canSave }) { const disabled = canSave; return <button disabled={disabled}>Save</button>; }`,
      errors: [{ messageId: "noReason" }],
    },
    { name: "flag looked up by a variable key", code: `<button disabled={flags[isLoading]}>Save</button>`, errors: [{ messageId: "noReason" }] },
    { code: `<button disabled={!hasCard}>Pay</button>`, errors: [{ messageId: "noReason" }] },
    { code: `<button disabled>Pay</button>`, errors: [{ messageId: "noReason" }] },
    { code: `<SubmitButton disabled={!isValid || isSubmitting}>Pay</SubmitButton>`, errors: [{ messageId: "noReason" }] },
    { code: `<input type="submit" disabled={!ok} />`, errors: [{ messageId: "noReason" }] },
    { name: "negated loading flag", code: `<button disabled={!isLoading}>Save</button>`, errors: [{ messageId: "noReason" }] },
    { name: "wait word in a negated name", code: `<button disabled={notLoading}>Save</button>`, errors: [{ messageId: "noReason" }] },
    { name: "wait word after a No", code: `<button disabled={isNoLoading}>Save</button>`, errors: [{ messageId: "noReason" }] },
    { name: "submit input in capitals", code: `<input type="SUBMIT" disabled={!ok} />`, errors: [{ messageId: "noReason" }] },
    {
      name: "local object named props",
      code: `function Pay({ hasCard }) { const props = { disabled: !hasCard }; return <button disabled={props.disabled}>Pay</button>; }`,
      errors: [{ messageId: "noReason" }],
    },
    {
      name: "local disabled computed in the component",
      code: `function Pay({ hasCard }) { const disabled = !hasCard; return <button disabled={disabled}>Pay</button>; }`,
      errors: [{ messageId: "noReason" }],
    },
    {
      code: `<Action disabled={!ok}>Go</Action>`,
      settings: { "agentic-dom": { components: { Action: { as: "button" } } } },
      errors: [{ messageId: "noReason" }],
    },
  ],
});
