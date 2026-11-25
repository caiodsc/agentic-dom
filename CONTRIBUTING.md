# Contributing

Thanks for helping. Bug reports, rule ideas and pull requests are all welcome.

## Setup

You need Node 18.18 or newer.

```sh
npm ci
npm test
```

CI runs the tests on ESLint 8, 9 and 10. To try another version locally:

```sh
npm install --no-save eslint@8
npm test
```

## Adding or changing a rule

A rule change touches:

1. `lib/rules/<rule>.js`. Its `meta.docs.url` points to its docs page. Shared JSX helpers live in `lib/jsx.js`. `lib/elements.js` decides whether an element is a button or a link, and `lib/components.js` finds a component, the props it reads and the controls it renders.
2. `index.cjs`: the rule in `rules` and its level in the recommended configs.
3. `tests/<rule>.test.js`, with the `ruleTester` from `tests/setup.js`. Give each case that is not obvious a `name`.
4. `docs/rules/<rule>.md`, with the same sections as the others: Why, Fails, Passes, Not reported.
5. The Rules table in the README.

A new rule is worth adding when the pattern makes a browser agent fail a real task, it rarely reports correct code, and its message says what to add.

## Checking a rule change on a real app

`scripts/compare-rule.js` lints a React app with one rule from your working tree and from `main`, then lists each report that is new (`+`), gone (`-`) or worded differently (`~`):

```sh
node scripts/compare-rule.js <app dir> <rule>
```

A third argument compares with another branch or commit instead of `main`. To parse `.tsx` files, the app needs `@typescript-eslint/parser` installed.

## README images

`scripts/readme-assets.js` builds the images in `assets/`. The terminal image is a real ESLint run over `scripts/readme-demo`. When you change a rule message or a demo file, run:

```sh
npm run readme:assets
```

Then commit `assets/`. CI fails when the images are out of date.

## Pull requests

- One change per pull request.
- Title it `feat: <what it adds>` or `fix: <what it fixes>`, starting with a lowercase verb, like `feat: add issue forms`. The pull request lands on `main` as one commit with that title.
- Name the branch `feat/<short-name>` or `fix/<short-name>`, like `feat/issue-forms`.
- All test checks must pass before it can merge.
