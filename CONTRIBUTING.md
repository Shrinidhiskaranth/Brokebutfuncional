# Contributing

Thanks for helping improve Broke But Functional.

## Setup

```bash
npm install
npm run dev
```

## Before every commit

```bash
npm run check   # typecheck + lint (zero warnings) + tests
npm run build   # make sure the production build passes
```

## Guidelines

- **Business logic goes in `src/domain`** as pure functions, with tests next to them (`*.test.ts`).
- **All state changes go through `state/reducer.ts`.** Add a typed action and re-validate its payload with `utils/sanitize.ts`.
- **Components stay presentational.** Read numbers from the snapshot via `useFinance()` rather than calculating them in JSX.
- **Accessibility is required:** label every control, keep keyboard access working, and keep text at WCAG AA contrast in both themes. ESLint's `jsx-a11y` rules must pass.
- **Security:** never use `dangerouslySetInnerHTML`, `eval` or inline scripts and styles, which would break the CSP.
- Use the existing CSS tokens (`--ink`, `--surface`, `--muted`…) instead of raw colours, so dark mode keeps working.

## Commit messages

Use short imperative messages, for example `Add savings goal removal` or `Fix forecast on Day 30`.
