# empty-button-has-name

Flags a button that shows no text and has no name, like a switch whose only content is its knob.

## Why

An agent reads a button by its name. A button whose content is only empty elements has none, so the agent sees an unnamed button and cannot tell what it turns on or off. Text beside the button does not name it unless the button points at it.

## Fails

```jsx
<span>Show cancelled</span>
<button role="switch" aria-checked={on} onClick={toggle}>
  <span className="knob" />
</button>
```

## Passes

```jsx
<span id="cancelled-text">Show cancelled</span>
<button role="switch" aria-checked={on} onClick={toggle} aria-labelledby="cancelled-text">
  <span className="knob" />
</button>
```

`aria-label` and `title` also count. So does `aria-label` or `aria-labelledby` on an element inside the button, since the browser builds the button's name from its content. A `title` there only shows a tooltip, so it does not count.

A component with `render={<Button />}`, as in Base UI, counts as that button around its own children. A name, an `id` or a spread on either element counts.

A `<button>` with no children counts as empty, and so does an `<input type="button">` with no `value`. Any button also counts as empty when it has at least one child element or fragment and every child is blank text, also inside `{" "}`, a value React renders as nothing (`null`, `undefined`, `true`, `false`, `""`), or a fragment (`<>…</>`), `span`, `div` or `i` with only such children. A `span`, `div` or `i` hidden with `aria-hidden="true"`, `hidden` or the `hidden` class also counts as blank, since the browser leaves it out of the name.

When another button this rule reports sits in the same HTML element, with only components, fragments or conditions between them, the message says so. It says so too for a button that a `.map` callback returns, since its copies sit side by side. An agent cannot tell such buttons apart without clicking one, so they are the ones to name first. Only buttons in the same file count, so a button that a component from another file renders is not seen as a neighbor. Two buttons on opposite sides of one `a ? b : c` are never on the page together, so they are not neighbors. Two conditions that exclude each other, like `open && …` and `!open && …`, still count as neighbors.

## Not reported

- Code the rule can't follow, like a spread (`{...props}`) on the button or on an element inside it, even with attributes after it, a child written as any other expression (`{label}`), a component inside the button (`<Avatar />`), a component button with no children (`<Button />`), a `<button>` that gets its content from a `children` or `dangerouslySetInnerHTML` prop, or a `<button>` with no children handed to another element as a prop, also behind `a ? b : c` or `a && b`.
- A button with an `id`, since a `<label htmlFor>` elsewhere can name it, and a button inside a `<label>` that holds anything besides the button.
- Any other element inside the button, like an `<img>`, whose `alt` names the button, or an `<svg>`, which `icon-button-has-name` checks.
- An `aria-labelledby` id that no element has, or an element with no text. The rule checks that the button points at a name, not that the name exists or what it says.
- Links that show no text.

## Options

None.
