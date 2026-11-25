# disabled-has-reason

Flags a button that can be disabled without saying why.

## Why

An agent that meets a disabled button cannot tell what is missing. It retries, scrolls, or gives up. A short reason linked to the button tells it what to fix.

## Fails

```jsx
<button disabled={!hasCard}>Pay</button>
```

## Passes

```jsx
<p id="pay-hint">Add a card to pay.</p>
<button disabled={!hasCard} aria-describedby="pay-hint">Pay</button>
```

`title` and `aria-description` do not count. A `title` shows only on hover, and browsers often show none on a disabled button. `aria-description` shows no text at all. Either way, an agent that reads the screen never sees the reason.

## Not reported

- Disabled only while waiting on a request, when every name in the condition matches `transientPattern` and none is negated with `!` or a `not`/`no` prefix (`disabled={isLoading}`, `disabled={mutation.isPending}`). A const like `const disabled = isSaving || isLoading` is checked by what it is computed from.
- `disabled={disabled}` when `disabled` is the component's prop, also when renamed while destructuring, or `disabled={props.disabled}`: the component passes its caller's choice through, so the caller explains.
- Elements with a spread (`{...props}`), which may carry `aria-describedby`.
- An `aria-describedby` written as an expression or a variable, like `ready ? false : null`, `!done` or a const. The rule counts it as a reason even when React drops every value it can take.
- An `aria-describedby` id that no element has, or an element with no text. The rule checks that the button points at a reason, not that the reason exists or what it says.

## Options

- `reasonProps`: extra props your components use for the reason, such as `disabledReason`.
- `transientPattern` (default `loading|pending|submitting|saving|fetching|busy|processing|mutating|uploading`): names that mean "waiting", case-insensitive.
