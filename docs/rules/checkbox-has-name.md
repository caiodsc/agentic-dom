# checkbox-has-name

Flags a checkbox that has no name.

## Why

A checkbox in a list row or a table cell often sits next to its text without being tied to it. A person reads the row. An agent sees a checkbox with no name, so it cannot tell which item it selects or what it turns on, and may tick the wrong row. A `<label>` around the checkbox and its text, or `aria-labelledby` on the text, gives the checkbox that text as its name.

## Fails

```jsx
<div className="flex gap-2">
  <Checkbox checked={task.done} onCheckedChange={toggle} />
  <span>{task.text}</span>
</div>
```

## Passes

```jsx
<div className="flex gap-2">
  <Checkbox aria-labelledby={`task-${task.id}`} checked={task.done} onCheckedChange={toggle} />
  <span id={`task-${task.id}`}>{task.text}</span>
</div>
```

```jsx
<label className="flex gap-2">
  <input type="checkbox" checked={remember} onChange={toggle} /> Remember me
</label>
```

A checkbox is an `<input type="checkbox">`, an element with `role="checkbox"`, or a component whose name ends in `Checkbox`. It passes with `aria-label`, `aria-labelledby`, `title` or, on a component, a `label` prop. It also passes inside a `<label>` that holds text or an expression, inside a component whose name ends in `Label`, with text or an expression anywhere inside it, or with an `id` that a `htmlFor` on a `<label>` that holds text or on a component in the same file names. An `<input>` has no `label` attribute, and React renders nothing for `{false}`, `{null}` or a blank string, and text with `aria-hidden="true"` is left out of the name, so none of these names it. An icon shown by a condition, like `{checked && <CheckIcon />}`, is still only an icon. A `<label>` names only an element it can label, like `<input>` or `<button>`, so it does not name a `<div role="checkbox">`. An `id` that no `htmlFor` in the file names does not pass.

## Not reported

- Code the rule can't follow, like a spread (`{...props}`) on the checkbox, even with attributes after it, or a label in another file that points at the checkbox's `id`.
- A checkbox that is hidden, or inside an element that is hidden, with `hidden`, `aria-hidden="true"` or the `hidden` class.
- A component mapped in settings to another kind, like `as: "none"`.
