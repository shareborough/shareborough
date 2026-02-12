# E2E Test Run #1 - AWS Analysis

## Summary
- **Environment:** AWS EC2 (Amazon Linux 2023)
- **Date:** 2026-02-11
- **Results:** 27/58 passing (46.5%)
- **Runtime:** 14.4 minutes

## Key Findings

### ✅ Successes (27 tests)
Tests that work correctly:
- Basic authentication flows (registration, login, invalid credentials)
- Navigation guards and top navigation
- Dashboard library listing
- Add item form (camera/gallery buttons, capture attributes)
- Public library viewing and 404 handling
- Settings page (email disabled, 404 pages)
- PWA manifest, footer, responsive design basics

### ❌ Primary Issues

#### 1. **Avatar/Account Menu Selector Mismatch** (8 failures)
**Problem:** Tests use `/avatar/i` but button is actually labeled "Account menu"

**Failed Tests:**
- 1.1 Registration: duplicate email shows error
- 1.2 Login: complete flow
- 1.7 Sign Out: clears tokens and redirects
- 2.1 NavBar: avatar dropdown menu (all 4 variants)

**Fix:**
```ts
// Change from:
page.getByRole("button", { name: /avatar/i })

// To:
page.getByRole("button", { name: /Account menu/i })
```

**Files:** `e2e/comprehensive.spec.ts`, `e2e/helpers.ts`

#### 2. **Data Cleanup Failures** (Multiple failures)
**Problem:** Global setup returns 401 on admin endpoints → test data accumulates → strict mode violations

**Evidence:**
```
Warning: could not clean table reminders: 401
Warning: could not clean table loans: 401
...
```

**Impact:**
- Test #31: "strict mode violation: getByRole('button', { name: 'Approve' }) resolved to 5 elements"
- Tests interfere with each other due to leftover data

**Fix:** Need admin authentication for cleanup OR use unique test user emails

#### 3. **Missing OAuth "or" Divider** (1 failure)
**Problem:** `page.locator("text=/or/i")` not found

**Likely Cause:** Selector too broad or element structure changed

**Fix:** Inspect actual page structure and update selector

#### 4. **Timeout Issues** (Multiple)
Several tests timeout waiting for elements:
- "My Libraries" heading after registration
- Settings page elements (Display name label)
- Create library modal closing
- Public library elements

**Potential Causes:**
- Slow AWS dev server startup
- Race conditions with async operations
- Elements not actually present

#### 5. **Test-Specific Issues**

**Test 22 - Item Count:**
- Expected `/2 item/i` text not found
- May be pluralization issue

**Test 31 - Delete Item:**
- Dialog handler may not be executing correctly
- Item not disappearing after delete

**Tests 37-40 - Public Library:**
- Multiple timeouts on public page elements
- May indicate routing or rendering issues

**Test 43 - Borrow Form Fields:**
- Form fields not visible (timeout)

**Test 48 - Settings Save:**
- Display name field not found after reload
- May be label selector issue (getByLabel vs getByLabelText)

## Recommendations

### Immediate Fixes (High Impact)
1. Fix avatar/account menu selector → +8 tests
2. Add admin auth to global setup OR use per-test cleanup → +~5-10 tests
3. Fix OAuth divider selector → +1 test

### Secondary Fixes
4. Investigate timeout issues (increase timeouts? fix race conditions?)
5. Fix pluralization in item count test
6. Fix delete item dialog handling
7. Debug public library rendering issues

### Expected Outcome After Fixes
With fixes #1-3: **36-45 passing** (62-78%)
With all fixes: **50-55 passing** (86-95%)

## Next Steps
1. Apply fixes to test files
2. Sync to AWS
3. Re-run comprehensive.spec.ts
4. Run remaining test files (photo-cropper, mobile, full-journey)
5. Document final results
