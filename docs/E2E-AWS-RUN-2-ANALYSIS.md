# E2E Test Run #2 - AWS Analysis

## Summary
- **Environment:** AWS EC2 (Amazon Linux 2023)
- **Date:** 2026-02-11
- **Results:** 31/58 passing (53.4%)
- **Runtime:** 7.5 minutes
- **Improvement:** +4 tests from Run #1 (27 → 31)

## What We Fixed
1. **Avatar button selector:** Changed `/avatar/i` → `/Account menu/i`
2. **Menu item scoping:** Added `[role="menu"]` scope to avoid conflicts
3. **OAuth divider selector:** Changed `text=/or/i` → `.relative` filter
4. **Approve button scope:** Added `.card` filter to avoid strict mode violations

## Results Comparison
| Run | Passed | Failed | Pass Rate |
|-----|--------|--------|-----------|
| #1  | 27     | 31     | 46.5%     |
| #2  | 31     | 27     | 53.4%     |

## Tests Fixed in Run #2
- ✅ #2: Registration: duplicate email shows error
- ✅ #4: Login: complete flow
- ✅ #13-16: NavBar dropdown tests (partially - some still timeout)
- ✅ #23: Create Library modal

## Major Remaining Issue: "My Libraries" Timeout Pattern

### The Problem
**17 of 27 failures** show the same error at `helpers.ts:30`:
```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('heading', { name: 'My Libraries' })
Timeout: 15000ms
```

### Affected Tests (Late in Run)
Starting around test #6 and increasing frequency:
- #6: Login: already logged in redirects
- #9: Session Persistence
- #10: Sign Out
- #12: NavBar logo
- #21: Library List
- #24-26: Pending Requests, Active Loans
- #29-31: Library Detail tests
- #33-35: Add Item tests
- #38-41: Public Browse tests
- #43-45: Borrow Flow tests
- #47-48: Settings tests
- #51-52: Cross-Cutting tests
- #58: Golden Path

### Root Cause Hypothesis
The `registerUser()` helper is failing late in the test run, suggesting:

1. **Dev server degradation:** Server becomes slow/unresponsive after ~20 tests
2. **Data accumulation:** Database fills up (no admin auth for cleanup → 401s)
3. **Memory/resource exhaustion:** Embedded Postgres or Node.js running out of resources
4. **Port conflicts or connection pool exhaustion**

### Evidence
- First ~20 tests work fine
- Later tests consistently timeout at same point
- All show 401 errors on global cleanup
- Runtime is 7.5min (vs 14.4min in Run #1) - suggesting faster failures

## Other Failures

### Test #8: OAuth divider (still failing)
Selector `.relative` filter not finding "or" text
- May need more specific selector or actual DOM inspection

### Test #33-35: Add Item form (camera/gallery)
New failures - these passed in Run #1
- Suggests data/state issue affecting test order

### Test #45: Borrow Confirmation text
Can't find "Your request to borrow" text
- May be actual UI text difference

### Test #52: Toast Notifications
Can't find `[role="alert"]` element
- May be timing issue or toast already dismissed

## Next Steps

### Priority 1: Fix Dev Server Stability
**Options:**
A. Restart dev server between tests (slow but reliable)
B. Add admin auth to global-setup.ts for proper cleanup
C. Increase server memory/resources
D. Clear test data in afterEach hooks instead of global setup

**Recommendation:** Add admin auth to global-setup.ts

### Priority 2: Fix OAuth Divider Selector
Inspect actual DOM and update selector

### Priority 3: Fix Remaining Selector Issues
- Borrow confirmation text
- Toast alert role

## Expected Outcome After Fixes
**If we fix dev server stability:** 45-50 passing tests (78-86%)
**If we fix all selector issues:** 50-55 passing tests (86-95%)
**Target:** 55+ passing (95%+)
