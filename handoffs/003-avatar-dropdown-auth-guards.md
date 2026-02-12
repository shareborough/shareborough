# Handoff 003 — Avatar Dropdown, Auth Guards, Test Integrity

**Date**: 2026-02-10

## Key Documents

- **Master Checklist**: `docs/CHECKLIST.md` — tracks all implementation phases, priority queue, known issues
- **Session Checklist**: `docs/SESSION-003-CHECKLIST.md` — what was done this session
- **Behaviors Spec**: `docs/BEHAVIORS.md` — acceptance criteria for all user workflows, with test coverage matrix
- **Previous Handoffs**: `handoffs/001-initial-build.md`, `handoffs/002-camera-capture-tests.md`

## What Was Done

### 1. Avatar Dropdown Menu (`src/components/NavBar.tsx`)
The avatar is now a clickable button that opens a dropdown menu:
- Shows user email (extracted from JWT)
- "My Libraries" → `/dashboard`
- "Settings" → `/dashboard/settings` (route doesn't exist yet — next priority)
- "Sign out" → clears tokens, redirects to `/login`
- Closes on: Escape key, click outside, selecting a menu item, clicking avatar again
- Falls back to "?" placeholder when no token
- Accessible: `aria-expanded`, `aria-haspopup`, `role="menu"`, `role="menuitem"`, `role="separator"`

### 2. Auth Guards (`src/App.tsx`)
- All `/dashboard/*` routes now redirect to `/login` if user is not authenticated
- `/login` and `/signup` redirect to `/dashboard` if user is already authenticated
- Import added: `Navigate` from `react-router-dom`

### 3. CORS Root Cause Fixed (`.env.local`)
- `.env.local` had `VITE_AYB_URL=http://127.0.0.1:8090` which bypassed the Vite proxy
- Set to `VITE_AYB_URL=` (empty) so all requests go through the Vite dev proxy at port 5176
- This was the actual root cause of CORS issues in previous sessions

### 4. Type Drift Fixed (`tests/types.test.ts`)
- `Item` type gained `max_borrow_days`, `visibility`, `circle_id` but test fixtures were stale
- `BorrowRequest` gained `return_by`, `private_possession`
- `Loan` gained `private_possession`
- All fixtures updated to match current types

### 5. Dead Code Removed
- `PublicItem.tsx`: removed unused `isNetworkError` import and `loadError` state variable
- `mobile.test.tsx`: removed unused `waitFor` import

## Test Status

- **280 tests passing** across 26 test files
- **TypeScript compiles cleanly** (strict mode, `tsc --noEmit`)
- **0 failures, 0 type errors**

### New Tests (21 in NavBar.test.tsx)
- Branding and logo rendering
- Header "My Libraries" link
- Avatar button with accessible labels
- Dropdown: opens, shows email, shows all menu items with correct links
- Sign out: clears tokens, calls onLogout, navigates to `/login`, closes menu
- Keyboard: Escape closes menu
- Mouse: click outside closes menu
- Menu items close on selection
- Toggle: avatar click closes already-open menu
- Separator between nav items and destructive action
- No-token state: placeholder avatar, no email shown

## What To Do Next (Priority Order)

1. **Settings page** — The dropdown has a "Settings" link to `/dashboard/settings` but there's no route or page yet. Needs at minimum:
   - A route in `App.tsx`
   - A basic Settings page component (display name, avatar, phone number)
   - Tests for the new page

2. **Loading skeletons** — Currently all loading states show plain "Loading..." text. Replace with shimmer/skeleton UI.

3. **Toast integration** — `ToastProvider` and `useToast` exist but aren't wired up everywhere. Integrate toasts for CRUD success/error feedback.

4. **Offline banner tests** — `useHealthCheck` hook and `OfflineBanner` component have zero test coverage.

5. **E2E golden path test** — Write a Playwright test that exercises the full flow: register → create library → add item → share link → borrower requests → owner approves → return. This would have caught every bug from previous sessions.

6. **404 catch-all route** — No fallback for unmatched routes.

## Architecture Notes

### How Auth Works
1. Login/register → AYB SDK stores tokens → `persistTokens()` saves to localStorage
2. App mount → `validateSession()` checks JWT expiry + server verification
3. 401 from any API call → `ayb:auth-expired` event → App redirects to `/login`
4. Auth guard: `authed ? <Component /> : <Navigate to="/login" replace />`

### How the Avatar Dropdown Works
- `getUserEmail()` decodes JWT payload to extract email
- `useState(false)` controls menu visibility
- `useRef` + `useEffect` handles click-outside and Escape key listeners
- Listeners only attached when menu is open (performance)

### Why CORS Was Broken
The Vite proxy (`/api` → `http://localhost:8090`) only works when the browser sends requests to the same origin (port 5176). When `.env.local` set `VITE_AYB_URL=http://127.0.0.1:8090`, the SDK sent requests directly to port 8090, bypassing the proxy. The AYB server doesn't set CORS headers, so the browser blocked the responses.

## File Map (What Changed)

```
src/components/NavBar.tsx     — Avatar dropdown (was: flat button layout)
src/App.tsx                   — Auth guards + Navigate import
src/pages/PublicItem.tsx      — Removed dead code
tests/NavBar.test.tsx         — 21 tests (was: 3 tests)
tests/types.test.ts           — Fixed stale type fixtures
tests/mobile.test.tsx         — Removed unused import
.env.local                    — VITE_AYB_URL= (empty, uses proxy)
docs/BEHAVIORS.md             — NEW: acceptance spec
docs/CHECKLIST.md             — Updated master checklist
docs/SESSION-003-CHECKLIST.md — NEW: session checklist
handoffs/003-*.md             — NEW: this file
```
