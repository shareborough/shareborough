# Handoff 004 — Settings Page, 404 Route, Test Coverage Gaps

**Date**: 2026-02-10

## Key Documents

- **Master Checklist**: `docs/CHECKLIST.md` — tracks all implementation phases, priority queue, known issues
- **Session Checklist**: `docs/SESSION-004-CHECKLIST.md` — what was done this session
- **Behaviors Spec**: `docs/BEHAVIORS.md` — acceptance criteria for all user workflows, with test coverage matrix
- **Previous Handoffs**: `handoffs/001-initial-build.md`, `handoffs/002-camera-capture-tests.md`, `handoffs/003-avatar-dropdown-auth-guards.md`

## What Was Done

### 1. Settings Page (`src/pages/Settings.tsx`)
New page at `/dashboard/settings` accessible from the avatar dropdown:
- **Email** — shown as disabled field (not editable)
- **Display name** — optional, how others see you
- **Phone number** — optional, used for SMS reminders
- Creates new `user_profiles` record if none exists, updates if found
- Shows toast on success/failure
- Handles missing table gracefully (no crash)
- Protected by auth guard + NavBar

### 2. 404 Not Found Page (`src/pages/NotFound.tsx`)
- Catch-all `<Route path="*">` for any unmatched URL
- Shows "404 — Page not found" with description
- "Go Home" link navigates to `/`
- Works for both authed and unauthed users

### 3. Auth Guard Component Tests (`tests/AuthGuards.test.tsx` — 16 tests)
Covers the full routing behavior of `App.tsx`:
- **Unauthenticated**: `/dashboard`, `/dashboard/library/:id`, `/dashboard/library/:id/add`, `/dashboard/settings` all redirect to `/login`
- **Authenticated**: all protected routes render their pages + NavBar; `/login` and `/signup` redirect to `/dashboard`
- **Public routes**: `/`, `/l/:slug`, `/l/:slug/:itemId`, `/borrow/:requestId` work regardless of auth
- **404**: unknown paths render NotFound for both authed and unauthed

### 4. Offline Banner Tests (`tests/OfflineBanner.test.tsx` — 9 tests)
Tests `OfflineBanner` + `useHealthCheck` integration:
- Not visible when online
- Shows banner + retry button when offline
- Countdown timer (5s → 4s → 3s...)
- Exponential backoff (5s → 10s)
- Manual retry via button
- Auto-recovery when server comes back
- `ayb:reconnected` event dispatch on reconnect

### 5. Settings Page Tests (`tests/Settings.test.tsx` — 14 tests)
- Loading state, heading, form fields
- Email field disabled with hint
- Phone SMS hint text
- Populates from existing profile
- Creates new profile when none exists
- Updates existing profile
- Save/Saving state transitions
- Error display on save failure
- Graceful handling when table doesn't exist

### 6. NotFound Page Tests (`tests/NotFound.test.tsx` — 5 tests)
- 404 text, heading, description
- Go Home link pointing to `/`
- Footer rendered

## Test Status

- **327 tests passing** across 30 test files
- **TypeScript compiles cleanly** (strict mode, `tsc --noEmit`)
- **0 failures, 0 type errors**

## What To Do Next (Priority Order)

1. **Loading skeletons** — All loading states currently show "Loading..." text. Replace with shimmer/skeleton placeholders for better perceived performance. Affects: Dashboard, LibraryDetail, AddItem, Settings, PublicLibrary, PublicItem, BorrowConfirmation.

2. **Toast integration** — `ToastProvider` and `useToast` exist and are used in Dashboard, but not in: AuthPage (uses inline error), LibraryDetail, AddItem, PublicItem. Wire up toast notifications for CRUD success/error feedback.

3. **E2E golden path test** — Write a Playwright test exercising the full flow: register → create library → add item → share link → borrower requests → owner approves → return. This is the single most valuable test to write.

4. **Session persistence component test** — Test the token restore + refresh + server validation flow in App.tsx. Currently only covered by E2E tests.

5. **PWA manifest** — "Add to home screen" support for mobile users.

## Architecture Notes

### Settings Page Design
- Uses `ayb.auth.me()` to get email, `ayb.records.list("user_profiles")` to get profile
- Profile creation is lazy: first save creates the record via `ayb.records.create`
- Subsequent saves use `ayb.records.update` with the existing profile ID
- If `user_profiles` table doesn't exist (schema not migrated), page renders empty form without crashing

### Auth Guard Pattern
All protected routes follow the same pattern in App.tsx:
```tsx
<Route path="/dashboard/settings" element={
  authed ? (<><NavBar /><Settings /></>) : (<Navigate to="/login" replace />)
} />
```

### Known Bug: useHealthCheck Stale Closure
The `ayb:reconnected` event only fires when the user manually clicks "Retry now" (retryNow function). It does NOT fire on automatic timer retries because the timer callback captures a stale `check()` function from a previous render where `status !== "offline"`. Fix: use a `useRef` to track the previous offline state instead of reading `status` from the closure.

## File Map (What Changed)

```
src/pages/Settings.tsx            — NEW: Settings page
src/pages/NotFound.tsx             — NEW: 404 page
src/App.tsx                        — Added Settings + NotFound routes
tests/Settings.test.tsx            — NEW: 14 tests
tests/NotFound.test.tsx            — NEW: 5 tests
tests/AuthGuards.test.tsx          — NEW: 16 tests
tests/OfflineBanner.test.tsx       — NEW: 9 tests
docs/BEHAVIORS.md                  — Updated: Settings + 404 behaviors, coverage matrix
docs/CHECKLIST.md                  — Updated: marked completed, new stats
docs/SESSION-004-CHECKLIST.md      — NEW: session checklist
handoffs/004-*.md                  — NEW: this file
```
