# selected-has-state

Flags a button that looks selected but never says whether it is selected.

## Why

Tab bars, filter chips and colour swatches often mark the chosen option only with a colour or a border. An agent that reads the page sees every option alike. It cannot tell which tab is open or which filter is on, so it may click the one already chosen or report the wrong one. `aria-pressed` gives the state on the button itself.

## Fails

```jsx
function Filters({ options }) {
  const [filter, setFilter] = useState("all");
  return options.map((o) => (
    <button key={o.id} className={filter === o.id ? "chip chip-on" : "chip"} onClick={() => setFilter(o.id)}>
      {o.name}
    </button>
  ));
}
```

## Passes

```jsx
<button aria-pressed={filter === o.id} className={filter === o.id ? "chip chip-on" : "chip"} onClick={() => setFilter(o.id)}>
  {o.name}
</button>
```

A button counts as selectable when its `onClick` calls a `useState` setter, written inline or in a const in the same component, and its `className` or `style` compares that state with `===` or `==`, like `filter === o.id`. The message gives that comparison as the value to use.

`aria-current` also counts, for the current page or step. A fixed value, like `aria-pressed={false}`, does not count, since it cannot follow the state after a click. Nor does a value React drops, like `aria-pressed={undefined}`. A button with `role="tab"` or `role="option"` passes only with `aria-selected`, and one with `role="radio"`, `role="switch"`, `role="checkbox"`, `role="menuitemradio"` or `role="menuitemcheckbox"` only with `aria-checked`, since those roles say their state only through that attribute. `aria-selected` on a button with no role does not count, since a plain button has no selected state.

## Not reported

- A button with a spread (`{...props}`), which may carry `aria-pressed`. The rule skips it even when an attribute after the spread replaces that value, like `<button {...props} aria-pressed={false}>`.
- A style that reads the state without `===` or `==`, like `saving ? "opacity-50" : ""` or `!==`. A true or false state may show work in progress rather than a choice, and on/off buttons that show content are checked by [toggle-has-state](toggle-has-state.md).
- A state compared outside `className` and `style`, like a `variant` prop of a design system button.
- State from props or from a custom hook, like `useTabs()`.
- A handler written as a function declaration, wrapped in `useCallback` or read from an object, like `handlers.pick`.
