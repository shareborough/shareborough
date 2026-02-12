# Session 022 Checklist — Cloudflare Deploy + Staging Pipeline

## Pre-Session State
- CI/CD broken: all 4 GitHub Actions runs failing (borrow.test.ts + CodeSplitting.test.tsx)
- No Cloudflare secrets configured in GitHub
- No staging deploy pipeline
- 6 sessions of uncommitted work in dev repo (016-021)

## Completed
- [x] **Fix borrow.test.ts (8 failures)**: Added "Unauthorized" and "Forbidden" to CRUD fallback list in `src/lib/borrow.ts:37`
- [x] **Fix CodeSplitting.test.tsx (1 failure)**: Changed mock from `records.get` to `records.list` with `{ items: [...], totalItems: 1 }`
- [x] **Get Cloudflare Account ID**: `99deba6554f68cb3544bd9ecfd08ff06` via API
- [x] **Create Cloudflare API Token**: Scoped Pages Write token via API (`shareborough-pages-deploy`)
- [x] **Set GitHub secrets**: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` in `shareborough/shareborough`
- [x] **Update deploy workflows**: `deploy.yml` + `staging.yml` use scoped `apiToken`
- [x] **Fix vitest CI OOM**: `--pool=forks` + `timeout 300` + if/elif for set-e safe exit code handling
- [x] **Redesign sync-and-deploy.sh**: Staging-first pipeline with EC2 E2E gate
- [x] **New scripts**: `run-staging-e2e-ec2.sh` (lightweight EC2 Playwright runner)
- [x] **New config**: `playwright.config.staging.ts` (targets staging.shareborough.pages.dev)
- [x] **Commit dev repo**: All sessions 016-022 committed (`aa52423`)
- [x] **Push to public repo**: Multiple commits fixing CI, deploy auth, vitest
- [x] **CI passes**: Both CI and Deploy workflows green (run `21961834956`)
- [x] **Cloudflare deploy succeeds**: Build & Deploy in 53s
- [x] **Production is live**: `https://shareborough.com` returns HTTP 200

## CI/CD Run History (Session 022)
| Run | Status | Issue | Fix |
|-----|--------|-------|-----|
| `21960095905` | Failed | borrow.test.ts + CodeSplitting.test.tsx + vitest OOM | Fixed tests |
| `21961166472` | Failed | vitest OOM (timeout 300 but OOM at 108s) | Need pool=forks |
| `21961317777` | Failed | `set -e` kills script before exit code check | Need if/elif |
| `21961567608` | Failed | Wrangler v3 needs API Token, not API Key | Created scoped token |
| **`21961834956`** | **Success** | — | All fixes applied |

## Files Changed (Session 022)
- `src/lib/borrow.ts` — Unauthorized/Forbidden → CRUD fallback
- `tests/CodeSplitting.test.tsx` — Fix mock (records.list)
- `.github/workflows/deploy.yml` — apiToken + vitest timeout fix (public repo)
- `.github/workflows/staging.yml` — apiToken + vitest timeout fix (public repo)
- `.github/workflows/ci.yml` — vitest timeout fix (public repo)
- `scripts/sync-and-deploy.sh` — Staging-first deploy pipeline
- `scripts/run-staging-e2e-ec2.sh` — NEW: EC2 staging E2E runner
- `scripts/sync-shareborough.sh` — Add staging config to sync list
- `playwright.config.staging.ts` — NEW: Staging Playwright config

## Deploy Pipeline (New)
```
sync-and-deploy.sh "message"
  ├── Step 1: Sync dev → public
  ├── Step 2: Run vitest (local)
  ├── Step 3: Build check
  ├── Step 4: Commit to staging branch
  ├── Step 5: Push staging → Cloudflare deploys staging.shareborough.pages.dev
  ├── Step 6: Launch EC2 → Playwright against live staging
  ├── Step 7: Poll S3 for E2E results
  ├── Step 8: If pass → merge staging → main → Cloudflare deploys shareborough.com
  └── Step 9: Seed production data
```

## GitHub Secrets (shareborough/shareborough)
- `CLOUDFLARE_ACCOUNT_ID` = `99deba6554f68cb3544bd9ecfd08ff06`
- `CLOUDFLARE_API_TOKEN` = scoped Pages Write token (created via API)
- `CLOUDFLARE_API_KEY` = Global API Key (legacy, not used by wrangler)
- `CLOUDFLARE_EMAIL` = `stuart.clifford@gmail.com` (legacy, not used by wrangler)

## Cloudflare Pages Project
- Project: `shareborough`
- Production URL: `shareborough.com` / `www.shareborough.com`
- Pages dev URL: `shareborough.pages.dev`
- Staging URL: `staging.shareborough.pages.dev` (preview branch)
