# label-in-name

Flags a button or link whose `aria-label` leaves out the text it shows.

## Why

An `aria-label` replaces the text as the name. An agent that reads "Cancel" on the screen and looks for a button named "Cancel" finds none when the `aria-label` says "Close". Keeping the visible text in the name lets the agent find what it sees.

## Fails

```jsx
<button onClick={close} aria-label="Close">
  Cancel
</button>
```

## Passes

```jsx
<button onClick={close} aria-label="Cancel and close">
  Cancel
</button>
```

Dropping the `aria-label` also works, since the text becomes the name. The match ignores case and punctuation and also finds the text inside a longer word, so `aria-label="save, then close"` passes for `Save!` and `aria-label="Learn about order statuses"` passes for `Status`.

## Not reported

- Code the rule can't follow, like a spread (`{...props}`) on the element, even with attributes after it, an `aria-label` or text from an expression (`aria-label={label}`, `{text}`), or a component child with a runtime prop (`<Trans id={key} />`).
- An element named by `aria-labelledby`, which wins over `aria-label`.
- Text with no letters or digits, like `×`, or only icons.
- An `<input>` button, whose text comes from `value`.
- Text hidden from the screen with CSS, like a visually hidden span. The rule counts it as shown.

## Options

None.
