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

`aria-labelledby` and `title` also count. So does an icon that names itself: an icon component with `aria-label`, `aria-labelledby` or `title`, or an `<svg>` with a `<title>` child.

A button counts as icon-only when every child is an icon or blank text. An icon is an `<svg>` or a component whose name matches `iconPattern`.

## Not reported

- A child written as an expression, like `{label}` or `{open ? <ChevronUpIcon /> : <ChevronDownIcon />}`. The rule cannot tell what it renders.
- An icon inside another element, like `<span><CloseIcon /></span>`.
- An icon component whose name does not match `iconPattern`, like `<Trash2 />`.
- An icon passed as a prop, like `<IconButton icon={<CloseIcon />} />`, and a button with no children.
- A spread on the button or on the icon, which may carry a name.
- Links that show only an icon.

## Options

- `iconPattern` (default `^Icon[A-Z]|Icon$`): a regular expression for the last part of an icon component's name, so `CloseIcon`, `IconTrash` and `Icons.CloseIcon` match.
