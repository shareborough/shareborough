# Session 017 — CI/CD Seed Integration, Test Coverage, Behavior Audit

## What Was Done

### 1. Seed Data Auto-Integrated into CI/CD

The user requested that seed data (demo user, libraries, items) be automatically available without manual steps. Implemented in 3 places:

**sync-and-deploy.sh** (production deploy):
- Added Step 7: Waits for GitHub Actions CI/CD to complete (`gh run watch --exit-status`)
- Added Step 8: Runs `seed.ts` against `https://api.shareborough.com`
- Non-fatal if seed fails (backend might not be ready yet)
- Full flow: sync → test → build → push → wait for CI → seed production

**run-integration-tests-ec2.sh** (EC2 test runner):
- Added Phase 5b: Runs `seed.ts` against `http://localhost:8090` after AYB schema is applied
- Seeds demo data before vitest and Playwright E2E phases
- Non-fatal if seed fails (tests still run)

**sync-shareborough.sh** (public repo sync):
- Now copies `scripts/seed.ts` to public repo

Seed creates:
- Demo user: `demo@shareborough.com` / `demo1234`
- "Neighborhood Tools" library (5 items) + "Book Club" library (3 items)
- Custom facets, pending borrow request from "Jane Neighbor"
- Idempotent — safe to run multiple times

### 2. Master Checklist Updated

Updated `docs/CHECKLIST.md` to reflect current state (was stale at Session 012):
- Added Phase 8 items: CI/CD, EC2 test infrastructure, S3 artifacts, auto-seed
- Added Phase 9: SDK & Upstream (TS errors, allyourbase cleanup)
- Updated priority queue with current priorities
- Current status section reflects Session 017

### 3. Barcode Scanner Test Coverage

Added thorough test coverage for the barcode scanner feature:

**Unit tests (existing, verified passing):**
- `tests/BarcodeScanner.test.tsx` — 14 tests (Quagga2 component, camera errors, detection, cleanup)
- `tests/barcode.test.ts` — 17 tests (ISBN detection, Open Library API lookup, formatBarcodeResult)

**Integration tests (NEW):**
- `tests/AddItem.test.tsx` — 4 new tests:
  - Scan button renders
  - Scanner component shows on click
  - ISBN detection fills name/description fields with loading state
  - Cancel closes scanner

**E2E tests (NEW):**
- `e2e/barcode-scanner.spec.ts` — 4 tests:
  - Scan button visible on Add Item form
  - Click activates scanner UI
  - Error state shows close button (headless = no camera)
  - Form fields retain values after scanner interaction

Total barcode coverage: 39 tests (14 component + 17 utility + 4 integration + 4 e2e)

### 4. BEHAVIORS.md Updated

- Updated test coverage matrix to reflect new barcode scanner tests
- Added mobile-responsiveness.spec.ts reference

### 5. E2E Audit Against BEHAVIORS.md

Comprehensive audit performed. Key findings:

**Well-covered areas:**
- Authentication (registration, login, logout, session persistence)
- Library CRUD, Item CRUD, Public Browse, Borrow Flow
- Golden Path end-to-end journey
- Mobile responsiveness, navigation

**Known E2E limitations (covered by unit tests instead):**
- OAuth popups (can't test in headless Playwright)
- Service workers, push notifications, code splitting
- Offline banner (requires network simulation)
- Session expiry 401 handling

**Not false positives (verified):**
- `data-testid="stat-lent"` / `data-testid="stat-friends"` DO exist in Dashboard.tsx
- `oauth-e2e.test.tsx` is correctly a vitest file (component-level), not Playwright

### 6. EC2 Test Run Launched

- Instance: `i-01ace031c947ee1b2` (t3.medium, us-east-1)
- IP: `54.89.175.68`
- Run ID: `20260211-181406`
- Auto-terminates after tests or 2 hours

**S3 Results:**
- Output log: `s3://ayb-ci-artifacts/e2e-runs/20260211-181406/output.log`
- Playwright report: `s3://ayb-ci-artifacts/e2e-runs/20260211-181406/playwright-report/`
- Summary JSON: `s3://ayb-ci-artifacts/e2e-runs/20260211-181406/summary.json`

**Monitor:**
```bash
# Watch live output
aws s3 cp s3://ayb-ci-artifacts/e2e-runs/20260211-181406/output.log -

# Check summary
aws s3 cp s3://ayb-ci-artifacts/e2e-runs/20260211-181406/summary.json -
```

## Deploy Workflow

```bash
# Full deploy (sync → test → build → push → CI → seed)
./scripts/sync-and-deploy.sh "What changed"

# Run E2E on EC2
./scripts/launch-ec2-tests.sh

# Staging deploy
./scripts/deploy-staging.sh "Testing something"
```

## Still TODO (carried forward)

1. **Fix 2 TS errors** — `@allyourbase/js@0.1.0` missing `signInWithOAuth` + `deleteAccount` types
2. **Set Cloudflare secrets** — `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in public repo GitHub settings
3. **Configure staging subdomain** — `staging.shareborough.com` CNAME in Cloudflare DNS
4. **Clean up allyourbase_dev** — remove original `examples/shareborough/`

## Key File Paths

| File | Purpose |
|------|---------|
| `docs/CHECKLIST.md` | Master long-running checklist (all phases) |
| `docs/SESSION-017-CHECKLIST.md` | This session's checklist |
| `docs/BEHAVIORS.md` | Behavior spec + test coverage matrix |
| `handoffs/017-cicd-seed-tests.md` | This handoff doc |
| `scripts/sync-and-deploy.sh` | Deploy pipeline (now includes seed) |
| `scripts/run-integration-tests-ec2.sh` | EC2 test runner (now includes seed) |
| `scripts/seed.ts` | Seed script (idempotent) |
| `e2e/barcode-scanner.spec.ts` | New barcode e2e tests |
| `tests/AddItem.test.tsx` | Updated with barcode integration tests |

## Files Changed This Session

```
Modified:
  scripts/sync-and-deploy.sh           — Step 7 (wait CI) + Step 8 (seed production)
  scripts/run-integration-tests-ec2.sh — Phase 5b (seed demo data)
  scripts/sync-shareborough.sh         — Include seed.ts in public repo sync
  docs/CHECKLIST.md                    — Updated master checklist to Session 017
  docs/BEHAVIORS.md                    — Updated test coverage matrix
  tests/AddItem.test.tsx               — 4 new barcode scanner integration tests

Created:
  docs/SESSION-017-CHECKLIST.md        — Session checklist
  e2e/barcode-scanner.spec.ts          — Barcode scanner E2E tests (4 tests)
  handoffs/017-cicd-seed-tests.md      — This handoff doc
```

## Test Counts

| Suite | Tests | Status |
|-------|-------|--------|
| Vitest (unit + component) | 564 | All passing |
| Barcode scanner (component) | 14 | Passing |
| Barcode utilities (unit) | 17 | Passing |
| AddItem integration | 25 (4 new) | Passing |
| E2E barcode-scanner.spec.ts | 4 | New, runs on EC2 |
| E2E total (all specs) | ~110 | Runs on EC2 |

## Next Session Priorities

1. Check EC2 test results from S3 (`20260211-181406`)
2. Fix any test failures from EC2 run
3. Fix SDK TS errors (`signInWithOAuth` + `deleteAccount` types)
4. Set Cloudflare secrets for automated deployment
5. Configure staging subdomain
