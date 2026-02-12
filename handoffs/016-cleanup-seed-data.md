# Session 016 — Cleanup, Seed Data, E2E Test Audit

## What Was Done

### 1. Public Repo Security Audit
Audited all 173 files in `shareborough/shareborough` for secrets. **Clean.** No API keys, tokens, or credentials exposed. All sensitive values use environment variables. The only file worth noting is `.env.production` which contains the public API URL (not a secret).

### 2. README Rewrite
Replaced the stale monorepo-era README with an accurate standalone version:
- Removed `cd examples/shareborough` and `go run ../../cmd/ayb start` references
- Removed internal `docs/` directory tree that doesn't exist in public repo
- Removed project structure section (was leaking internal architecture)
- Added seed data instructions
- Added test commands section

### 3. Seed Data Script
Created `scripts/seed.ts` — run with `npx tsx scripts/seed.ts`.

Creates:
- **Demo user:** `demo@shareborough.com` / `demo1234`
- **Neighborhood Tools** library (5 items: drill, circular saw, pressure washer, jigsaw, ladder)
- **Book Club** library (3 items: Educated, Project Hail Mary, Atomic Habits)
- Custom facets (Battery, Genre) with values
- A pending borrow request from "Jane Neighbor" for the drill

Safe to run multiple times — checks for existing data before inserting.

### 4. E2E Test Cleanup

**Removed:**
- `full-user-journey-enhanced.spec.ts` — 100% redundant with `golden-path.spec.ts` + `comprehensive.spec.ts`, used wrong selectors that would fail

**Rewritten (using proper helpers + selectors):**
- `photo-upload.spec.ts` — was using raw CSS selectors and wrong auth flow
- `mobile-responsiveness.spec.ts` — was using timestamp emails (not cleaned by global-setup) and raw CSS selectors

**Fixed bugs:**
- `items.spec.ts` — delete test used `page.on("dialog")` (native browser dialog) but app uses `ConfirmDialog` component. Fixed to use `page.getByRole("dialog")`
- `borrow-flow.spec.ts` — return test was missing ConfirmDialog confirmation step entirely. The `Mark Returned` button opens a modal that needs to be confirmed
- `golden-path.spec.ts` — return test used fragile `.last()` selector to find confirm button. Fixed to use explicit `page.getByRole("dialog")` scoping

**Created:**
- `tests/fixtures/test-image.jpg` — test fixture for photo-cropper e2e tests

### 5. Sync Script Audit
`sync-and-deploy.sh` is ready to use. Flow:
1. Syncs files from dev → public via `sync-shareborough.sh`
2. Checks for changes in public repo
3. Runs vitest in dev repo
4. Runs build check in public repo
5. Commits and pushes to main
6. CI/CD auto-deploys

No changes needed. The script is solid.

## E2E Test Coverage Summary

| File | Tests | Status |
|------|-------|--------|
| auth.spec.ts | 8 | Solid — uses helpers |
| library.spec.ts | 7 | Solid — uses helpers |
| items.spec.ts | 5 | Fixed — ConfirmDialog |
| borrow-flow.spec.ts | 6 | Fixed — ConfirmDialog |
| public.spec.ts | 4 | Solid — uses helpers |
| golden-path.spec.ts | 7 | Fixed — dialog selector |
| comprehensive.spec.ts | ~40 | Solid — thorough coverage |
| photo-upload.spec.ts | 5 | Rewritten — uses helpers |
| photo-cropper.spec.ts | 7 | Skips without fixture |
| mobile-responsiveness.spec.ts | 5 | Rewritten — uses helpers |
| email-verification.spec.ts | 3 | Skips without MailSlurp |
| password-reset.spec.ts | 4 | Skips without MailSlurp |
| production-smoke.spec.ts | 5 | Runs against prod |

**Total: ~106 e2e tests** (some skip based on environment)

## Deploy Workflow

From dev repo:
```bash
# Production deploy
./scripts/sync-and-deploy.sh "What changed"

# Staging deploy
./scripts/deploy-staging.sh "Testing something"

# Just seed local data
npx tsx scripts/seed.ts
```

## Still TODO (from session 015)

1. **Fix 2 TS errors** — `@allyourbase/js@0.1.0` missing `signInWithOAuth` and `deleteAccount` type exports. Republish SDK or add `@ts-expect-error`.
2. **Set Cloudflare secrets** — `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in public repo GitHub settings.
3. **Configure staging subdomain** — `staging.shareborough.com` CNAME in Cloudflare DNS.
4. **Clean up allyourbase_dev** — Remove original `examples/shareborough/`.

## File Changes This Session

```
Modified:
  README.md                              — Rewritten for standalone repo
  package.json                           — No changes (seed uses npx tsx)
  e2e/items.spec.ts                      — Fixed delete test (ConfirmDialog)
  e2e/borrow-flow.spec.ts               — Fixed return test (ConfirmDialog)
  e2e/golden-path.spec.ts               — Fixed return test (dialog selector)
  e2e/photo-upload.spec.ts              — Rewritten with helpers
  e2e/mobile-responsiveness.spec.ts     — Rewritten with helpers

Created:
  scripts/seed.ts                        — Demo user + sample data
  tests/fixtures/test-image.jpg          — Test fixture for photo tests
  docs/SESSION-016-CHECKLIST.md          — This session's checklist
  handoffs/016-cleanup-seed-data.md      — This handoff doc

Removed:
  e2e/full-user-journey-enhanced.spec.ts — Redundant, broken selectors
```
