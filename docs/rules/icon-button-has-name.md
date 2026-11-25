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

`aria-labelledby` also counts. A `title` does not, since it names the button only when nothing else does. A name on the icon does not either, like `<CloseIcon aria-label="Close" />` or an `<svg>` with a `<title>` child, since it reaches the button only when the icon passes it on.

A button counts as icon-only when every child is an icon or blank text, also inside a fragment (`<>…</>`), and in each branch of `a ? b : c` or the right side of `a && b`. `null`, `undefined`, `true`, `false` and `""` count as blank, since React shows nothing for them. When the button has a single `a ? b : c`, one branch with only icons is enough, so `{open ? <ChevronUpIcon /> : "Close"}` is reported: it has no name while open. An icon is an `<svg>` or a component whose name matches `iconPattern`.

## Not reported

- Code the rule can't follow, like a spread (`{...props}`) on the button, even with attributes after it, a child written as any other expression (`{label}`, `{icon || <CloseIcon />}`), more than one `a ? b : c` whose branches mix icons and text, an icon inside another element (`<span><CloseIcon /></span>`), an icon passed as a prop (`<IconButton icon={<CloseIcon />} />`) or a button with no children.
- An icon component whose name does not match `iconPattern`, like `<Trash2 />`.
- An `aria-labelledby` id that no element has, or an element with no text. The rule checks that the button points at a name, not that the name exists or what it says.
- Links that show only an icon.

## Options

- `iconPattern` (default `^Icon[A-Z]|Icon$`): a regular expression for the last part of an icon component's name, so `CloseIcon`, `IconTrash`, `Icons.CloseIcon` and `icons.CloseIcon` match.
