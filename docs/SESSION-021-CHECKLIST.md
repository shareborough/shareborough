# Session 021 Checklist — Mobile Fixes + Prod Testing

## Issues Reported (user testing on phone, shareborough.com)
- [x] "Something went wrong" error when trying to borrow/approve items
- [x] Page doesn't fit phone screen after login (needs zoom out)
- [x] "My Libraries" link not accessible from public pages
- [x] Can't find how to create library / add items (navigation gap)

## Fixes Applied
- [x] **iOS auto-zoom fix**: Changed `.input` CSS from `text-sm` (14px) to `text-base` (16px) — prevents Safari auto-zoom on form focus
- [x] **Error handling**: `friendlyError()` now shows actual server error messages instead of generic "Something went wrong" for readable messages
- [x] **Borrow flow errors**: `borrow.ts` no longer silently swallows RPC errors — propagates specific domain errors (e.g., "Item not found", "Only the library owner can approve requests")
- [x] **Navigation**: Added "My Libraries" link on `PublicLibrary` and `PublicItem` pages for logged-in users
- [x] Updated 8 test assertions across 6 files to match new error message passthrough behavior
- [x] Added `isLoggedIn` to `PublicItem.test.tsx` and `PublicLibrary.test.tsx` mocks

## Tests
- [x] All unit tests pass (191+ across 13 test files verified)
- [x] TypeScript clean (`tsc --noEmit` passes)
- [x] Build succeeds in public repo
- [x] Wrote `e2e/prod-smoke.spec.ts` — tests against live shareborough.com

## Deployment
- [x] Synced to public repo
- [x] Pushed to GitHub (`73c578c`)
- [x] CI/CD deploying to Cloudflare Pages
- [x] Launched EC2 e2e test instance: `i-0e319cf013237348e` at `34.203.245.136`

## Files Changed
- `src/index.css` — input font-size: text-sm → text-base
- `src/lib/errorMessages.ts` — pass through readable error messages
- `src/lib/borrow.ts` — don't silently swallow RPC errors
- `src/pages/PublicLibrary.tsx` — add "My Libraries" link for logged-in users
- `src/pages/PublicItem.tsx` — add "My Libraries" link for logged-in users
- `tests/AuthPage.test.tsx` — update error assertion
- `tests/AddItem.test.tsx` — update error assertion
- `tests/AddFacet.test.tsx` — update 2 error assertions
- `tests/PublicItem.test.tsx` — update error assertion + add isLoggedIn mock
- `tests/PublicLibrary.test.tsx` — add isLoggedIn mock
- `tests/CreateLibrary.test.tsx` — update error assertion
- `tests/oauth-e2e.test.tsx` — update 3 error assertions
- `e2e/prod-smoke.spec.ts` — NEW: prod smoke tests (10 tests)

## Next Steps
- Monitor EC2 test results: `aws s3 cp s3://ayb-ci-artifacts/e2e-runs/$(aws s3 ls s3://ayb-ci-artifacts/e2e-runs/ | tail -1 | awk '{print $2}')output.log -`
- Check actual error message on production borrow flow after deploy
- If borrow RPC still fails, investigate backend `request_borrow` function
- Run prod smoke test from EC2 against deployed fixes
