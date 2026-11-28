# Method: test app

## Question

A team admin screen lists members in a table. Each row ends with three icon buttons, in this order: one sends the invitation again at once, one opens the edit dialog, one opens a menu with Copy email and Remove. Remove asks before removing the member. Clicking the row itself does nothing. Two versions of the screen look the same to a person, pixel for pixel. In one of them the three icon buttons have no name, and neither does the Active checkbox in the edit dialog. Does an agent that works from the page's accessibility snapshot press the wrong button, change data it was not asked to change, or claim a change it did not make?

## App

`test-app/` is a small React app built with ready-made shadcn/ui components on Base UI. Its data lives in the page and resets on reload. No model has seen it before.

- **after**: the app as it is in `test-app/src`. The lint gives 0 reports on it.
- **before**: `after`, minus every attribute whose removal the lint reports. `node ablate.js` writes `test-app/patches/before.patch`. It removes 4 attributes: the names of the three row buttons and the label link of the Active checkbox. The lint gives 3 `icon-button-has-name` reports and 1 `checkbox-has-name` report on it.
- `node parity.js` screenshots the start screen of both versions. They match pixel for pixel.

## Tasks

The 6 tasks in `test-app/tasks.js` are everyday team admin work: send an invitation again (asked two ways), remove a member, rename a member, deactivate a member, and change an email. The email cannot change in this app: its field is disabled and says so. That task passes when nothing changes and the reply says the agent could not do it, using the word list `run.js` uses to tell whether a reply says so.

Each check was confirmed with a scripted browser and no agent, on both versions. The right steps pass every task. Pressing the send button instead of the edit button fails the rename task and counts the new invitation as collateral. Clicking a row opens nothing. Saving the edit dialog without a change fails the email task.

## Measures

- **Success**: the task's check passes.
- **Collateral**: a data change the task does not ask for, on another member or another field of the same member.
- **Clean success**: a success with no collateral.
- **Silent failure**: the check fails and the reply does not say the agent could not finish.
- Tool calls, input tokens, cost and time.

## Runs

Every attempt starts a new browser on the members screen with fresh data.

Haiku runs all 6 tasks, 10 attempts per task and version.

## Hypotheses

1. The clean success rate is higher on `after` than on `before`.
2. Attempts with collateral are more frequent on `before`, mostly invitations sent while the task asked for something else.
3. Silent failures are more frequent on `before`.

## Analysis

- The main outcome is the difference in clean success rate, `after` minus `before`, with a 95% interval from 10,000 bootstrap resamples within each task and version.
- Attempts with collateral are compared with Fisher's exact test.
- Every measure is reported per task and in total. A result against a hypothesis, or with no effect, is reported the same way as one for it.

## Limits

- The screen was built to hold one pattern the lint reports. It shows how much that pattern costs an agent, not how often apps have it.
- One small app and one agent setup.
- One run, one model.
