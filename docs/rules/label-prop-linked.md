# label-prop-linked

Flags a component that shows its `label` prop as text but renders a control with no link to that text.

## Why

An agent reads a form field's name from the accessibility tree. If the label is a plain `<div>` next to the `<input>`, the field has no name, so the agent guesses from the placeholder or takes a screenshot. The rule runs on the component's own file, so one fix there repairs every screen that uses it.

## Fails

```jsx
const InputText = ({ label, name }) => (
  <div>
    <div>{label}</div>
    <input id={name} name={name} />
  </div>
);
```

## Passes

```jsx
const InputText = ({ label, name }) => (
  <div>
    <label htmlFor={name}>{label}</label>
    <input id={name} name={name} />
  </div>
);
```

Also linked: the control inside `<label>`, `aria-labelledby` on the control, `aria-label={label}`, or the label as the control's own content (a switch button).

A fixed `aria-label` does not count, like `aria-label="Email"` or `` aria-label={`Search ${scope}`} ``. It names the control the same way on every screen that uses the component, so the agent reads a name that is not the label shown, and two of these fields on one screen share it. An `aria-label` built from the label, like `` aria-label={`${label} search`} ``, counts. One that reads the label only to pick a fixed name, like `aria-label={label && "Search"}`, does not.

`htmlFor` links the label only when an element in the component has that id and can take a label: a visible input, select, textarea, button, meter, output or progress, a component that may render one, or a custom element like `<x-date-input>`, which may be form-associated. A `<div role="combobox">` cannot.

## Not reported

- Code the rule can't follow, like a label handed to another component (`<Base label={label} />`), a label read with brackets (`props["label"]`) or a component without a capitalized name (`export default ({ label }) => ...`).
- An input, select or textarea that a `<label htmlFor>` in the component names, whatever text it shows.
- A control that shares its id with an earlier element, like `<div id="x" />` before `<input id="x" />`. HTML links `<label htmlFor="x">` only to the first one, but the rule counts it as naming the control.
- Controls with an `aria-labelledby` id that no element has. The id can belong to text outside the component, like a dialog title, so the rule can't tell a typo from a name set elsewhere.
- Controls hidden with `hidden`, `aria-hidden` or Tailwind's `hidden` class. They are left out of the accessibility tree, so no agent reads their name.

## Options

`labelProps` (default `["label"]`): prop names that hold the visible label.
