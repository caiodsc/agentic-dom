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

- A child written as any other expression, like `{label}` or `{icon || <CloseIcon />}`. The rule cannot tell what it renders.
- A button with more than one `a ? b : c` whose branches mix icons and text, like `{open ? <ChevronUpIcon /> : "Show"}{open ? "Hide" : null}`. The rule cannot tell which branches show together.
- An icon inside another element, like `<span><CloseIcon /></span>`.
- An icon component whose name does not match `iconPattern`, like `<Trash2 />`.
- An icon passed as a prop, like `<IconButton icon={<CloseIcon />} />`, and a button with no children.
- A spread on the button, which may carry a name.
- An `aria-labelledby` id that no element has, or an element with no text. The rule checks that the button points at a name, not that the name exists or what it says.
- Links that show only an icon.

## Options

- `iconPattern` (default `^Icon[A-Z]|Icon$`): a regular expression for the last part of an icon component's name, so `CloseIcon`, `IconTrash`, `Icons.CloseIcon` and `icons.CloseIcon` match.
