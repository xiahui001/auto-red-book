# Backend Baseline

This project treats the backend baseline as the guardrail for collector, draft, publish, auth, workflow, and API route behavior.

Run this before and after backend changes:

```bash
npm run test:backend-baseline
```

Run the full release gate before shipping:

```bash
npm run regression
```

Protected surfaces:

- ActivityWang collection, quota fallback, local image pool, dedupe, and usability rules.
- Draft generation, image assignment, image usage history, and draft storage routes.
- Mobile publish package creation, retrieval, QR support, public origin rules, and share payload behavior.
- Auth session refresh, Supabase server helpers, scraping handshake, recovery actions, and workflow retry/progress rules.
- Keyword, workspace, content-domain, and run-config business rules under `src/lib`.

Future-change rule:

- If a change touches `src/lib/**` or `src/app/api/**`, run `npm run test:backend-baseline` before continuing.
- Do not weaken assertions to preserve a broken baseline. Fix the behavior or update the baseline only when the intended product rule has changed.
- Suggested checkpoint tag after a clean release: `baseline-2026-05-29-tested`.
