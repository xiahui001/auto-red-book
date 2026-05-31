# Project Rules

## Baseline Regression Gate

The current stable product surface is protected by `npm run test:baseline`.

Protected behavior includes ActivityWang collection, draft generation and persistence, matrix auth state, hosted login, account auth JSON handling, mobile publish package creation, mobile image downloads, scraping recovery, and unattended workflow behavior.

Run `npm run test:baseline` before and after changes that touch protected behavior. Before pushing a broad or release-bound change, also run `npm run build`; for full release confidence, run `npm run regression`.

Do not remove tests from `test:baseline` unless an equivalent user-observable regression check replaces them in the same change.

Suggested checkpoint tag after a verified push: `baseline-2026-05-31-tested`.
