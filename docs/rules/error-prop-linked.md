# error-prop-linked

Flags a component that shows its error prop as text while none of its controls points at it.

## Why

An agent that submits a form and gets it back reads each field to find what went wrong. An error shown as loose text next to the field is not part of the field, so the agent sees the field but not why it was rejected. `aria-describedby` on the control makes the error part of what the agent reads for that field.

## Fails

```jsx
function EmailField({ error }) {
  return (
    <div>
      <input type="email" />
      {error && <p>{error}</p>}
    </div>
  );
}
```

## Passes

```jsx
function EmailField({ error }) {
  const errorId = useId();
  return (
    <div>
      <input type="email" aria-describedby={error ? errorId : undefined} />
      {error && <p id={errorId}>{error}</p>}
    </div>
  );
}
```

`aria-errormessage` does not count, since browsers expose it only while the control is also marked invalid. Error text inside `role="alert"` does not count either, since the alert is not tied to the field and an agent cannot tell which field it is about. The error counts as shown when the component renders it as a child, like `{error}` or `{error.message}`, also inside `{error && <p>{error}</p>}`. A control is an `<input>`, `<textarea>` or `<select>` that is not hidden, or an element with a control role like `combobox` or `textbox`.

## Not reported

- Code the rule can't follow, like a spread (`{...rest}`) on any control, even with attributes after it, an error read with brackets (`props["error"]`), an error handed to another component (`<FieldError error={error} />`) or a control rendered by another component (`<Input />`).
- A component where any control has `aria-describedby`. One linked control is enough, since the others may be a search box or a part of the same field.
- A boolean error that renders other text, like `{error && <p>Required</p>}`.
- An `aria-describedby` id that matches no element. The rule does not check ids.

## Options

- `errorProps` (default `["error", "errorMessage"]`): the props your components use for the error text.
