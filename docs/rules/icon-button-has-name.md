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

A button counts as icon-only when every child is an icon or blank text, also inside a fragment (`<>…</>`), and in each branch of `a ? b : c` or the right side of `a && b`. `null`, `undefined`, `true`, `false` and `""` count as blank, since React shows nothing for them. When the button has a single `a ? b : c`, one branch with only icons is enough, so `{open ? <ChevronUpIcon /> : "Close"}` is reported: it has no name while open. An icon is an `<svg>`, a component brought in with `import` from `lucide-react`, or a component whose name matches `iconPattern`. A component whose name ends in `Avatar` counts as an icon too, since a picture of a person says nothing about what the button does. A component with `render={<Button />}`, as in Base UI, counts as that button around its own children, so `<TooltipTrigger render={<Button />}><EditIcon /></TooltipTrigger>` is reported too. A name or a spread on either element counts, also when the component is a button itself, since both reach the element it renders. A spread does not count when the button is the trigger of a tooltip that shows text, since a tooltip's text never names its trigger and shows that nothing else does:

```jsx
<Tooltip>
  <TooltipTrigger render={<Button {...props} />}>
    <TrashIcon />
  </TooltipTrigger>
  <TooltipContent>Delete</TooltipContent>
</Tooltip>
```

This is reported. A tooltip counts when it is a `Tooltip` or `Tooltip.Root` around the trigger, or around the trigger's parent with `asChild`, with a `TooltipContent`, `TooltipPopup`, `Tooltip.Content`, `Tooltip.Popup` or `Tooltip.Portal` that holds text or an expression. The rule does not see a name that a caller passes through the spread, so `<DeleteButton aria-label="Delete" />` still reports the button inside `DeleteButton`. Write the name on the button itself.

When another button this rule reports sits in the same HTML element, with only components, fragments or conditions between them, the message says so. It says so too for a button that a `.map` callback returns, written in the call, passed by name or passed as a class method, even through a wrapper like `useCallback` or `.bind`, since its copies sit side by side, and for a button written beside that `.map` call. An agent cannot tell such buttons apart without clicking one, so they are the ones to name first. Only buttons in the same file count, so a button that a component from another file renders is not seen as a neighbor. Two buttons on opposite sides of one `a ? b : c`, `if` or `switch`, or returned by different `return`s, are never on the page together, so they are not neighbors. A button stored in a variable counts where the variable is read, when it is read in one place. Two conditions that exclude each other, like `open && …` and `!open && …`, still count as neighbors.

## Not reported

- Code the rule can't follow, like a spread (`{...props}`) on the button outside a tooltip that shows text, even with attributes after it, a child written as any other expression (`{label}`, `{icon || <CloseIcon />}`), more than one `a ? b : c` whose branches mix icons and text, an icon inside another element (`<span><CloseIcon /></span>`), an icon passed as a prop (`<IconButton icon={<CloseIcon />} />`) or a button with no children.
- An icon component from another source whose name does not match `iconPattern`, like a local `<Trash2 />` or one from `require("lucide-react")`.
- An `aria-labelledby` id that no element has, or an element with no text. The rule checks that the button points at a name, not that the name exists or what it says.
- A tooltip given as a prop, like `<Tooltip title="Delete">`. Some libraries copy it onto the button as its name.
- Links that show only an icon.

## Options

- `iconPattern` (default `^Icon[A-Z]|Icon$`): a regular expression for the last part of an icon component's name, so `CloseIcon`, `IconTrash`, `Icons.CloseIcon` and `icons.CloseIcon` match.
