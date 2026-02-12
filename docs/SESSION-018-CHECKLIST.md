# Session 018 Checklist — Replace MailSlurp with Mailpail

## Goal
Replace MailSlurp (paid SaaS, rate-limited) with mailpail (AWS SES inbound + S3, pay-per-use) for all email-based e2e tests.

## Tasks

- [x] Install mailpail from GitHub (`AllyourbaseHQ/mailpail`) as devDependency
- [x] Remove `mailslurp-client` dependency
- [x] Create `tests/helpers/mailpail.ts` — new email helper wrapping mailpail API
- [x] Delete `tests/helpers/mailslurp.ts` — old MailSlurp helper
- [x] Rewrite `e2e/email-verification.spec.ts` to use mailpail (3 tests)
- [x] Rewrite `e2e/password-reset.spec.ts` to use mailpail (4 tests)
- [x] Update `.env.test` — replace `MAILSLURP_API_KEY` with `MAILPAIL_DOMAIN` / `MAILPAIL_BUCKET` / `MAILPAIL_PREFIX` / `MAILPAIL_REGION`
- [x] Update `scripts/run-integration-tests-ec2.sh` — export mailpail env vars for EC2 e2e
- [x] Update `scripts/sync-shareborough.sh` — update exclusion comment
- [x] Run `mailpail setup` for `test.shareborough.com` (SES receipt rule, S3 bucket policy)
- [x] Add DNS records in Cloudflare (MX + TXT for `test.shareborough.com`)
- [x] Verify domain via `mailpail status` — all checks passed
- [x] Update `docs/CHECKLIST.md` — mailpail env var reference
- [x] Update `docs/E2E-TEST-SUMMARY.md` — mailpail helper + test docs
- [x] Run unit tests — 564 tests passing, 0 failures
- [x] Launch EC2 e2e test run — instance `i-0cadf887f77fb36e0`
- [x] Create session checklist and handoff doc

## DNS Records Added (Cloudflare)

| Type | Name | Value |
|------|------|-------|
| MX | `test.shareborough.com` | `10 inbound-smtp.us-east-1.amazonaws.com` |
| TXT | `_amazonses.test.shareborough.com` | `brWeGeERUzLjeeFruMzZKc4FYKuAJpW+PeeMdDN1UDo=` |

## EC2 Test Run

- Instance: `i-0cadf887f77fb36e0`
- IP: `50.17.135.162`
- Results: `s3://ayb-ci-artifacts/e2e-runs/`
- Monitor: `./scripts/monitor-ec2-tests.sh i-0cadf887f77fb36e0`
