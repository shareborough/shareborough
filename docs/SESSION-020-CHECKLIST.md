# Session 020 Checklist — Test Quality Audit + Seed + README

## Goal
Comprehensive review of all 48 unit test files and 15 e2e spec files for correctness, false positives, missing coverage, and fragile selectors. Fix the highest-impact issues. Add test user seeding and README with phone testing instructions.

## Audit Findings Summary

### False Positives Found
- [x] `Settings.test.tsx` — "graceful profile load failure" passes even without the catch block (no assertion that mockList was called)
- [ ] `Dashboard.test.tsx` — skeleton loading test doesn't assert actual skeleton elements exist
- [ ] `LibraryDetail.test.tsx` — skeleton test only checks aria-label, not skeleton content
- [ ] `golden-path.spec.ts` — skeleton test never verifies skeletons appeared
- [ ] `golden-path.spec.ts` — image lazy loading test is vacuous when no images have remote URLs
- [x] `dark-mode.spec.ts` — landing page toggle test silently passes if toggle doesn't exist (catch clause)
- [x] `Skeleton.test.tsx` — `toBeGreaterThanOrEqual(3)` should be `toBe(4)` for Card shimmer count

### Critical Missing Coverage
- [x] `AddItem.test.tsx` — no test for barcode lookup failure (catch block toast)
- [ ] `AddItem.test.tsx` — no test for scanLoading disabling button + "Looking up barcode..." text
- [x] `AddItem.test.tsx` — mockFormatBarcodeResult never asserted with correct args
- [x] `AuthPage.test.tsx` — no test for persistTokens() being called after login/register
- [ ] `Settings.test.tsx` — no test for Theme/Appearance section (Light/Dark/System buttons)
- [ ] `Settings.test.tsx` — no test for save success toast ("Settings saved")
- [ ] `Dashboard.test.tsx` — no test for loadError state (error screen + Try Again)
- [ ] `Dashboard.test.tsx` — no test for toast notifications after approve/decline/return
- [x] `BarcodeScanner.test.tsx` — no test verifying Quagga.start NOT called on init failure
- [x] `BarcodeScanner.test.tsx` — "renders viewport and cancel" doesn't verify viewport div
- [x] `ThemeContext.test.tsx` — no test that mount-time applies dark class from stored preference

### E2E Fragility Issues
- [x] `borrow-flow.spec.ts` — uses CSS class `.capitalize` for status badge — replaced with getByText
- [x] `barcode-scanner.spec.ts` — uses CSS class `.text-red-400` for error detection — replaced with getByText
- [x] `dark-mode.spec.ts` — landing page test now asserts toggle is visible (not silent pass)
- [ ] `mobile-responsiveness.spec.ts` — missing null check on boundingBox()

## Tasks Completed

### Seed + README
- [x] Updated `scripts/seed.ts` with 7 test user accounts (sigil.app + short accounts)
- [x] Seed creates user profiles for all test users
- [x] Alice's library ("Running Gear") created independently with idempotent check
- [x] Ran seed against production — all 8 users created successfully
- [x] Updated `README.md` with phone testing instructions, PWA setup, test account table, "Things to Try" guide

### Fix Unit Test False Positives
- [x] `Settings.test.tsx` — added `expect(mockList).toHaveBeenCalled()` to profile load failure test
- [x] `Skeleton.test.tsx` — tightened Card shimmer count to `toBe(4)`

### Add Missing Critical Unit Test Coverage
- [x] `AddItem.test.tsx` — added test for barcode lookup failure path (shows error toast)
- [x] `AddItem.test.tsx` — asserted mockFormatBarcodeResult called with correct args ("9780134685991", "ean_13")
- [x] `AuthPage.test.tsx` — added `expect(mockPersistTokens).toHaveBeenCalled()` assertions to login + register tests
- [x] `BarcodeScanner.test.tsx` — added test that Quagga.start NOT called on init failure
- [x] `BarcodeScanner.test.tsx` — added viewport div assertion to "renders scanner viewport and cancel button"
- [x] `ThemeContext.test.tsx` — added `document.documentElement.classList.contains("dark")` assertion to mount-from-localStorage test

### Fix E2E Test Fragility
- [x] `borrow-flow.spec.ts` — replaced `.capitalize` selector with `getByText("available")`
- [x] `barcode-scanner.spec.ts` — replaced `.text-red-400` selectors with `getByText(/Camera permission denied|.../)`
- [x] `dark-mode.spec.ts` — made landing page toggle test definitive (asserts visibility instead of silent skip)

### Other Fixes
- [x] `ThemeContext.test.tsx` — removed unused `type ThemeMode` import (TS error)

### Verification
- [x] Run full unit test suite — **47 files passing, 0 failures**
- [x] TypeScript check — `tsc --noEmit` passes clean
- [ ] Launch EC2 e2e tests — pending (not run this session)

## Remaining Items (Next Session)
- [ ] Dashboard.test.tsx — fix skeleton false positive, add loadError + toast coverage
- [ ] LibraryDetail.test.tsx — fix skeleton false positive, add copy share link test
- [ ] golden-path.spec.ts — fix skeleton + lazy loading vacuous tests
- [ ] Settings.test.tsx — add Theme/Appearance section test, save success toast test
- [ ] mobile-responsiveness.spec.ts — add null check on boundingBox()
- [ ] Launch EC2 e2e tests and store results to S3
