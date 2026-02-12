# Handoff 023 — Notifications UI, Camera Fix, Smoke Tests

## What Changed

### 1. Notifications Page (NEW)
- **File**: `src/pages/Notifications.tsx`
- Pending borrow requests with Approve/Decline buttons
- Overdue loans highlighted in red
- Active loans with Mark Returned button
- Realtime updates via SSE
- Route: `/dashboard/notifications`

### 2. Dashboard Cleanup
- **File**: `src/pages/Dashboard.tsx`
- Removed inline "Pending Requests" section (was cluttering the dashboard)
- Kept "Currently Borrowed" section (operational, not notification)
- Removed `BorrowRequest` state, `handleApprove`, `handleDecline`, `scheduleReminders` import
- Dashboard now fetches 4 API calls instead of 5 (no more borrow_requests)

### 3. NotificationBell Updated
- **File**: `src/components/NotificationBell.tsx`
- Dropdown items now link to `/dashboard/notifications` instead of `/dashboard`
- "View all" link updated to "View all notifications"

### 4. Camera Fix
- **Files**: `src/pages/AddItem.tsx`, `src/pages/EditItem.tsx`
- Changed `capture` → `capture="environment"` on camera file inputs
- Explicitly requests rear camera on iOS Safari (fixes blank viewfinder)

### 5. Delete Library
- **File**: `src/pages/LibraryDetail.tsx`
- Added "Delete Library" button in header (red text, subtle)
- Deletes all items first (FK constraint handling), then deletes library
- Navigates to dashboard on success
- Uses existing ConfirmDialog for confirmation

### 6. Smoke Tests Updated
- **Files**: `e2e/smoke-crud.spec.ts`, `e2e/prod-smoke.spec.ts`
- Both now include library deletion as final step
- Full lifecycle: register → create library → add item → edit item → delete item → delete library

### 7. Dashboard Unit Tests
- **File**: `tests/Dashboard.test.tsx`
- Removed approve/decline tests (now on Notifications page)
- Updated mock setup functions (4 API calls instead of 5)
- 8 tests passing

## Files Changed
```
src/pages/Notifications.tsx        (NEW)
src/pages/Dashboard.tsx            (rewritten — removed pending requests)
src/pages/LibraryDetail.tsx        (added deleteLibrary)
src/pages/AddItem.tsx              (capture="environment")
src/pages/EditItem.tsx             (capture="environment")
src/components/NotificationBell.tsx (links → /dashboard/notifications)
src/App.tsx                        (added Notifications route)
e2e/smoke-crud.spec.ts             (added library deletion)
e2e/prod-smoke.spec.ts             (added library deletion)
tests/Dashboard.test.tsx           (updated for new Dashboard)
```

## Build Status
- TypeScript: CLEAN (`npx tsc --noEmit` — no errors)
- Vite build: PASSES (2.73s)
- Dashboard unit tests: 8/8 passing
- **NOT YET DEPLOYED** — needs `./scripts/sync-and-deploy.sh`

## What's Next
1. Deploy: `./scripts/sync-and-deploy.sh "Session 023: notifications, camera fix, smoke tests"`
   - Or `--staging-only` first to verify, then `--prod-only`
2. Verify camera fix on real iPhone against staging
3. EC2 E2E tests (deploy pipeline handles this, or run `./scripts/launch-ec2-tests.sh`)

## Key Docs
- Session checklist: `docs/SESSION-023-CHECKLIST.md`
- Master checklist: `docs/CHECKLIST.md`
- Behavior spec: `docs/BEHAVIORS.md`

## Seed Data Status
- Already clean — no pre-loaded items/collections
- Passwords already single letters: `m@m.m`/`m`, `n@n.n`/`n`, `q@q.q`/`q`
- This was done in a prior session (Session 020)

## Live URLs (not yet updated with this session's changes)
- Production: https://shareborough.com
- Staging: https://staging.shareborough.pages.dev
