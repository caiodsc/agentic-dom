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

A button counts as a toggle when its `onClick` calls a `useState` setter with `!x` or `(v) => !v`, written inline or in a const in the same component. The state must show or hide JSX: `x && <JSX>`, `!x && <JSX>` or `x ? <JSX> : …`. The message gives `!x` when the content shows while the state is false, like `collapsed`.

`aria-pressed` also counts, with any value.

## Not reported

- A button with a spread (`{...props}`), which may carry `aria-expanded`.
- A button with `role="switch"`, `role="checkbox"` or `role="tab"`, which carry their own state.
- A button whose text, `aria-label` or `title` reads the state, like `{open ? "Hide" : "Show"}`. An icon prop that reads it, like `direction={open ? "up" : "down"}`, does not count.
- State from props or from a custom hook, like `useToggle()`.
- A handler written as a function declaration, wrapped in `useCallback` or read from an object, like `handlers.toggle`.
- An updater with a block body, like `(v) => { return !v; }`.
