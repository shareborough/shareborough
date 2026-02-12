# Session 017 — CI/CD Seed Integration, Test Coverage, Behavior Audit

## Completed

- [x] Integrate seed.ts into `sync-and-deploy.sh` — auto-seeds production after CI deploy completes
- [x] Integrate seed.ts into `run-integration-tests-ec2.sh` — seeds demo data before vitest + E2E
- [x] Update `sync-shareborough.sh` — include seed.ts in public repo sync
- [x] Update master checklist (`docs/CHECKLIST.md`) — current as of Session 017
- [x] Create session 017 checklist (this file)
- [x] Add barcode scanner integration tests to `AddItem.test.tsx`
- [x] Write dedicated barcode scanner E2E spec (`e2e/barcode-scanner.spec.ts`)
- [x] Audit BEHAVIORS.md test coverage matrix for accuracy
- [x] Verify all unit tests pass (vitest) — 564 tests, 0 failures
- [x] Launch EC2 test run — `i-01ace031c947ee1b2`, S3: `s3://ayb-ci-artifacts/e2e-runs/20260211-181406/`
- [x] Write session 017 handoff doc (`handoffs/017-cicd-seed-tests.md`)

## Seed Integration Summary

Seed data (`demo@shareborough.com` / `demo1234`) is now auto-created:

1. **Production deploy** (`sync-and-deploy.sh`):
   - Step 7: Waits for GitHub Actions CI/CD to complete
   - Step 8: Runs `seed.ts` against `https://api.shareborough.com`
   - Non-fatal if seed fails (e.g., backend not ready)

2. **EC2 test runner** (`run-integration-tests-ec2.sh`):
   - Phase 5b: Runs `seed.ts` against `http://localhost:8090` after schema applied
   - Seeds demo data before vitest and Playwright phases

3. **Public repo sync** (`sync-shareborough.sh`):
   - Now copies `scripts/seed.ts` to public repo

## Test Coverage Additions

- `AddItem.test.tsx`: 4 new tests for barcode scanner integration (button, click-to-show, loading state, close)
- `e2e/barcode-scanner.spec.ts`: 4 E2E tests for scanner UI flow on Add Item page
- Existing: `BarcodeScanner.test.tsx` (12 tests), `barcode.test.ts` (17 tests)

## Still TODO (carried forward)

- [ ] Fix 2 TS errors — `@allyourbase/js@0.1.0` missing `signInWithOAuth` + `deleteAccount` types
- [ ] Set Cloudflare secrets — `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in public repo settings
- [ ] Configure staging subdomain — `staging.shareborough.com` CNAME
- [ ] Clean up allyourbase_dev — remove original `examples/shareborough/`

## Key Files Changed

```
Modified:
  scripts/sync-and-deploy.sh           — Added Step 7 (wait for CI) + Step 8 (seed production)
  scripts/run-integration-tests-ec2.sh — Added Phase 5b (seed demo data)
  scripts/sync-shareborough.sh         — Added seed.ts to public repo sync
  docs/CHECKLIST.md                    — Updated master checklist to Session 017
  docs/BEHAVIORS.md                    — Updated test coverage matrix
  tests/AddItem.test.tsx               — Added barcode scanner integration tests

Created:
  docs/SESSION-017-CHECKLIST.md        — This file
  e2e/barcode-scanner.spec.ts          — Barcode scanner E2E tests
  handoffs/017-cicd-seed-tests.md      — Handoff doc for next session
```

## Reference

- Master checklist: `docs/CHECKLIST.md`
- Behaviors spec: `docs/BEHAVIORS.md`
- Previous session: `docs/SESSION-016-CHECKLIST.md`
- Handoff: `handoffs/017-cicd-seed-tests.md`
