# E2E Test Suite Summary

This document provides a comprehensive overview of all E2E tests for the Shareborough application.

## Test Files

### 1. **auth.spec.ts**
**Coverage:** Authentication flows
**Tests:**
- Landing page navigation
- User registration
- User login
- Invalid credentials error
- Logout
- Session persistence
- Duplicate email error handling
- Login/signup page cross-links
- Multiple login/logout cycles

**Run:** `npx playwright test auth.spec.ts`

---

### 2. **library.spec.ts**
**Coverage:** Library management
**Tests:**
- Dashboard loads for new users
- Create library
- Library shows slug after creation
- Navigate to library detail
- Library detail empty state
- Create multiple libraries
- Share link display and copy button

**Run:** `npx playwright test library.spec.ts`

---

### 3. **items.spec.ts**
**Coverage:** Item management
**Tests:**
- Add item to library
- Item shows "available" status
- Add multiple items
- Navigate back to dashboard from library
- Delete item with confirmation

**Run:** `npx playwright test items.spec.ts`

---

### 4. **borrow-flow.spec.ts**
**Coverage:** Complete borrowing lifecycle
**Tests:**
- Public library accessible without auth
- Public library shows items grid
- Open item detail from public library
- Submit borrow request
- Owner approves borrow request
- Owner declines borrow request
- Full lifecycle: borrow → approve → return

**Run:** `npx playwright test borrow-flow.spec.ts`

---

### 5. **public.spec.ts**
**Coverage:** Public browsing
**Tests:**
- Non-existent library shows 404
- Public library shows name and description
- Search filters items by name
- Empty library shows appropriate message

**Run:** `npx playwright test public.spec.ts`

---

### 6. **golden-path.spec.ts**
**Coverage:** End-to-end user journeys
**Tests:**
- Complete flow: register → create library → add item → share → borrow → approve → return
- Settings page accessible from avatar dropdown
- 404 page handling
- Skeleton loading states
- Library stats after lending activity
- PWA manifest accessible
- Image lazy loading attributes

**Run:** `npx playwright test golden-path.spec.ts`

---

### 7. **production-smoke.spec.ts**
**Coverage:** Production smoke tests (read-only)
**Tests:**
- Landing page loads correctly
- Sign In button navigates to login
- Get Started button navigates to signup
- Start Your Library button navigates to signup
- API health check accessible

**Run:** `npx playwright test --config=playwright.config.prod.ts production-smoke.spec.ts`

---

### 8. **full-user-journey-enhanced.spec.ts**
**Coverage:** Enhanced full user journey
**Tests:**
- Complete signup → library → item → borrow → approve → return flow
- Settings: Update display name and phone
- 404 page navigation

**Run:** `npx playwright test full-user-journey-enhanced.spec.ts`

---

### 9. **mobile-responsiveness.spec.ts**
**Coverage:** Mobile UI testing (iPhone SE viewport)
**Tests:**
- Landing page: no overflow, buttons accessible
- Auth pages: forms fit viewport, no horizontal scroll
- Dashboard: cards stack vertically
- Add Item: photo buttons visible and accessible
- Settings: form fields stack properly, no overflow
- Public library: grid adapts, text wraps

**Run:** `npx playwright test mobile-responsiveness.spec.ts`

---

### 10. **photo-upload.spec.ts**
**Coverage:** Photo upload functionality
**Tests:**
- Gallery button allows selecting photos
- Camera button has capture attribute for mobile
- Image cropper shows on upload
- Item without photo shows placeholder

**Run:** `npx playwright test photo-upload.spec.ts`

---

### 11. **comprehensive.spec.ts** ⭐ NEW
**Coverage:** Systematic test of ALL documented behaviors
**Sections:**
1. Authentication (9 tests)
   - Registration complete flow
   - Duplicate email error
   - Already logged in redirect
   - Login complete flow
   - Invalid credentials
   - OAuth buttons visible
   - OAuth divider
   - Session persistence
   - Sign out

2. Navigation (6 tests)
   - NavBar logo links
   - Avatar dropdown menu
   - Dropdown close behaviors
   - Auth guards
   - Top navigation buttons

3. Owner Dashboard (7 tests)
   - Library list
   - Item count
   - Create library modal
   - Pending requests
   - Approve/decline requests
   - Active loans
   - Mark returned

4. Library Detail (4 tests)
   - Item list
   - Status badges
   - Share button
   - Delete item

5. Add Item (4 tests)
   - Camera and gallery buttons
   - Capture attribute
   - Successful submission
   - Photo cropper instructions

6. Public Browse (6 tests)
   - Accessible without auth
   - Shows name and description
   - Search filtering
   - Empty library message
   - Item detail page
   - Non-existent slug 404

7. Borrowing Flow (3 tests)
   - Borrow request form
   - Successful submission
   - Confirmation page

8. Settings (4 tests)
   - All fields present
   - Email field disabled
   - Save changes
   - 404 handling

9. Cross-Cutting (5 tests)
   - Loading skeletons
   - Toast notifications
   - PWA manifest
   - Image lazy loading
   - Responsive design
   - Footer

10. E2E Golden Path (1 test)
    - Full user journey

**Total:** 58 tests

**Run:** `npx playwright test comprehensive.spec.ts`

---

### 12. **email-verification.spec.ts**
**Coverage:** Email verification flow using mailpail (AWS SES + S3)
**Prerequisites:**
- `MAILPAIL_DOMAIN` and `MAILPAIL_BUCKET` environment variables
- AWS credentials (IAM role on EC2 or env vars locally)
- Email sending configured in backend

**Tests:**
- Complete email verification flow
- Resend verification email
- Verification link expires

**Run:** `MAILPAIL_DOMAIN=test.shareborough.com MAILPAIL_BUCKET=ayb-ci-artifacts npx playwright test email-verification.spec.ts`

---

### 13. **password-reset.spec.ts**
**Coverage:** Password reset flow using mailpail (AWS SES + S3)
**Prerequisites:**
- `MAILPAIL_DOMAIN` and `MAILPAIL_BUCKET` environment variables
- AWS credentials (IAM role on EC2 or env vars locally)
- Email sending configured in backend

**Tests:**
- Complete password reset flow
- Old password no longer works after reset
- Invalid/expired token shows error
- Can request multiple resets

**Run:** `MAILPAIL_DOMAIN=test.shareborough.com MAILPAIL_BUCKET=ayb-ci-artifacts npx playwright test password-reset.spec.ts`

---

### 14. **photo-cropper.spec.ts** 🆕 NEW
**Coverage:** Photo cropper interactions
**Tests:**
- Desktop: Mouse wheel zoom
- Desktop: Drag to pan
- Mobile: Pinch-to-zoom simulation
- Crop & Use button
- Cancel button
- Crop instructions visible
- Aspect ratio is square (1:1)

**Run:** `npx playwright test photo-cropper.spec.ts`

---

## Test Configuration

### Local Testing (default)
**Config:** `playwright.config.ts`
**Base URL:** `http://localhost:5173`
**Server:** Vite dev server auto-started
**Run:** `npx playwright test`

### Production Testing
**Config:** `playwright.config.prod.ts`
**Base URL:** `https://shareborough.com`
**Run:** `npx playwright test --config=playwright.config.prod.ts`

---

## Test Helpers

### `e2e/helpers.ts`
Common utilities for all e2e tests:
- `uniqueEmail()` - Generate unique test emails
- `uniqueName(base)` - Generate unique names for libraries/items
- `registerUser(page)` - Register and return email
- `loginUser(page, email)` - Login with credentials
- `createLibrary(page, name)` - Create a library
- `openLibrary(page, name)` - Navigate to library detail
- `addItem(page, name, description)` - Add item to library

### `tests/helpers/mailpail.ts`
Mailpail integration for email testing (AWS SES inbound + S3):
- `isConfigured()` - Check if mailpail env vars are set
- `createTestAddress()` - Generate unique disposable email address
- `waitForTestEmail(to, options)` - Poll S3 for incoming email
- `extractEmailLinks(email)` - Extract all href links from email HTML
- `purgeTestEmails()` - Delete all test emails from S3

---

## Running Tests

### All tests (local)
```bash
npx playwright test
```

### Specific test file
```bash
npx playwright test auth.spec.ts
```

### Specific test by name
```bash
npx playwright test -g "can register a new owner"
```

### Production tests
```bash
npx playwright test --config=playwright.config.prod.ts
```

### With UI
```bash
npx playwright test --ui
```

### Debug mode
```bash
npx playwright test --debug
```

### Generate report
```bash
npx playwright show-report
```

---

## Test Coverage Matrix

All documented behaviors in `BEHAVIORS.md` are tested either via:
- **Component tests** (Vitest): Fast, isolated unit tests
- **E2E tests** (Playwright): Full browser integration tests

See `BEHAVIORS.md` for the complete coverage matrix mapping each behavior to its tests.

---

## Current Test Counts

| Test File | Tests | Status |
|-----------|-------|--------|
| auth.spec.ts | 9 | ✅ Passing |
| library.spec.ts | 6 | ✅ Passing |
| items.spec.ts | 5 | ✅ Passing |
| borrow-flow.spec.ts | 6 | ✅ Passing |
| public.spec.ts | 4 | ✅ Passing |
| golden-path.spec.ts | 8 | ✅ Passing |
| production-smoke.spec.ts | 5 | ✅ Passing |
| full-user-journey-enhanced.spec.ts | 3 | ✅ Passing |
| mobile-responsiveness.spec.ts | 6 | ✅ Passing |
| photo-upload.spec.ts | 4 | ✅ Passing |
| comprehensive.spec.ts | 58 | 🆕 New |
| email-verification.spec.ts | 3 | 🆕 New (requires MailSlurp) |
| password-reset.spec.ts | 4 | 🆕 New (requires MailSlurp) |
| photo-cropper.spec.ts | 7 | 🆕 New |
| **TOTAL** | **128** | — |

---

## Missing Test Coverage

The following behaviors are documented in `BEHAVIORS.md` but not yet tested in E2E:

1. ❌ **Account deletion flow** - No e2e test yet (component test exists)
2. ❌ **Session expiry (401 handling)** - No e2e test (component test exists)
3. ❌ **Offline banner behavior** - No e2e test (component test exists)
4. ❌ **Realtime SSE notifications** - No e2e test (component test exists)
5. ❌ **Service worker offline caching** - No e2e test (component test exists)
6. ❌ **Push notifications** - No e2e test (component test exists)
7. ❌ **Facet definitions** - No e2e test
8. ❌ **SMS reminders** - No e2e test (tested at unit level)
9. ❌ **Overdue loan highlighting** - No e2e test
10. ❌ **Private possession checkbox** - No e2e test

Most of these are covered by component tests and are lower priority for E2E coverage.

---

## Next Steps

1. **Run comprehensive.spec.ts locally** to validate all behaviors
2. **Set up MailSlurp account** to test email verification and password reset
3. **Run production smoke tests** regularly to catch production issues
4. **Add CI/CD integration** to run tests on every commit
5. **Create staging environment** for safe E2E testing without affecting production

---

## Notes

- **Production tests** should be read-only (no writes) to avoid polluting production data
- **MailSlurp tests** require API key and may have rate limits on free tier
- **Mobile tests** use Playwright's device emulation (iPhone SE by default)
- **Photo tests** require `tests/fixtures/test-image.jpg` to exist

---

Last updated: 2026-02-10 (Session 013)
