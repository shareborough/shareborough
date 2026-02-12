# Handoff 021 — Mobile Fixes + Prod Testing

## What Happened
User tested on their phone (shareborough.com, logged in as m@m.m) and found:
1. "Something went wrong" error when interacting with items
2. Page required zooming out to fit the phone screen
3. "My Libraries" was inaccessible from public browse pages
4. Library creation/item add flow was hard to discover

## What Was Fixed

### 1. iOS Auto-Zoom (Root Cause of Viewport Issue)
**File**: `src/index.css`
- Changed `.input` class from `text-sm` (14px) to `text-base` (16px)
- iOS Safari auto-zooms when tapping inputs with font-size < 16px
- After login (tapping email/password fields), the zoom persisted, making the page too wide

### 2. Error Handling (Root Cause of "Something went wrong")
**Files**: `src/lib/errorMessages.ts`, `src/lib/borrow.ts`
- `friendlyError()` now passes through readable server messages instead of hiding them behind "Something went wrong"
- `borrow.ts` no longer silently catches RPC errors — specific domain errors (like "Item not found" or "Only the library owner can approve requests") now propagate to the user
- This will reveal the ACTUAL error next time someone tries to borrow/approve

### 3. Navigation for Logged-In Users on Public Pages
**Files**: `src/pages/PublicLibrary.tsx`, `src/pages/PublicItem.tsx`
- Added "My Libraries" link in the header of public pages when user is logged in
- Previously, there was NO way to navigate to dashboard from public browse pages

## Deployed
- Public repo: commit `73c578c` on main
- CI/CD deploying to Cloudflare Pages
- EC2 test instance: `i-0e319cf013237348e` (auto-terminates)

## What to Check Next
1. **Monitor EC2 results**: `aws s3 cp s3://ayb-ci-artifacts/e2e-runs/$(aws s3 ls s3://ayb-ci-artifacts/e2e-runs/ | tail -1 | awk '{print $2}')output.log -`
2. **Re-test on phone**: Open shareborough.com on phone, try the borrow flow again. Now you'll see the actual error message instead of generic "Something went wrong"
3. **If borrow still fails**: The error message will now tell you exactly what went wrong. Common causes:
   - RPC `request_borrow` function not found on backend (schema not applied?)
   - Auth/RLS issues with the SECURITY DEFINER functions
   - Backend API at api.shareborough.com returning unexpected errors

## Key Paths
- Session checklist: `docs/SESSION-021-CHECKLIST.md`
- Master checklist: `docs/CHECKLIST.md`
- Prod smoke test: `e2e/prod-smoke.spec.ts`
