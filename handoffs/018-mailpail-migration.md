# Handoff 018 — Replace MailSlurp with Mailpail

**Date:** 2026-02-11
**Session checklist:** [docs/SESSION-018-CHECKLIST.md](../docs/SESSION-018-CHECKLIST.md)
**Master checklist:** [docs/CHECKLIST.md](../docs/CHECKLIST.md)

## What was done

Replaced MailSlurp (paid SaaS with rate limits and 426 errors) with **mailpail** (our own library — AWS SES inbound + S3). No more subscription, no rate limits, pay-per-use (~$0.10/1000 emails, $0 when idle).

### Changes

| File | Action |
|------|--------|
| `tests/helpers/mailpail.ts` | **New** — mailpail wrapper (isConfigured, createTestAddress, waitForTestEmail, extractEmailLinks, purgeTestEmails) |
| `tests/helpers/mailslurp.ts` | **Deleted** — old MailSlurp wrapper |
| `e2e/email-verification.spec.ts` | **Rewritten** — uses mailpail, `test.beforeEach` skip pattern, no more try/finally cleanup |
| `e2e/password-reset.spec.ts` | **Rewritten** — uses mailpail, same skip pattern |
| `package.json` | **Updated** — removed `mailslurp-client`, added `mailpail` (devDep from GitHub) |
| `.env.test` | **Updated** — `MAILPAIL_DOMAIN`, `MAILPAIL_BUCKET`, `MAILPAIL_PREFIX`, `MAILPAIL_REGION` |
| `scripts/run-integration-tests-ec2.sh` | **Updated** — exports mailpail env vars before Playwright |
| `scripts/sync-shareborough.sh` | **Updated** — comment fix |
| `docs/CHECKLIST.md` | **Updated** — mailpail env var reference |
| `docs/E2E-TEST-SUMMARY.md` | **Updated** — mailpail helper + test docs |

### Infrastructure setup

1. `mailpail setup --domain test.shareborough.com --bucket ayb-ci-artifacts --prefix e2e-emails/`
   - Created SES receipt rule (catches all `*@test.shareborough.com` → S3)
   - Added S3 bucket policy (SES PutObject permission)
2. DNS records in Cloudflare (`shareborough.com` zone `e49ef9b0373ba50318a2e7fb1d8868c9`):
   - MX: `test.shareborough.com` → `10 inbound-smtp.us-east-1.amazonaws.com`
   - TXT: `_amazonses.test.shareborough.com` → `brWeGeERUzLjeeFruMzZKc4FYKuAJpW+PeeMdDN1UDo=`
3. Domain verified via `mailpail status` — all 5 checks passed

### Test results

- **564 unit tests** — all passing, 0 failures
- EC2 e2e run launched: instance `i-0cadf887f77fb36e0`, results → `s3://ayb-ci-artifacts/e2e-runs/`

## How it works now

```
1. E2E test calls createTestAddress()
   → "test-a1b2c3d4e5f6g7h8@test.shareborough.com"

2. Test registers with that email, triggering backend to send verification/reset email

3. Email arrives at test.shareborough.com
   → MX record → SES inbound (us-east-1)
   → SES receipt rule → S3 (ayb-ci-artifacts/e2e-emails/)

4. Test calls waitForTestEmail(email, { subject: "verify" })
   → Polls S3 every 1s until matching email found
   → Parses raw MIME → ReceivedEmail object

5. Test calls extractEmailLinks(email)
   → Extracts all href links with HTML entity decoding
   → Test navigates to confirmation/reset link
```

## Config required

```bash
# Environment variables (set in .env.test and EC2 script)
MAILPAIL_DOMAIN=test.shareborough.com
MAILPAIL_BUCKET=ayb-ci-artifacts
MAILPAIL_PREFIX=e2e-emails/
MAILPAIL_REGION=us-east-1

# AWS credentials (IAM role on EC2, or env vars locally)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Key differences from MailSlurp

| | MailSlurp | Mailpail |
|---|---|---|
| **Cost** | $29/mo subscription | ~$0.10/1000 emails, $0 idle |
| **Rate limits** | Yes (426 errors) | No |
| **Inbox management** | Create → use → delete | Just generate address, no cleanup needed |
| **Dependency** | `mailslurp-client` (external SaaS) | `mailpail` (our library, AWS native) |
| **Skip condition** | `MAILSLURP_API_KEY` not set | `MAILPAIL_DOMAIN` / `MAILPAIL_BUCKET` not set |
| **EC2 auth** | API key env var | IAM role (already configured) |

## What's next

- Monitor EC2 test run results
- If email tests fail on EC2, check that AYB backend actually sends emails (SMTP config)
- Consider running `mailpail purge` in global-setup.ts to clean stale emails between runs
