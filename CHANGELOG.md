# Changelog

All notable changes to this project.

## [3.0.0] — 2026-10-11

### Added
- **Simulator covers all six measures from the brief:** remaining balance, daily allowance, savings goals, monthly forecast, financial risk and financial health, plus a before/after forecast chart.
- **Monthly forecast chart** on the Today page (history plus projection to Day 30).
- **Financial risk** level (Low / Medium / High) with a plain-language reason.
- **Money in** dialog for recording income.
- **Savings goals:** create and remove goals, and see how much your forecast surplus covers.
- **Dark theme** with a toggle that follows the system setting and remembers your choice.
- Error boundary with a recovery screen.
- Documentation: architecture guide, contributing guide, screenshots.

### Changed
- Code split secondary pages and dialogs with `React.lazy` + `Suspense`, and memoised dashboard components.
- Reorganised `src/` into `constants`, `types`, `utils`, `services`, `context`, `hooks`, `features`, `components`, `pages`.
- More responsive breakpoints, container queries and a landscape-phone layout.

## [2.0.0] — 2026-10-11

### Changed
- Rebuilt on React 18 + TypeScript (strict) + Vite with ESLint, Vitest and Testing Library.

## [1.0.0] — 2026-10-11

### Added
- First version: daily allowance, "Can I afford it?", bills, subscriptions, goals and a health score.
