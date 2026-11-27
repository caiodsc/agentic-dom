# hover-only-controls

Flags an element that holds controls and stays out of the page until the mouse is over it.

## Why

A row that shows its Edit and Delete buttons only on hover often hides them with `invisible` or `hidden`. Both take the buttons out of the accessibility tree and the tab order, not just out of sight. An agent reads that tree without moving the mouse, so it does not find the buttons. It has to guess where to hover, read the page again and try again. A keyboard user cannot reach them either. `opacity-0` hides them from the eye and keeps them in the tree, and `focus-within:opacity-100` shows them when a keyboard user tabs in.

## Fails

```jsx
<span className="invisible group-hover:visible">
  <button onClick={onEdit}>Edit</button>
</span>
```

```jsx
const [isHovered, setIsHovered] = useState(false);

<li onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
  <span className={isHovered ? "visible" : "invisible"}>
    <button onClick={onEdit}>Edit</button>
  </span>
</li>
```

## Passes

```jsx
<span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100">
  <button onClick={onEdit}>Edit</button>
</span>
```

The rule reports two shapes. The first is `invisible` or `hidden` with a hover variant that shows the element again, like `group-hover:visible` or `group-hover:flex`, in one class string, or with the hide class in the parts of a class value that always apply and the hover variant in any part. Tailwind's important marker, like `group-hover:!flex`, counts too. The second is a hide class tied to a state that a mouse enter handler (`onMouseEnter`, `onMouseOver`, `onPointerEnter` or `onPointerOver`) sets to `true`, in the same file. It reads the class value through ternaries, `&&`, template literals, string concatenation and class helpers like `clsx` or `cn`, including their arrays and objects. Controls are buttons, links and form fields, on the element or inside it, including components the rule knows as buttons or links.

## Not reported

- Code the rule can't follow, like a class from a variable (`className={classes}`), a condition with more than one state (`hover && ready`), or a hover state set in another file or through a custom hook.
- Controls rendered only on hover, like `{isHovered && <button>Edit</button>}`, since a hover popover often opens on focus too and the rule can't tell.
- An element with no controls inside, like an icon or a text that shows on hover.
- An element hidden only at some screen sizes, like `hidden md:flex` or `invisible md:visible`, or shown on focus instead of hover, like `invisible group-focus-within:visible`.
- A mouse enter handler that does something other than set a state to `true`, like highlighting the row under the mouse.
