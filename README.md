# Broke But Functional — Survive the Month

A Gen Z personal finance app for living on **₹10,000 for 30 days**. It answers two questions, clearly:

1. **How much can I spend today?** One big number, recalculated after every action.
2. **Can I afford this?** Try any decision first, see its effect on the whole month, then decide.

**Stack:** React 18 · TypeScript (strict) · Vite 5 · Vitest + Testing Library · ESLint 9 (typescript-eslint strict, jsx-a11y, react-hooks) · deployed on Vercel.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm test           # unit, component and integration tests
npm run lint       # ESLint, zero warnings allowed
npm run check      # typecheck + lint + tests
```

---

## Features mapped to the brief

| Brief requirement | Where it lives |
|---|---|
| Limited ₹10,000 budget over 30 days | `src/config.ts`, a day counter with **Next day**, and month roll-over |
| Income | "Money in" entries, the "Earn ₹1,500 from a gig" move, and leftover money carried into the next month |
| Balance & spending | **Today**: hero allowance, money split bar, category breakdown, 30-day calendar, recent activity |
| Commitments (bills) | **My money**: bills auto-paid on their due day, with the money kept aside in advance |
| Subscriptions | Accessible on/off switches. Cancelling an unpaid one frees the money immediately |
| Savings goals | Goals with progress bars. Saving takes money out of what you can spend |
| Unexpected expenses | **Surprise expense** and an "unexpected" toggle. These are kept out of your usual daily spend |
| Financial risk | Status line ("broke on Day 26"), run-out day, colour-coded verdicts |
| Financial health | Score from 0–100 built from 5 factors, explained under "Why this score?" |
| **Simulate decisions before taking them** | **Can I afford it?** shows before → after for the daily allowance, month-end balance, run-out day and health score. Nothing changes until you confirm |
| Visible, interconnected consequences | One pure engine (`computeSnapshot`) feeds every screen. The spend dialog previews the new daily limit as you type. Every action can be undone |

### How the numbers connect

```
balance      = budget + income − spending − savings
free         = balance − bills still due this month
daily limit  = free ÷ days left (including today)
usual daily  = everyday spending so far ÷ days passed − habit savings
month end    = free − usual daily × remaining days
broke on day = first day free money runs out at the usual pace
health score = month-end (35) + pace vs limit (25) + saving (20) + subscriptions (10) + emergency fund (10)
```

## Architecture

```
src/
  config.ts                 Budget rules, categories, limits, presets
  main.tsx                  Entry: providers + StrictMode
  App.tsx                   Navigation, dialogs, cross-page flows
  domain/                   Pure TypeScript. No React, fully unit-tested
    types.ts                MonthState, Transaction, Bill, Decision, Snapshot…
    finance.ts              Snapshot, health score, bills, decisions, verdicts
    months.ts               Example month, fresh month, roll-over
    sanitize.ts             Input validation and sanitisation
    money.ts                INR formatting and maths helpers
  state/
    reducer.ts              Typed actions, re-validated payloads, undo history
    FinanceProvider.tsx     useReducer + persistence + memoised snapshot
    financeContext.ts       Context + useFinance hook
    storage.ts              Schema-validated localStorage
  components/
    layout/                 AppShell (sidebar / top bar / bottom tabs)
    dashboard/              Hero, HealthCard, MoneySplit, QuickWins, MonthCalendar…
    dialogs/                SpendDialog, ConfirmDialog
    ui/                     Modal (focus trap), Switch, Chip, Toasts, Icon, TransactionList
  pages/                    TodayPage, AffordPage, MoneyPage
```

Data flows one way: **UI event → `dispatch(action)` → pure reducer → `computeSnapshot` → render**. Components never compute money themselves; they read the shared snapshot.

## Code quality

- `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals/Parameters`, `verbatimModuleSyntax`.
- No `any` and no non-null assertions. Discriminated unions for actions and decisions.
- ESLint flat config: `typescript-eslint` strict + stylistic, `jsx-a11y` recommended, `react-hooks`, `react-refresh`. Run with `--max-warnings=0`.

## Security & data sanitisation

- **Input:** `sanitize.ts` strips control, zero-width and bidi-override characters and angle brackets, and caps text length. Amounts must be whole rupees ≤ ₹10,00,000. Days must be 1–30. Categories are allow-listed.
- **Validated twice:** the reducer re-validates every payload, so a bad value leaves state unchanged.
- **Output:** React escapes all text. There is no `dangerouslySetInnerHTML`, `eval` or `innerHTML` anywhere.
- **Storage:** data read from `localStorage` is parsed in `try/catch`, validated field by field, re-sanitised, and discarded if it doesn't match the schema.
- **Headers** (`vercel.json`): a strict CSP (`script-src 'self'`, `style-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`), HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and COOP.
- **Dependencies:** a small, well-known set with exact versions pinned. Fonts are self-hosted, so no third-party requests happen at runtime.

## Performance

- Fonts are self-hosted with `@fontsource` (no render-blocking third-party CSS). There is one CSS file and one JS bundle.
- The snapshot is memoised, and typing re-renders only what changed.
- Layout space is reserved and the hero is sized to its content, giving low CLS. Long-term caching is set for hashed assets.

## Accessibility

- Semantic landmarks, one `h1` per page and a skip link. After navigation, focus moves to the new page's heading.
- Every field is labelled. Errors use `aria-invalid` + `aria-describedby` / `role="alert"`, and focus moves to the first invalid field.
- Modal dialogs (`role="dialog"` / `alertdialog`, `aria-modal`): focus moves in, Tab is trapped, **Escape** closes, focus returns to the opener, and the background is inert.
- `role="switch"` + `aria-checked`, `aria-pressed` chips and `aria-current` navigation.
- Charts have text alternatives (`role="img"` labels, screen-reader text for each calendar day, `role="progressbar"`), and updates are announced through `aria-live`.
- Text meets WCAG AA contrast. Focus rings are visible everywhere, touch targets are at least 38–44px, and `prefers-reduced-motion` is respected.

## Testing

`npm test` runs Vitest with jsdom:

- `domain/finance.test.ts`: allowance, forecast, run-out day, health score, bills, every decision and verdict.
- `domain/sanitize.test.ts`: hostile and edge-case inputs.
- `state/state.test.ts`: every reducer action, invalid payloads, roll-over, undo, storage tampering and failures.
- `components/ui/ui.test.tsx`: Switch, Chip, and the Modal focus trap and Escape.
- `App.test.tsx`: integration flows (log a spend + undo, validation, Escape focus return, XSS as plain text, surprise expense, next day, "Can I afford it?", saving moves, subscription switch, add-bill errors, reset confirmation).
