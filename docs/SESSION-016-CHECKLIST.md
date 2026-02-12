# Session 016 — Cleanup, Seed Data, Test Audit

## Completed

- [x] Audit public repo for sensitive information (keys, secrets, credentials)
- [x] Rewrite README.md — removed stale monorepo references, internal doc tree, added seed data instructions
- [x] Create seed script (`scripts/seed.ts`) — demo user + 2 libraries + 8 items + pending borrow request
- [x] Audit sync-and-deploy.sh readiness
- [x] Remove broken/redundant e2e test (`full-user-journey-enhanced.spec.ts`)
- [x] Rewrite `photo-upload.spec.ts` — proper helpers, correct selectors
- [x] Rewrite `mobile-responsiveness.spec.ts` — proper helpers, correct selectors
- [x] Fix `items.spec.ts` delete test — use ConfirmDialog modal instead of native dialog
- [x] Fix `borrow-flow.spec.ts` return test — add missing ConfirmDialog confirmation step
- [x] Fix `golden-path.spec.ts` return test — use explicit dialog selector instead of `.last()`
- [x] Create test fixture image (`tests/fixtures/test-image.jpg`)
- [x] Write session checklist and handoff doc

## Public Repo Security Audit Result

**No secrets found.** All API keys/tokens use environment variables. Specifics:
- `TELNYX_API_KEY`, `TELNYX_PHONE_NUMBER` — env vars in worker/send-reminders.ts
- `MAILSLURP_API_KEY` — env var in e2e tests (auto-skips without it)
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` — GitHub secrets in workflows
- `.env.production` — only contains `VITE_AYB_URL=https://api.shareborough.com` (public URL, not secret)
- `ayb.toml` — NOT synced to public repo (stays in dev only)

## Known Issues

- `photo-cropper.spec.ts` — tests depend on `tests/fixtures/test-image.jpg` existing and being a real enough image for canvas rendering. Tests will `test.skip()` if fixture load fails.
- `email-verification.spec.ts` + `password-reset.spec.ts` — auto-skip without `MAILSLURP_API_KEY`
- `production-smoke.spec.ts` — hits `https://api.shareborough.com/health` (only works when prod is running)
- `comprehensive.spec.ts` tests OAuth buttons — will fail if OAuth providers aren't configured in AYB
- 2 TS errors from session 015 still open: `@allyourbase/js@0.1.0` missing `signInWithOAuth` and `deleteAccount` type exports
