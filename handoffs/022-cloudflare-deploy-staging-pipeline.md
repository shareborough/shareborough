# Handoff 022 — Cloudflare Deploy + Staging Pipeline

## What Was Done

### Test Fixes (Unblocked CI)
1. **borrow.test.ts (8 failures)** — `src/lib/borrow.ts:37`: Session 021's error handling change was too aggressive. "Unauthorized" and "Forbidden" errors were being re-thrown as domain errors instead of falling through to the CRUD fallback. Added them to the fallback list since these are expected auth failures in the public borrow flow (borrowers don't have accounts).

2. **CodeSplitting.test.tsx (1 failure)** — `tests/CodeSplitting.test.tsx:86-97`: Test was mocking `ayb.records.get` but `PublicLibrary.tsx` uses `ayb.records.list` to find libraries by slug. Changed mock to `records.list` with correct return shape `{ items: [...], totalItems: 1 }`.

### Cloudflare Deploy (Unblocked Production)
3. **GitHub Secrets**: Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_KEY`, `CLOUDFLARE_EMAIL` in `shareborough/shareborough` repo.
4. **Workflow Updates**: Changed `deploy.yml` + `staging.yml` to use `apiKey` + `email` auth (the account had a Global API Key, not a scoped API Token).

### Staging-First Deploy Pipeline
5. **Rewrote `sync-and-deploy.sh`**: New 9-step pipeline:
   - Sync → vitest → build → staging branch → Cloudflare deploys staging → EC2 E2E → if pass → promote to main → Cloudflare deploys prod → seed
   - Three modes: default (full), `--prod-only`, `--staging-only`
6. **New `run-staging-e2e-ec2.sh`**: Lightweight EC2 user-data script that only installs Node+Playwright and runs tests against a live URL (no AYB build/Go tests).
7. **New `playwright.config.staging.ts`**: Playwright config targeting `staging.shareborough.pages.dev`.

### Dev Repo Commit
8. **Committed sessions 016-022**: All work from sessions 016-021 plus session 022 fixes committed as `aa52423` on dev repo main.
9. **Pushed to public repo**: `5c1bad5` on `shareborough/shareborough` main.

## Key Files
| File | Purpose |
|------|---------|
| `scripts/sync-and-deploy.sh` | Main deploy pipeline (staging → E2E → prod) |
| `scripts/run-staging-e2e-ec2.sh` | EC2 staging E2E runner |
| `playwright.config.staging.ts` | Playwright config for staging URL |
| `src/lib/borrow.ts` | Fixed Unauthorized fallback |
| `tests/CodeSplitting.test.tsx` | Fixed mock |

## Checklists
- **Master checklist**: [docs/CHECKLIST.md](../docs/CHECKLIST.md)
- **Session 022 checklist**: [docs/SESSION-022-CHECKLIST.md](../docs/SESSION-022-CHECKLIST.md)

## Infrastructure
| Resource | Value |
|----------|-------|
| Cloudflare Account ID | `99deba6554f68cb3544bd9ecfd08ff06` |
| Pages Project | `shareborough` |
| Production URL | `shareborough.com` / `www.shareborough.com` |
| Staging URL | `staging.shareborough.pages.dev` |
| Production branch | `main` |
| Staging branch | `staging` |
| GitHub Secrets | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (scoped Pages Write) |
| S3 Staging E2E | `s3://ayb-ci-artifacts/staging-e2e/` |
| S3 Full E2E | `s3://ayb-ci-artifacts/e2e-runs/` |

## Deploy Commands
```bash
# Full pipeline: staging → E2E on EC2 → prod (if E2E pass)
./scripts/sync-and-deploy.sh "commit message"

# Staging only (no prod deploy)
./scripts/sync-and-deploy.sh "commit message" --staging-only

# Prod only (skip staging E2E — use for emergencies)
./scripts/sync-and-deploy.sh "commit message" --prod-only

# Full E2E suite on EC2 (AYB + Shareborough + Playwright)
./scripts/launch-ec2-tests.sh
```

## CI/CD Status — RESOLVED
- Deploy run `21961834956`: **SUCCESS** (Tests: 5m27s, Build & Deploy: 53s)
- Production live at `https://shareborough.com` (HTTP 200)
- Fixed 4 separate CI issues: test failures, vitest OOM, set-e exit handling, wrangler auth
- Vitest CI fix: `--pool=forks` + `timeout 300` + if/elif (set-e safe)

## What to Work on Next

### Immediate (verify staging pipeline)
1. **Test staging pipeline** — `./scripts/sync-and-deploy.sh "test staging" --staging-only`
2. **Run full pipeline** — `./scripts/sync-and-deploy.sh "full pipeline test"`
3. **Launch EC2 E2E tests** — `./scripts/launch-ec2-tests.sh` to run full suite

### Priority Queue (from master checklist)
1. **Accessibility audit** — WCAG 2.1 AA compliance pass
2. **React Router v7 upgrade** — full upgrade (future flags already enabled)
3. **Backend push notifications** — VAPID keys, subscription storage, sending
4. **Backend image resizing** — `?w=` query param in AYB storage handler
5. **Republish SDK** — proper type exports for `signInWithOAuth` + `deleteAccount`
6. **Staging CNAME** — optional `staging.shareborough.com` in Cloudflare DNS

### Known Issues
- Vitest hangs on exit (jsdom issue — fixed in CI with pool=forks + timeout)
- `@allyourbase/js@0.1.0` missing type exports (workaround in place)
- Some e2e tests skip without env vars (`MAILPAIL_DOMAIN`, etc.)
