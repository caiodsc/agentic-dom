# Traps the lint cannot see

Some patterns trip up a browser agent through how the page behaves while it runs, not through its JSX. agentic-dom cannot report them. This page lists the ones found so far, so you can check your app for them yourself.

## A change saved only when its undo notice closes

Some apps show a change on screen at once but save it only when the "Undo" notice closes, so that Undo can cancel it. The notice can pause its timer while the mouse is over it. [Sonner](https://github.com/emilkowalski/sonner), for example, stops the timer while the pointer is over its list of notices.

A browser agent clicks with a real mouse pointer, and the pointer stays where the last click left it. When it rests over the notice, the notice never closes. The screen already shows the new value, so the agent reports the task as done, but the change is never saved.

To avoid it, do one of these:

- Save the change right away and let Undo revert it.
- Let the notice close on its timer even while the mouse is over it.
