# collapsed-content-inert

Flags an element that collapses to zero height but keeps its content in the page.

## Why

A collapsed panel with `max-h-0` hides its content from the eye only. The buttons and links inside stay in the accessibility tree and in the tab order. An agent reads that tree, takes those buttons as visible and tries to click one the person cannot see. `inert` takes the content out of both while the panel is collapsed. Some agent tools, like Playwright's page snapshot, list what is drawn and ignore `inert`. The `invisible` class sets `visibility: hidden`, which takes the content out for those tools too. `aria-hidden` alone does not pass, because the buttons inside can still take focus.

## Fails

```jsx
<div className={isCollapsed ? "max-h-0 overflow-hidden" : "max-h-96"}>
  <button onClick={approve}>Approve</button>
</div>
```

## Passes

```jsx
<div className={isCollapsed ? "max-h-0 overflow-hidden" : "max-h-96"} inert={isCollapsed}>
  <button onClick={approve}>Approve</button>
</div>
```

```jsx
<div className={isCollapsed ? "max-h-0 overflow-hidden invisible" : "max-h-96"}>
  <button onClick={approve}>Approve</button>
</div>
```

`hidden` also passes. `invisible` passes only in the same class string as the collapse class. An `inert` or `hidden` set to the opposite condition, like `inert={open}` on a panel that collapses when `!open`, is still reported. The rule reads the class value through ternaries, `&&`, template literals, string concatenation and class helpers like `clsx`, `cn` or `twMerge`, including their arrays and objects. When more than one part collapses the element, the message joins their conditions with `||`.

## Not reported

- Code the rule can't follow, like a spread (`{...props}`) on the element, even with attributes after it, or a class from a variable (`className={classes}`).
- A component, like `<Panel>` or `<motion.div>`, since the rule can't tell whether it passes `inert` on.
- An element with no content, or only what React renders as nothing (`{null}`, `{false}`, a comment), or one that is always collapsed (`className="h-0"`).
- A collapse class inside another condition, like `a ? "flex" : b ? "h-0" : ""` or `x || (c && "h-0")`, since the rule would have to combine both conditions to name when it collapses.
- A class that collapses only at some screen sizes, like `md:max-h-0`.
- Content hidden another way, like `opacity-0` alone.

## Options

- `collapseClasses` (default `["max-h-0", "h-0"]`): the class names that collapse an element, matched as whole classes, so `min-h-0` and `h-0.5` do not match.
