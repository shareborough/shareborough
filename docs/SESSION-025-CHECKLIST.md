# Session 025 Checklist — Test Quality Fixes, New Component Coverage, E2E Fixes

## Goal
Fix all remaining test audit issues from Session 020. Add full test coverage for new components (Notifications, EditItem). Fix E2E failures found in EC2 staging run. Update BEHAVIORS.md.

## EC2 E2E Results (from Session 024 run: 20260212-233055)
- **100 passing** tests
- **~20 unique failures** across:
  - `golden-path.spec.ts` — 3 tests failing (full journey, settings, stats)
  - `borrow-flow.spec.ts` — 3 tests failing (approve, decline, lifecycle)
  - `comprehensive.spec.ts` — 6 tests failing (account deletion, pending requests, loans, settings save, golden path)
  - `dark-mode.spec.ts` — 2 tests failing (persistence across nav + reload)
  - `email-verification.spec.ts` — 2 tests (email timing, expected with Mailpail)
  - `password-reset.spec.ts` — 3 tests (email timing, expected with Mailpail)
  - `mobile-responsiveness.spec.ts` — 1 flaky test (passes on retry)
  - `smoke-crud.spec.ts` — 2 tests (notification bell sees stale test data)
- S3: `s3://ayb-ci-artifacts/staging-e2e/20260212-233055/output.log`

## Fix Remaining Test Audit Issues (from Session 020)

### False Positives
- [x] `Dashboard.test.tsx` — skeleton loading test now asserts `.skeleton-shimmer` elements exist
- [x] `LibraryDetail.test.tsx` — skeleton test now asserts `.skeleton-shimmer` elements exist

### Critical Missing Unit Test Coverage
- [x] `AddItem.test.tsx` — added scanLoading test: disabled button + "Looking up barcode..." text
- [x] `Settings.test.tsx` — added Theme section test (Light/Dark/System buttons)
- [x] `Settings.test.tsx` — added save success toast test ("Settings saved")
- [x] `Dashboard.test.tsx` — added loadError state test (error screen + Try Again + retry)
- [x] `Dashboard.test.tsx` — added toast notification test after mark returned

### E2E Fixes
- [x] `golden-path.spec.ts` — fixed skeleton test (verifies multiple pages), improved lazy loading test
- [x] `mobile-responsiveness.spec.ts` — added `expect(box).toBeTruthy()` null checks on all boundingBox() calls

## New Component Test Coverage

### Notifications.test.tsx (NEW — 17 tests, all passing)
- [x] Renders loading skeleton with shimmer elements
- [x] Redirects to login when not logged in
- [x] Renders empty state "All caught up!" when no pending requests or loans
- [x] Renders pending requests with borrower name, item name, Approve/Decline buttons
- [x] Approve button calls rpc("approve_borrow") and shows "Request approved" toast
- [x] Decline button opens confirm dialog, calls update("borrow_requests", id, {status: "declined"})
- [x] Renders overdue loans with highlighting and day count
- [x] Renders active loans with due dates
- [x] Mark Returned opens confirm dialog, calls rpc("return_item"), shows toast
- [x] Back link to dashboard exists
- [x] Error handling: loadAll fails, approve fails, decline fails, return fails (4 tests)
- [x] Full data rendering: all sections render with badge counts
- [x] Approve removes request from pending list
- [x] Mark Returned removes loan from list

### EditItem.test.tsx (NEW — 28 tests, all passing)
- [x] Renders loading skeleton with shimmer elements
- [x] Redirects to login when not logged in
- [x] Renders "Item not found" when load fails
- [x] Loads existing item data into form (name, description, max_borrow_days)
- [x] Resolves relative /api/ photo URLs to VITE_AYB_URL prefix for preview
- [x] Shows/hides photo preview based on photo_url
- [x] Calls ayb.records.update with correct data on Save Changes
- [x] Uploads new photo before updating item (via ImageCropper mock)
- [x] Shows "Saving..." state during submission
- [x] Shows friendly error messages on update failure
- [x] Navigates back to library after successful save
- [x] Shows back link to library
- [x] Facet values: text, select/options, boolean, number — all with existing values
- [x] Facet save: deletes old values, creates new ones; skips empty values
- [x] Edge cases: null description, null max_borrow_days, preserves existing photo, no facets section, save toast, absolute photo URL

## BEHAVIORS.md Updates
- [x] Added Notifications page behaviors (Section 3.3)
- [x] Added Notification Bell behaviors (Section 3.4)
- [x] Added Active Loans on Dashboard behaviors (Section 3.5)
- [x] Added Edit Item behaviors (Section 4.3)
- [x] Added Delete Library behavior (Section 4.4)
- [x] Added 15 new entries to Test Coverage Matrix

## Verification
- [x] Run modified/new test files — 124 tests passing across 6 files
- [x] Full unit test suite — 644/657 tests passing (49/50 files; 1 file OOM in full-suite run, passes individually)
- [x] TypeScript check — `tsc --noEmit` passes clean
- [x] Update master checklist — updated to Session 025

## E2E Test Fixes Still Needed (next session)
- [ ] Fix `smoke-crud.spec.ts` notification bell test (stale test data on staging)
- [ ] Fix `golden-path.spec.ts` settings test (avatar dropdown selector)
- [ ] Fix `dark-mode.spec.ts` persistence tests (timeout issues)
- [ ] Fix `comprehensive.spec.ts` settings save test
- [ ] Fix `borrow-flow.spec.ts` approve/decline/return tests
