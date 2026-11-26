# Pre-registration

Written and committed before any run of these tasks. Any change after this commit is listed at the end of this file with its reason.

## Question

Two versions of Atomic CRM look the same to a person, pixel for pixel. One of them lacks only what agentic-dom asks for. Does an agent that works from the page's accessibility snapshot finish fewer everyday tasks on that version, change data it was not asked to change, or spend more steps?

## Versions

- **after**: Atomic CRM with `patches/after.patch`. That patch fixes every report the lint gives on the published app. An agent wrote it from the lint output alone. The lint gives 0 reports on it.
- **before**: `after`, minus every attribute whose removal the lint reports. `ablate.js` writes it. It tries each attribute the rules ask for, one at a time, and keeps the removal only when the file's report count rises. It never removes visible text. It skips attributes the app's styles select on, so the look cannot change. The lint gives 30 reports on it.
- `parity.js` screenshots the start screen of every task in both versions with a fixed clock and no outside hosts. All 11 screens match pixel for pixel.

## Tasks

The 16 tasks in `tasks.js` are everyday CRM work: tags, tasks, notes, deals, companies, settings, search and one question about a disabled button. They were written from what the app does. They were not picked from the spots `before.patch` changes. Every task is reported, including those whose screens lost nothing.

Each task's check reads the demo data before and after the run. A check passes on the right change and fails when nothing changed. Both were confirmed by applying the right change straight to the data, with no agent.

## Measures

- **Success**: the task's check passes.
- **Collateral**: a data change the task does not cover. Counters the data provider recomputes, like `nb_tasks`, are not changes.
- **Clean success**: success with no collateral.
- **Silent failure**: the check fails and the agent's last reply does not say it could not finish.
- Tool calls, input tokens, cost and time per attempt.

## Runs

- Haiku: 20 attempts per task and version.
- Sonnet: 5 attempts per task and version.
- Every attempt starts a new browser on the task's start screen with fresh demo data.
- The run stops at US$ 20 in total. `run.js` prints how many attempts it did not reach.

## Hypotheses

1. **Primary.** With Haiku, the clean success rate is higher on `after` than on `before`.
2. Attempts with collateral are more frequent on `before`.
3. Silent failures are more frequent on `before`.
4. Attempts on `before` use more tool calls and input tokens.
5. Tasks whose start screen lost nothing but the Refresh button show no difference.

## Analysis

- The primary outcome is the difference in clean success rate, `after` minus `before`, over all 16 tasks with Haiku. Its 95% interval comes from 10,000 bootstrap resamples of attempts within each task and version. The effect counts as shown when the interval excludes 0.
- Rates carry 95% Wilson intervals. Means carry 95% bootstrap intervals.
- Every measure is reported per task and in total, for both models. Sonnet results are reported the same way. With 5 attempts per cell they are not tested.
- A result against a hypothesis, or with no effect, is reported the same way as one for it.

## Changes allowed after this commit

A Haiku pilot with 2 attempts per task and version runs first. If a check marks a correct run as failed, or a correct run as collateral, the check is fixed and the fix is listed below. Prompts, tasks, versions and measures do not change. Pilot attempts are not part of the results.

## Limits known in advance

- The agent's snapshot lists content under `inert`, and clicks on it time out. Chrome's own accessibility tree drops it. So the one removed `inert` cannot change what this agent sees.
- Attributes the app's styles select on (`aria-expanded`, `aria-invalid`, `aria-checked`, `aria-pressed`) stay in both versions. So `toggle-has-state` and `error-prop-linked` are not tested.
- `label-in-name` is not tested. Removing a fix for it means adding a wrong name, not removing an attribute.
- Some controls have no name in both versions because the lint does not report them yet: an icon button in the header, the remove buttons in the settings lists and the task checkboxes.
- In `after.patch`, one value was fixed by hand. The lint suggested `aria-expanded={!displayMore}` for a button that sits inside the content the condition hides, which states the opposite.
- One app, one agent setup.

## Changes after this commit

1. The app saves an edit when its undo notice closes, and the notice stays open while the mouse is over it. `run.js` moves the mouse away before reading the data.
2. The `move-deal` check allows `updated_at` on the cards it renumbers. The demo data stamps it on every deal it updates.
3. The app server refuses source maps, so the agent cannot read the app's code through the browser.
4. A newer rule, `empty-button-has-name`, reported the tag color buttons on `after`. `after.patch` now names them. `before` is unchanged, and the lint counts 30 reports on it instead of 29.
