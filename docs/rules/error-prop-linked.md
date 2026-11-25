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

`aria-errormessage` also counts. The error counts as shown when the component renders it as a child, like `{error}` or `{error.message}`, also inside `{error && <p>{error}</p>}`. A control is an `<input>`, `<textarea>` or `<select>` that is not hidden, or an element with a control role like `combobox` or `textbox`.

## Not reported

- A component where any control has `aria-describedby`, `aria-errormessage` or a spread (`{...props}`), which may carry them. One linked control is enough, since the others may be a search box or a part of the same field.
- An error handed to another component as a prop, like `<FieldError error={error} />`.
- A boolean error that renders other text, like `{error && <p>Required</p>}`.
- Error text inside an element with `role="alert"`, which an agent reads as an error already.
- A control rendered by another component, like `<Input />`.
- An `aria-describedby` id that matches no element. The rule does not check ids.

## Options

- `errorProps` (default `["error", "errorMessage"]`): the props your components use for the error text.
