# toggle-has-state

Flags a button that shows and hides content but never says whether it is shown.

## Why

An agent that clicks a toggle reads the page again to see what changed. If the button does not say whether its content is shown, the agent cannot tell if the click opened or closed it, and may click again and close what it just opened. `aria-expanded` gives the state on the button itself.

## Fails

```jsx
function Filters() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)}>Filters</button>
      {open && <FilterPanel />}
    </div>
  );
}
```

## Passes

```jsx
<button aria-expanded={open} onClick={() => setOpen(!open)}>Filters</button>
```

A button counts as a toggle when its `onClick` calls a `useState` setter with `!x` or `(v) => !v`, written inline or in a const in the same component. The state must show or hide JSX: `x && <JSX>`, `!x && <JSX>` or `x ? <JSX> : …`. The message gives `!x` when the content shows while the state is false, like `collapsed`. When the state picks between two pieces of JSX, like `!open ? <Summary /> : <Details />`, the message gives the state as named, `open`, since either side can be the content.

`aria-pressed` also counts for an on/off button like "Bold" or "Edit". A fixed value, like `aria-expanded={false}`, does not count, since it cannot follow the state after a click. Nor does a value React drops, like `aria-expanded={undefined}`. A button with `role="switch"`, `role="checkbox"`, `role="radio"`, `role="menuitemradio"` or `role="menuitemcheckbox"` passes only with `aria-checked`, and one with `role="tab"` or `role="option"` only with `aria-selected`, since those roles say their state only through that attribute. Text that changes with the state, like `{open ? "Hide" : "Show"}`, does not count, since the agent has to guess the state from the words.

## Not reported

- Code the rule can't follow, like a spread (`{...props}`) on the button, even with attributes after it, state from props or from a custom hook (`useToggle()`), a handler written as a function declaration, wrapped in `useCallback` or read from an object (`handlers.toggle`), an updater with a block body (`(v) => { return !v; }`) or content shown by more than one condition (`open && ready && <Menu />`).
- A state attribute that reads another value, like `aria-expanded={busy}`. The rule does not check which state it follows.
- A button that only its own condition hides, like a "Show more" button inside `!open && …` that goes away once it is clicked. A condition around the button hides the button, not the content it shows.
