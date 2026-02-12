# Session 015 — Repo Split & CI/CD Setup

## Checklist

- [x] Create `/Users/stuart/repos/shareborough_root/` directory structure
- [x] Copy shareborough from allyourbase_dev into shareborough_dev
- [x] Copy deploy configs (Dockerfile, docker-compose, Caddyfile, user-data.sh)
- [x] Copy EC2 test scripts (launch, run, monitor)
- [x] Create GitHub repo: `shareborough/shareborough_dev` (private)
- [x] Create GitHub repo: `shareborough/shareborough` (public)
- [x] Init shareborough_dev git repo with .gitignore, commit, push
- [x] Write `scripts/sync-shareborough.sh` — file sync from dev to public
- [x] Write `scripts/sync-and-deploy.sh` — full workflow: sync, test, commit, push to main
- [x] Write `scripts/deploy-staging.sh` — sync, test, push to staging branch
- [x] Write `.github/workflows/ci.yml` — unit tests + build on push/PR
- [x] Write `.github/workflows/deploy.yml` — auto-deploy on push to main + manual workflow_dispatch
- [x] Write `.github/workflows/staging.yml` — auto-deploy staging branch
- [x] Run initial sync to populate public repo
- [x] Init public repo, commit, push to GitHub
- [x] Verify CI triggered on public repo push (confirmed: CI + Deploy both triggered)
- [x] Commit deploy scripts to dev repo and push
- [x] Write session checklist and handoff doc

## Known Issues (for next session)

1. **TypeScript errors in CI** — `@allyourbase/js@0.1.0` on npm doesn't export `signInWithOAuth` or `deleteAccount` in its type definitions. The SDK needs to be republished with updated types, or those usages need `@ts-expect-error` annotations.

2. **Cloudflare Pages not connected yet** — The deploy workflow uses `cloudflare/wrangler-action` but needs:
   - `CLOUDFLARE_API_TOKEN` secret set in GitHub repo settings
   - `CLOUDFLARE_ACCOUNT_ID` secret set in GitHub repo settings
   - A Cloudflare Pages project named `shareborough` created via Cloudflare dashboard

3. **Staging subdomain** — Need to configure `staging.shareborough.com` in Cloudflare DNS pointing to the Pages staging deployment.

4. **Original shareborough still in allyourbase_dev** — The original `examples/shareborough/` directory in `allyourbase_dev` is still there. Can be removed once you're confident the new setup works.
