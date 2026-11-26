# icon-button-has-name

Flags a button that shows only an icon and has no name.

## Why

An agent reads a button by its name. A button that shows only an icon has none, so the agent sees an unnamed button and cannot tell whether it closes, deletes or edits. A name says what the button does.

## Fails

```jsx
<button onClick={remove}>
  <TrashIcon />
</button>
```

## Passes

```jsx
<button onClick={remove} aria-label="Delete">
  <TrashIcon />
</button>
```

`aria-labelledby` and `title` also count, since the browser uses a `title` as the name when nothing else names the button. A name on the icon does not, like `<CloseIcon aria-label="Close" />` or an `<svg>` with a `<title>` child, since it reaches the button only when the icon passes it on.

A button counts as icon-only when every child is an icon or blank text, also inside a fragment (`<>…</>`), and in each branch of `a ? b : c` or the right side of `a && b`. `null`, `undefined`, `true`, `false` and `""` count as blank, since React shows nothing for them. When the button has a single `a ? b : c`, one branch with only icons is enough, so `{open ? <ChevronUpIcon /> : "Close"}` is reported: it has no name while open. An icon is an `<svg>`, a component brought in with `import` from `lucide-react`, or a component whose name matches `iconPattern`. A component with `render={<Button />}`, as in Base UI, counts as that button around its own children, so `<TooltipTrigger render={<Button />}><EditIcon /></TooltipTrigger>` is reported too. A name or a spread on either element counts, also when the component is a button itself, since both reach the element it renders.

## Not reported

- Code the rule can't follow, like a spread (`{...props}`) on the button, even with attributes after it, a child written as any other expression (`{label}`, `{icon || <CloseIcon />}`), more than one `a ? b : c` whose branches mix icons and text, an icon inside another element (`<span><CloseIcon /></span>`), an icon passed as a prop (`<IconButton icon={<CloseIcon />} />`) or a button with no children.
- An icon component from another source whose name does not match `iconPattern`, like a local `<Trash2 />` or one from `require("lucide-react")`.
- An `aria-labelledby` id that no element has, or an element with no text. The rule checks that the button points at a name, not that the name exists or what it says.
- Links that show only an icon.

## Options

- `iconPattern` (default `^Icon[A-Z]|Icon$`): a regular expression for the last part of an icon component's name, so `CloseIcon`, `IconTrash`, `Icons.CloseIcon` and `icons.CloseIcon` match.
