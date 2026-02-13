# Session 026 Checklist — Fix E2E Failures & App Bugs

## Goal
Fix all E2E test failures from Session 025 staging run. Fix real app bugs found during analysis. Get the web app working as intended.

## App Bug Fixes

### Notifications.tsx — Approve doesn't update UI
- [x] `handleApprove`: After approving a request, add the returned loan to `loans` state so "Currently Borrowed" section appears immediately
- [x] `handleRealtime`: Add "create" event handling for loans (currently only handles "update")

## E2E Test Fixes

### comprehensive.spec.ts
- [x] Golden path (11.1): Navigate to `/dashboard/notifications` instead of `/dashboard` for approve step
- [x] Settings save test: Add heading wait after reload + increased timeout for value assertion

### borrow-flow.spec.ts
- [x] Decline test: Add ConfirmDialog confirmation step (was clicking Decline but not confirming in modal)

### smoke-crud.spec.ts
- [x] Notification bell test: Make resilient to stale test data (check for either "All caught up!" or "View all notifications")

### golden-path.spec.ts
- [x] Settings test: Fix `getByLabelText` → `getByLabel` (Playwright API doesn't have `getByLabelText`)

### dark-mode.spec.ts
- [x] Persistence across navigation: Replace `waitForLoadState("networkidle")` with Settings heading wait
- [x] Persistence across reload: Replace `waitForLoadState("networkidle")` with Dashboard heading wait

## Verification
- [x] Run Notifications unit tests — 17 passing
- [x] Run Dashboard unit tests — 11 passing
- [x] TypeScript check — `tsc --noEmit` passes clean
- [x] Update master checklist — updated to Session 026
- [x] Create handoff document
