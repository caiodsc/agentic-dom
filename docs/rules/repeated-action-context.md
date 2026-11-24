# repeated-action-context

Flags a button or link inside `.map()` whose name is the same on every row.

## How it decides

The rule never runs the code. It looks at where each part of the name comes from:

- From the row, like `r.name`, a field destructured from it, the index, or a variable in the loop built from them. The name changes per row, so it passes.
- From outside the row, like `t("edit")`, a prop or a const outside the loop. Every row gets the same name, so it is reported.
- From a value the rule can't trace, like a spread or a variable assigned again. It is not reported. [Not reported](#not-reported) lists these.

## Why

A table with twenty "Edit" buttons gives an agent twenty identical targets. It picks by position and often edits the wrong row. Naming the row ("Edit Jane Doe") makes each target unique.

Text elsewhere in the row does not count. WCAG 2.4.4 accepts context from the surrounding row or cell, but an agent that finds a button by role and name, like Playwright's `getByRole("button", { name: "Edit" })`, still gets twenty matches. The rule holds the button's own name to the bar WCAG 2.4.9 sets for links: the name alone identifies the target.

## Fails

```jsx
rows.map((r) => <button onClick={() => edit(r)}>Edit</button>)
```

A name built only from values outside the row is the same on every row too:

```jsx
rows.map((r) => <button>{t("edit")}</button>)
rows.map((r) => <button aria-label={label}>Edit</button>)
```

## Passes

```jsx
rows.map((r) => (
  <button aria-label={`Edit ${r.name}`} onClick={() => edit(r)}>Edit</button>
))
```

`aria-labelledby` built from the row (`aria-labelledby={r.id}`) also counts. An ID shared by the whole list, like a fixed string or a `useId()` outside the loop, is the same on every row, so it does not.

`aria-describedby` does not count, even from the row. It adds a description, not a name, so the button is still found as "Edit".

## Not reported

- Text that already changes per row (`{r.name}`).
- Buttons with spread props (`{...rowProps(r)}`). The spread can set a name per row.
- Icon-only buttons with no text. They have no name to repeat. A button with no name at all is a different problem.
- A name from a variable in the loop that is assigned again after its declaration, like `if (r.locked) label = "View"`. The rule can't tell a per-row assignment from a shared one.
- A name from a variable in the loop that is not written-out text and is also passed to a function, has a method called on it or is put in an object or array, like `onClick={() => track(label)}`. The rule can't tell whether that use changes it.
