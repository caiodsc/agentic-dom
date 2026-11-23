# repeated-action-context

Flags a button or link inside `.map()` whose name is the same on every row.

## Why

A table with twenty "Edit" buttons gives an agent twenty identical targets. It picks by position and often edits the wrong row. Naming the row ("Edit Jane Doe") makes each target unique.

Text elsewhere in the row does not count. WCAG 2.4.4 accepts context from the surrounding row or cell, but an agent that finds a button by role and name, like Playwright's `getByRole("button", { name: "Edit" })`, still gets twenty matches. The rule holds the button's own name to the bar WCAG 2.4.9 sets for links: the name alone identifies the target.

## Fails

```jsx
rows.map((r) => <button onClick={() => edit(r)}>Edit</button>)
```

## Passes

```jsx
rows.map((r) => (
  <button aria-label={`Edit ${r.name}`} onClick={() => edit(r)}>Edit</button>
))
```

`aria-labelledby` or `aria-describedby` built from the row (`aria-describedby={r.id}`) also count. A fixed ID is the same on every row, so it does not.

## Not reported

- Text that already changes per row (`{r.name}`).
- Icon-only buttons with no text. They have no name to repeat. A button with no name at all is a different problem.
