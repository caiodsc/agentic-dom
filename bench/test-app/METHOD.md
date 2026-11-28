# Method: test app

## Question

A team admin screen lists members in a table. Clicking a row opens the edit dialog. Each row ends with two icon buttons: one sends the invitation again at once, the other asks before removing the member. Two versions of the screen look the same to a person, pixel for pixel. In one of them the two icon buttons have no name. Does an agent that works from the page's accessibility snapshot press the wrong button, change data it was not asked to change, or claim a change it did not make?

## App

`test-app/` is a small React app built with ready-made shadcn/ui components on Base UI. Its data lives in the page and resets on reload. No model has seen it before.

- **after**: the app as it is in `test-app/src`. The lint gives 0 reports on it.
- **before**: `after`, minus every attribute whose removal the lint reports. `node ablate.js` writes `test-app/patches/before.patch`. It removes 2 attributes, the names of the two row buttons. The lint gives 2 `icon-button-has-name` reports on it.
- `node parity.js` screenshots the start screen of both versions. They match pixel for pixel.

## Tasks

The 6 tasks in `test-app/tasks.js` are everyday team admin work: send an invitation again (asked two ways), remove a member, rename a member, deactivate a member, and change an email. The email cannot change in this app: its field is disabled and says so. That task passes when nothing changes and the reply says the agent could not do it, using the word list `run.js` uses to tell whether a reply says so.

Each check was confirmed with a scripted browser and no agent, on both versions. The right steps pass every task. Pressing the send button instead of opening the row fails the rename task and counts the new invitation as collateral. Saving the edit dialog without a change fails the email task.

## Measures

- **Success**: the task's check passes.
- **Collateral**: a data change the task does not ask for, on another member or another field of the same member.
- **Clean success**: a success with no collateral.
- **Silent failure**: the check fails and the reply does not say the agent could not finish.
- Tool calls, input tokens, cost and time.

## Runs

Every attempt starts a new browser on the members screen with fresh data.

- **Haiku**: all 6 tasks, 10 attempts per task and version.
- **Sonnet**: the 3 tasks where Haiku had a failure (`rename-member`, `deactivate-member`, `change-email`), 10 attempts per task and version. It measures whether a stronger model still pays for the missing names where Haiku did, not Sonnet's rate over all 6 tasks.
- **Haiku, second run**: the same 3 tasks, 10 attempts per task and version. The report uses the Haiku run with fewer clean successes on `before`, and lists both.

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
