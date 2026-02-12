# Handoff 015 — Repo Split & CI/CD Setup

## What Was Done

Shareborough was split out of `allyourbase_dev/examples/shareborough/` into its own dedicated repo structure:

```
/Users/stuart/repos/shareborough_root/
├── shareborough_dev/    (private) — full dev environment
│   ├── src/             — React source
│   ├── tests/           — unit tests (vitest)
│   ├── e2e/             — Playwright E2E tests
│   ├── docs/            — internal docs, session notes
│   ├── handoffs/        — handoff docs
│   ├── deploy/          — Dockerfile, docker-compose, Caddyfile, user-data.sh
│   ├── scripts/         — sync, deploy, EC2 test scripts
│   ├── .secret/         — PEM keys, AWS creds, env secrets
│   └── ...
│
├── shareborough/        (public) — clean, deployable code
│   ├── src/
│   ├── tests/
│   ├── e2e/
│   ├── public/
│   ├── worker/
│   ├── .github/workflows/   — CI/CD
│   └── ...
```

## GitHub Repos

| Repo | URL | Visibility |
|------|-----|------------|
| Dev | https://github.com/shareborough/shareborough_dev | Private |
| Public | https://github.com/shareborough/shareborough | Public |

## Scripts (in dev repo)

### `scripts/sync-and-deploy.sh` — Production Deploy
```bash
cd /Users/stuart/repos/shareborough_root/shareborough_dev
./scripts/sync-and-deploy.sh "Your commit message"
```
Does: sync files → run vitest → build check → commit to public repo → push to main → CI auto-deploys production

### `scripts/deploy-staging.sh` — Staging Deploy
```bash
cd /Users/stuart/repos/shareborough_root/shareborough_dev
./scripts/deploy-staging.sh "Your commit message"
```
Does: sync files → run vitest → push to `staging` branch on public repo → CI deploys to staging URL

### `scripts/sync-shareborough.sh` — Just Sync (no commit/push)
```bash
./scripts/sync-shareborough.sh
```
Does: rsync files from dev to public repo. No git operations.

## CI/CD Workflows (in public repo)

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `ci.yml` | Push to main/staging, PRs to main | TypeScript check, vitest, build |
| `deploy.yml` | Push to main, manual `workflow_dispatch` | Tests → build → deploy to Cloudflare Pages (production) |
| `staging.yml` | Push to staging branch | Tests → build → deploy to Cloudflare Pages (staging) |

### Manual Deploy via GitHub UI or CLI
```bash
# Deploy to staging via CLI
gh workflow run deploy.yml --repo shareborough/shareborough -f environment=staging

# Deploy to production (normally happens automatically on push to main)
gh workflow run deploy.yml --repo shareborough/shareborough -f environment=production

# Watch a run
gh run watch --repo shareborough/shareborough
```

## What Gets Synced to Public Repo

**Included:**
- `src/` — all React source code
- `tests/` — unit tests (excluding `helpers/` which needs mailslurp API key)
- `e2e/` — Playwright E2E tests (excluding `run-and-upload.sh` AWS script)
- `public/` — static assets, PWA manifest, service worker
- `worker/` — Cloudflare Worker code
- Root configs: `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `postcss.config.js`, `tailwind.config.js`, `playwright.config.ts`, `playwright.config.prod.ts`, `schema.sql`, `.env.production`, `README.md`

**Excluded (stays private):**
- `.secret/` — PEM keys, AWS credentials, env secrets
- `.env.local`, `.env.test` — local/test environment with API keys
- `ayb.toml` — has JWT secret, admin password
- `docs/`, `handoffs/`, `checklists/` — internal dev docs
- `SESSION-*.md` — session summaries
- `deploy/` — server deployment configs (Dockerfile, user-data.sh, etc.)
- `scripts/` — sync/deploy/EC2 scripts
- `.claude/`, `.vscode/` — editor configs

## TODO Before Fully Operational

1. **Fix TypeScript errors** — Republish `@allyourbase/js` with `signInWithOAuth` and `deleteAccount` types, or add `@ts-expect-error` annotations
2. **Connect Cloudflare Pages** — Set GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the public repo settings. Create a Cloudflare Pages project named `shareborough`.
3. **Configure staging subdomain** — Add `staging.shareborough.com` CNAME in Cloudflare DNS pointing to the Pages staging deployment
4. **Backend CI/CD** — The AYB backend on EC2 still deploys via the existing `deploy/user-data.sh` bootstrap. A separate backend deploy script could be added later if needed.
5. **Clean up allyourbase_dev** — Once confident, remove `examples/shareborough/` from the allyourbase_dev repo
