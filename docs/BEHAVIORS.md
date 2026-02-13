# Shareborough — Expected Behaviors & Acceptance Spec

This document defines the expected user workflows and behaviors. Each behavior should be testable — either via component tests (Vitest) or E2E tests (Playwright). Use this as the source of truth for what the app should do.

---

## 1. Authentication

### 1.1 Registration
- User visits `/signup`
- Fills email + password
- On success: tokens saved to localStorage, redirected to `/dashboard`
- On failure: error message displayed inline
- If already logged in: `/signup` redirects to `/dashboard`

### 1.2 Login
- User visits `/login`
- Fills email + password
- On success: tokens saved, redirected to `/dashboard`
- On failure: error message displayed
- If already logged in: `/login` redirects to `/dashboard`

### 1.3 OAuth (Google / GitHub)
- Both login and register pages show "Continue with Google" and "Continue with GitHub" buttons
- OAuth buttons appear above the email/password form, separated by an "or" divider
- Clicking "Continue with Google" calls `signInWithOAuth("google")` (popup + SSE flow)
- Clicking "Continue with GitHub" calls `signInWithOAuth("github")` (popup + SSE flow)
- On success: tokens saved to localStorage, `onAuth` callback fires, redirect to `/dashboard`
- On failure: friendly error message displayed, loading state cleared, user can retry
- Per-provider loading: spinner shows on the clicked provider's button
- Both OAuth buttons disabled while any OAuth flow is in progress
- Buttons re-enable after OAuth completes (success or failure)

### 1.4 Session Persistence
- On app load: tokens restored from localStorage
- JWT validated client-side (expiry check) then server-side (`/api/auth/me`)
- Expired token: attempt refresh → if refresh fails, clear tokens + redirect to `/login`
- Server unreachable: keep tokens, show offline warning

### 1.5 Email Verification (if enabled)
- After registration, user receives verification email at their inbox
- Email contains verification link with token
- Clicking link verifies account and redirects to `/login`
- Unverified users can still log in (verification is optional/informational)
- Expected outcome: Email delivered within 30 seconds, link works, account marked as verified

### 1.6 Password Reset
- User visits `/login` → clicks "Forgot password?"
- Enters email address, submits
- Receives password reset email with link containing token
- Clicks link, redirected to `/reset-password?token=XYZ`
- Enters new password, submits
- Password updated, redirected to `/login`
- Can log in with new password
- Reset token expires after 1 hour
- Expected outcome: Full password reset flow works end-to-end

### 1.7 Sign Out
- User clicks avatar → dropdown → "Sign out"
- Tokens cleared from localStorage and SDK
- Redirected to `/login`
- Dashboard routes show `/login` when not authenticated (auth guard)

### 1.8 Session Expiry (401)
- RPC or API call returns 401 → dispatch `ayb:auth-expired` event
- App catches event → clear tokens → redirect to `/login` with toast warning

### 1.9 Account Deletion
- User visits Settings page
- Clicks "Delete Account" button (danger zone)
- Confirmation dialog appears with warning
- User types email to confirm, clicks "Delete My Account"
- Account and all associated data deleted (libraries, items, loans)
- Redirected to landing page with toast notification
- Expected outcome: Complete account deletion with confirmation safety

---

## 2. Navigation

### 2.1 NavBar (authenticated pages)
- Logo links to `/dashboard`
- "My Libraries" link visible in header, links to `/dashboard`
- "Run" link visible in header, links to `/dashboard/run`
- Avatar button opens dropdown menu
- Dropdown shows: user email, "My Libraries", "Settings", separator, "Sign out"
- Dropdown closes on: click outside, Escape key, selecting an item, clicking avatar again

### 2.2 Auth Guards
- `/dashboard`, `/dashboard/library/:id`, `/dashboard/library/:id/add`, `/dashboard/settings`, `/dashboard/run` → redirect to `/login` if not authenticated
- `/login`, `/signup` → redirect to `/dashboard` if already authenticated

### 2.3 Top Navigation Buttons (Unauthenticated)
- Landing page shows "Log In" and "Create Account" buttons in top-right corner
- "Log In" button navigates to `/login`
- "Create Account" button navigates to `/signup`
- Buttons are visible, non-overlapping, and functional on all viewport sizes
- On mobile (≤375px width), buttons remain accessible with minimum 44px touch targets

### 2.4 Top Navigation Buttons (Authenticated)
- Dashboard shows "My Libraries" link and avatar dropdown in top-right corner
- "My Libraries" link navigates to `/dashboard`
- Avatar button opens dropdown with: user email, "My Libraries", "Settings", "Sign out"
- Sign out clears tokens and redirects to `/login`
- On mobile (≤375px width), navigation elements do not overlap or collide

### 2.5 Offline Banner
- Health check polls `/health` endpoint
- If server down: red banner appears with retry countdown
- On reconnect: banner disappears, `ayb:reconnected` event dispatched (both manual and automatic retry)
- Retry uses exponential backoff (5s → 10s → 20s → ... → 60s max)

---

## 3. Owner Dashboard

### 3.1 Library List
- Shows all libraries owned by the user
- Each library card shows: name, item count, slug
- Library cards with lending history show stats: "{N} lent" count and "{N} friend(s) helped"
- Stats count all loans (active + returned) per library
- "Friends helped" counts unique borrowers, uses singular "friend" for 1
- Stats section hidden when library has zero loans
- Libraries truncated to 6 by default, "Show all N libraries" button for expansion
- "Create Library" button opens modal

### 3.1a Dashboard Information Density
- **Priority ordering**: Pending Requests → Overdue → Active Loans → Libraries
- **Pending Requests** section (top priority): blue highlight, max 3 shown, "View all" links to Notifications
- **Overdue** section: red highlight, max 3 shown, "View all" links to Notifications
- **Active Loans** ("Currently Borrowed"): max 5 shown, "View all" links to Notifications
- **Libraries**: max 6 shown, "Show all N libraries" button for inline expansion
- **CollapsibleSection** component wraps each section:
  - Header with title, count badge, chevron toggle
  - Truncation at maxItems with "View all N →" link
  - Collapse/expand state persisted to localStorage
  - Returns null when section has no items (no empty headers)
- Expected outcome: dashboard stays clean even with many items/loans/requests

### 3.2 Create Library
- Modal with: name, description, cover photo (optional)
- Slug auto-generated from name
- On success: library created, modal closes, list refreshed
- On failure: error shown in modal

### 3.3 Notifications Page (`/dashboard/notifications`)
- Accessed via NotificationBell dropdown or direct navigation
- Back link to Dashboard at top
- Shows "All caught up!" empty state when no pending requests or active loans
- **Pending Requests** section:
  - Shows borrow requests awaiting action
  - Each shows: borrower name, "wants to borrow", item name
  - Optional: return date and message from borrower
  - "Approve" button → calls `approve_borrow` RPC with 14-day default return date → schedules reminders → shows "Request approved" toast
  - "Decline" button → opens confirm dialog → updates request status to "declined" → shows "Request declined" toast
- **Overdue** section (red highlighting):
  - Shows loans past due date with red border
  - Each shows: item name, borrower name, days overdue count
  - "Mark Returned" button with confirm dialog
- **Currently Borrowed** section:
  - Shows active non-overdue loans
  - Each shows: item name, borrower name, days until due
  - "Due today" shown in amber for same-day returns
  - "Mark Returned" button → confirm dialog → calls `return_item` RPC → shows "Item marked as returned" toast
- **Realtime updates**: New borrow requests appear via SSE without page refresh
- Expected outcome: Owner manages all lending activity from one page

### 3.4 Notification Bell (NavBar)
- Bell icon in NavBar for authenticated users
- Badge count shows pending requests + overdue loans
- Dropdown shows notification list with type indicator (blue dot = request, red dot = overdue)
- "All caught up!" when no notifications
- Each notification links to `/dashboard/notifications`
- "View all notifications" link at bottom when items exist
- Dropdown closes on: click outside, Escape key, clicking a notification
- Realtime updates: new requests increment badge immediately
- Expected outcome: Quick overview of pending actions without leaving current page

### 3.5 Active Loans (Dashboard)
- Dashboard shows "Currently Borrowed" section with active loans
- Each shows: item name, borrower, due date, status
- Overdue items highlighted with red border and day counter
- "Mark Returned" button → confirm dialog → RPC → toast
- "Late" badge shown for overdue items

---

## 4. Library Detail

### 4.1 Item List
- Shows all items in the library
- Each item: photo, name, status badge (available/borrowed)
- "Add Item" button → navigates to add item page
- "Share" button → copies public link `/l/:slug`

### 4.2 Facet Definitions
- Owner can create custom metadata fields (text, number, boolean)
- Fields appear when adding items

### 4.3 Edit Item (`/dashboard/library/:id/edit/:itemId`)
- "Edit" link on each item card in library detail (visible on hover for desktop, always visible on mobile)
- Loads existing item data: name, description, photo, max borrow period, facet values
- Photo preview shows resolved URL (relative `/api/` paths resolved to backend `VITE_AYB_URL`)
- Can change photo (camera or gallery), crop, and upload new photo
- "Save Changes" button updates item via `ayb.records.update`
- Facet values: deletes old values, creates new ones
- Shows "Saving..." state during submission
- On success: toast "Item updated", navigate back to library detail
- On failure: inline error message + error toast
- Back link to library detail
- Expected outcome: Owner can edit any item's details and photo

### 4.4 Delete Library
- "Delete Library" button in library detail header (red text, subtle styling)
- Confirm dialog warns about deleting library + all items (shows item count)
- Deletes all items first (FK constraint handling), then deletes library
- On success: toast "Library deleted", navigate to dashboard
- On failure: error toast
- Expected outcome: Complete library removal with safety confirmation

---

## 5. Add Item

### 5.1 Form
- Photo options: Camera button (with `capture="environment"`) OR Gallery button (file picker)
- Both buttons visible side-by-side on mobile
- Photo preview with crop option
- Name (required), description (optional)
- Facet values based on library's facet definitions
- On success: item created with toast confirmation, navigate back to library
- On error: Toast notification + inline error message with friendly error text
- Expected outcome: User can choose camera OR existing photo from gallery

### 5.2 Photo Cropper
- Drag to pan image within crop area
- Pinch-to-zoom on mobile (two-finger gesture)
- Mouse wheel to zoom on desktop
- Crop area is square (1:1 aspect ratio)
- "Crop & Use" button applies crop, "Cancel" uses uncropped image
- Output image is 800x800 JPEG at 90% quality
- Expected outcome: Smooth crop experience on mobile and desktop

### 5.3 Barcode Scanner
- "Scan Barcode (ISBN / UPC)" button visible on Add Item form
- Clicking opens camera-based barcode scanner (Quagga2, rear camera)
- Scanner supports: EAN-13 (ISBN-13), EAN-8, UPC-A, Code 128, Code 39
- Scanner overlay shows targeting rectangle while active
- "Cancel" button closes scanner without action
- On detection: scanner closes, shows "Scanned: {code}" toast
- For ISBN barcodes: auto-looks up book title via Open Library API
  - If found: pre-fills Name with "Title by Author", Description with "ISBN: {code}"
  - If not found: pre-fills Description with "ISBN: {code}", Name left for user to fill
- For non-ISBN barcodes (UPC, etc.): pre-fills Description with "Barcode: {code} ({format})"
- Shows "Looking up barcode..." loading state during ISBN lookup
- Camera permission denied: shows error message with close button
- No camera found: shows "No camera found" error
- Expected outcome: Quick barcode scan auto-fills item details, especially useful for books

---

## 6. Public Browse

### 6.1 Public Library (`/l/:slug`)
- Shows library name, description
- Item grid with photos and status
- Search bar (filters items by name)
- Facet chips for filtering
- No authentication required

### 6.2 Public Item (`/l/:slug/:itemId`)
- Item detail: photo, name, description, facet values, status
- If available: "Borrow This" button
- If borrowed: shows "Borrowed" status, borrower name (if not private), return date

---

## 7. Borrowing Flow

### 7.1 Borrow Request
- User clicks "Borrow This" on an available item
- Form: name (required), phone (required), message (optional), return by date, private possession checkbox
- On success: request created via `request_borrow` RPC, navigate to confirmation page
- No account required (borrower identified by phone)

### 7.2 Borrow Confirmation (`/borrow/:requestId`)
- Shows request status: pending, approved, or declined
- Link back to library

### 7.3 Owner Notification
- Realtime SSE delivers new request to owner's dashboard
- Owner sees request in "Pending Requests" section

---

## 8. SMS Reminders

### 8.1 Reminder Schedule (on loan approval)
- Confirmation: sent immediately
- Upcoming: 2 days before due date (skipped if due in < 2 days)
- Due today: on due date
- Overdue: 1 day, 3 days, 7 days after due date

### 8.2 Delivery
- Reminders stored in DB with `scheduled_for` timestamp
- Cron worker (`worker/send-reminders.ts`) queries pending reminders
- Sends via Telnyx REST API
- Updates `sent_at` on success

---

## 9. Settings (`/dashboard/settings`)

### 9.1 Settings Page
- Displays user email (disabled, not editable)
- Display name input (optional) — how others see you
- Phone number input (optional) — used for SMS reminders
- "Save Changes" button saves profile to `user_profiles` table
- Creates new profile if none exists, updates existing profile if found
- Shows "Saving..." state during submission
- Shows toast on success ("Settings saved") or failure with error message
- Shows loading state while fetching profile
- Handles missing `user_profiles` table gracefully (empty form, no crash)
- Footer visible at bottom

### 9.2 Unit Preferences
- **Units section** in Settings page (between Theme and Danger Zone)
- Two options: "Imperial (mi, lb)" and "Metric (km, kg)"
- Default: Imperial
- Toggled via radio-style buttons (same styling as Theme toggle)
- Persisted to localStorage (`unit_system` key) for immediate effect
- Saved to `user_profiles.unit_system` column on profile save
- Loaded from profile on Settings page mount
- UnitContext provides `unitSystem` and `setUnitSystem` to all components
- Used by RunTracker stats (distance, pace, speed labels)
- Expected outcome: user's preferred units persist across sessions and apply everywhere

### 9.3 404 Not Found
- Unknown routes display "404 — Page not found" with description
- "Go Home" link navigates to `/`
- Works for both authenticated and unauthenticated users
- Footer visible at bottom

---

## 10. Cross-Cutting

### 10.1 Loading Skeletons
- All pages show contextual skeleton shimmer placeholders during data loading
- Skeletons match the layout of the content they replace (cards, grids, forms)
- Skeleton elements are hidden from screen readers (`aria-hidden="true"`)
- Container has `aria-label` describing what's loading (e.g. "Loading dashboard")
- Pages affected: Dashboard, LibraryDetail, AddItem, PublicItem, PublicLibrary, Settings, BorrowConfirmation
- Expected outcome: shimmer animation plays until data loads, then content appears

### 10.2 Toast Notifications
- Success/warning/error toasts for user feedback
- Success: green border, auto-dismiss after 4s
- Error: red border, auto-dismiss after 8s
- Warning: amber border, auto-dismiss after 6s
- Each toast has `role="alert"` for accessibility
- Dismiss button removes individual toast
- Maximum 5 visible toasts (oldest removed when exceeding limit)
- Used for: session expiry, load errors, create/update/delete results, settings save

### 10.3 PWA (Progressive Web App)
- `manifest.json` in `public/` enables "Add to Home Screen" on mobile
- Required fields: `name`, `short_name`, `start_url`, `display: standalone`, `icons`
- Icons: 192x192 and 512x512 PNG (both regular and maskable)
- `theme_color` matches sage brand color (#4a7c59)
- `background_color` matches warm-50 (#faf9f7) for splash screen
- `index.html` includes: `<link rel="manifest">`, `<meta name="theme-color">`, `<link rel="apple-touch-icon">`, Apple Web App meta tags
- Expected outcome: app installable on Android Chrome, mobile Safari (15.4+), Edge
- Portrait-primary orientation lock

### 10.4 Image Optimization
- All remote item images use `loading="lazy"` for deferred loading
- All remote item images use `decoding="async"` for non-blocking decode
- All remote item images use `srcset` with responsive size variants (375w, 640w, 768w, 1024w, 1280w)
- `sizes` attribute provides hints for browser image selection based on viewport
- Query params for image sizing (`?w=375`, `?w=640`, etc.) prepared for future backend/CDN support
- Currently all srcset URLs resolve to same image (AYB ignores unknown params), but semantic HTML is ready
- Pages affected: LibraryDetail, PublicLibrary, PublicItem
- Client-side preview images (AddItem photo preview) do NOT use lazy loading or srcset (data URLs)
- Expected outcome: faster initial page loads, reduced bandwidth on pages with many items, future-ready for image resizing

### 10.5 React Router v7 Compatibility
- `BrowserRouter` in `main.tsx` includes `future` flags: `v7_startTransition`, `v7_relativeSplatPath`
- All test `BrowserRouter`/`MemoryRouter` wrappers include matching future flags
- No React Router deprecation warnings emitted during dev or test
- Expected outcome: smooth upgrade path when React Router v7 is adopted

### 10.6 Responsive Design
- Mobile-first: 44px minimum touch targets
- NavBar collapses brand text on small screens
- Forms and grids adapt to viewport
- Tested on iPhone SE 2021 viewport (375x667)
- No overlapping or colliding elements on small screens
- No horizontal overflow on any page
- Text wraps properly within containers (word-wrap: break-word)
- Touch targets have `touch-manipulation` CSS for improved responsiveness
- Active states for buttons (darker on tap)
- All pages render correctly on mobile:
  - Landing page (no negative margins causing overlap)
  - Login/Signup pages
  - Dashboard
  - Library detail
  - Add item (camera + gallery buttons)
  - Public library/item
  - Settings
  - Borrow confirmation
- Expected outcome: No pinch-zoom needed, content fits viewport, smooth touch interactions

### 10.7 Service Worker (Offline Caching)
- Service worker registered in production mode only
- Cache-first strategy for static assets (JS, CSS, images, fonts)
- Network-first strategy with cache fallback for API calls and HTML pages
- Version-based cache management (v1: static, dynamic, API)
- Update detection with notification prompt
- Skip waiting message support for immediate updates
- Offline fallback to cached index.html for navigation requests
- Expected outcome: app works offline, updates prompt user to refresh

### 10.8 Push Notifications
- User can enable/disable push notifications in Settings
- Permission request on first subscription attempt
- VAPID-based web push subscription
- Subscription stored in backend (endpoint + encryption keys)
- Notifications sent when borrow requests are created
- Notification click opens dashboard
- Graceful degradation when notifications not supported
- Settings UI shows subscription status with enable/disable toggle
- Expected outcome: users receive instant alerts for borrow requests

### 10.9 Footer
- "Created with [heart] on Allyourbase" on all pages
- Links to allyourbase.io in new tab

### 10.10 Dark Mode
- **Theme toggle**: Sun/moon/monitor icon button in NavBar (authenticated) and Landing/Auth page header (unauthenticated)
- **Three modes**: Light, Dark, System — cycles on click (light → dark → system → light)
- **System preference detection**: When mode is "system", follows `prefers-color-scheme: dark` media query
- **Persistence**: Theme preference saved to `localStorage` under key `theme`
- **FOUC prevention**: Inline `<script>` in `index.html` applies dark class before React mounts
- **Dark class strategy**: Tailwind `darkMode: 'class'` — `dark` class on `<html>` element
- **Theme color meta tag**: Updates dynamically — sage (#4a7c59) for light, dark gray (#111827) for dark
- **Settings page**: Dedicated "Appearance" section with Light/Dark/System radio-style buttons
- **Color scheme (dark)**:
  - Page background: gray-900
  - Surface (cards, inputs, navbar): gray-800
  - Primary text: gray-100
  - Secondary text: gray-300/gray-400
  - Borders: gray-700
  - Skeleton shimmer: gray-700 → gray-600 gradient
  - Sage brand colors: slightly lighter (sage-300/sage-400)
  - Status badges: semi-transparent dark backgrounds (green-900/30, amber-900/30, etc.)
- **All pages support dark mode**: Landing, Auth, Dashboard, LibraryDetail, AddItem, Settings, PublicLibrary, PublicItem, BorrowConfirmation, NotFound
- **Component utility classes**: `.card`, `.input`, `.btn-secondary`, `.btn-danger`, `.badge-*` all have dark overrides in CSS
- **Expected outcome**: Smooth dark mode with no flash, respects system preference, persists across sessions

### 10.11 Code Splitting & Lazy Loading (Performance Optimization)
- **Route-based code splitting**: Each page component loaded as separate chunk
- **Lazy-loaded routes**: Dashboard, LibraryDetail, AddItem, Settings, PublicLibrary, PublicItem, BorrowConfirmation, NotFound
- **Suspense boundaries**: Loading fallback shows shimmer skeleton during chunk load
- **Chunk load failures**: Error boundary catches dynamic import errors, shows friendly message with reload button
- **Intelligent preloading**: Critical routes preloaded on hover/focus (e.g., Dashboard chunk preloaded when user on login page)
- **Expected outcomes**:
  - Main bundle reduced by 30-50% (target: <100 KB gzipped)
  - Initial page load only includes Landing page + core chunks
  - Route transitions show loading state for <300ms on fast networks
  - Lazy chunks load on-demand when route accessed
  - No duplicate dependencies across chunks
  - Faster initial page load, especially on slower connections
- **Graceful degradation**: If chunk fails to load, error boundary shows retry option
- **Accessibility**: Loading states have aria-labels, error messages are announced to screen readers

---

## 11. E2E Golden Path

### 11.1 Full User Journey
- Register new owner account
- Create library from dashboard
- Add item with name + description
- Copy share link
- Visit public library page
- Click on item, see detail
- Submit borrow request (name, phone, message)
- Confirm borrow request sent
- Return to dashboard, see pending request
- Approve request, verify toast
- Verify item shows as borrowed
- Mark as returned, verify toast
- Expected outcome: complete flow works end-to-end without errors

### 11.2 Settings Access
- Navigate to settings via avatar dropdown
- Settings page loads with email, display name, phone fields

### 11.3 404 Handling
- Unknown routes show "Page not found" with "Go Home" link

---

## 12. Run Tracker (`/dashboard/run`)

### 12.1 GPS Tracking
- Uses `navigator.geolocation.watchPosition` for real-time GPS
- Accuracy filter: readings with accuracy > 30m are ignored
- Error handling: permission denied, position unavailable, timeout — each shows specific error message
- Graceful degradation: shows error when geolocation not supported
- Cleanup: watch cleared on component unmount

### 12.2 Map Display
- Leaflet map with OpenStreetMap tiles (no API key required)
- Current position shown as blue circle marker with white border
- Route drawn as sage-green polyline (weight 4, semi-transparent)
- Auto-follows current position while tracking
- "Re-center" button appears when user pans away manually
- Default center: NYC (40.7128, -74.0060) when no GPS position available
- Dark mode tile variant (CartoDB dark matter)
- Mobile-optimized: full width, touch gestures enabled

### 12.3 Stats Display
- 2×2 grid showing: Distance, Duration, Pace, Speed
- Distance: uses unit preference (mi or km), formatted to 2 decimal places
- Duration: HH:MM:SS format, updated every second
- Pace: min/mi or min/km, shown as M:SS format (requires >10m distance)
- Speed: mph or km/h, formatted to 1 decimal place (requires >10m distance)
- Shows "--" placeholders when idle or no data available
- Updates live as GPS data streams in

### 12.4 Run State Machine
- States: idle → running → paused → finished
- **Idle**: "Start Run" button, hint text with runner emoji
- **Running**: "Pause" and "Finish" buttons, timer and GPS active
- **Paused**: "Resume" and "Finish" buttons, timer paused, GPS still receiving (but not recording to track)
- **Finished**: "Run Complete!" summary with GPS point count, "New Run" button
- **New Run**: resets all state to idle

### 12.5 Timer
- Timer tracks elapsed time excluding paused durations
- Uses `setInterval` at 1s resolution
- Pause time accumulated via refs (not affected by re-renders)
- Timer stops on Finish or component unmount

### 12.6 Route
- Accessible from NavBar "Run" link (authenticated only)
- Auth guard: redirects to `/login` if not authenticated
- Lazy-loaded route (code splitting)

---

## 13. Returning User Data

### 13.1 Pre-existing Data Loading
- Dashboard loads all libraries, items, loans, and borrow requests on mount
- Pre-seeded data (from seed.ts or prior sessions) displays correctly
- Library cards show accurate item counts
- Active loans display in "Currently Borrowed" section
- Cross-session: data persists after logout + re-login

### 13.2 Test Data Isolation
- E2E global-setup only cleans data from `test-%@example.com` users
- Seed users (`@sigil.app`, `@shareborough.com`) are preserved across test runs
- Each e2e test creates its own data via API in beforeAll (self-contained)

---

## Test Coverage Matrix

| Behavior | Component Test | E2E Test | Production E2E | Status |
|----------|---------------|----------|----------------|--------|
| Registration | AuthPage.test.tsx | auth.spec.ts | email-verification.spec.ts | Covered |
| Login | AuthPage.test.tsx | auth.spec.ts | production-smoke.spec.ts | Covered |
| Email verification | — | email-verification.spec.ts | — | Complete |
| Password reset | — | password-reset.spec.ts | — | Complete |
| Account deletion | Settings.test.tsx | comprehensive.spec.ts (1.9) | — | Covered |
| OAuth buttons present | AuthPage.test.tsx | oauth-e2e.test.tsx | Covered |
| OAuth Google popup flow | AuthPage.test.tsx | oauth-e2e.test.tsx | Covered |
| OAuth GitHub popup flow | AuthPage.test.tsx | oauth-e2e.test.tsx | Covered |
| OAuth error display | AuthPage.test.tsx | oauth-e2e.test.tsx | Covered |
| OAuth loading/disabled state | AuthPage.test.tsx | oauth-e2e.test.tsx | Covered |
| OAuth buttons re-enable on error | AuthPage.test.tsx | oauth-e2e.test.tsx | Covered |
| OAuth or divider | AuthPage.test.tsx | oauth-e2e.test.tsx | Covered |
| Sign out + redirect | NavBar.test.tsx | auth.spec.ts | Covered |
| Avatar dropdown | NavBar.test.tsx | navigation.test.tsx | Covered |
| Top nav buttons (unauth) | Landing.test.tsx | navigation.test.tsx | Covered |
| Top nav buttons (auth) | NavBar.test.tsx | navigation.test.tsx | Covered |
| Mobile layout (iPhone SE) | mobile.test.tsx | navigation.test.tsx | Covered |
| Auth guards | AuthGuards.test.tsx | auth.spec.ts | Covered |
| Session persistence | SessionPersistence.test.tsx | auth.spec.ts | Covered |
| Session expiry (401) | rpc.test.ts, SessionPersistence.test.tsx | — | Covered |
| Offline banner | OfflineBanner.test.tsx | — | Covered |
| Offline reconnect (auto) | OfflineBanner.test.tsx | — | Covered |
| Loading skeletons | Skeleton.test.tsx, all page tests | golden-path.spec.ts | Covered |
| Settings page | Settings.test.tsx | golden-path.spec.ts | Covered |
| 404 not found | NotFound.test.tsx, AuthGuards.test.tsx | golden-path.spec.ts | Covered |
| Library CRUD | Dashboard.test.tsx, CreateLibrary.test.tsx | library.spec.ts, golden-path.spec.ts, comprehensive.spec.ts | Covered |
| Item CRUD | AddItem.test.tsx, LibraryDetail.test.tsx | items.spec.ts, golden-path.spec.ts, comprehensive.spec.ts | Covered |
| Photo cropper (drag, pinch, zoom) | ImageCropper.test.tsx | photo-cropper.spec.ts | Complete |
| Barcode scanner (ISBN/UPC) | BarcodeScanner.test.tsx (12), barcode.test.ts (17), AddItem.test.tsx (4) | barcode-scanner.spec.ts (4), comprehensive.spec.ts (5.3) | Covered |
| Public browse | PublicLibrary.test.tsx, PublicItem.test.tsx | public.spec.ts, golden-path.spec.ts | Covered |
| Borrow request | PublicItem.test.tsx | borrow-flow.spec.ts, golden-path.spec.ts | Covered |
| Borrow confirmation | BorrowConfirmation.test.tsx | borrow-flow.spec.ts, golden-path.spec.ts | Covered |
| Library stats | Dashboard.test.tsx | golden-path.spec.ts | Covered |
| PWA manifest | PWA.test.tsx | — | Covered |
| Image lazy loading | ImageOptimization.test.tsx | — | Covered |
| React Router v7 flags | RouterMigration.test.tsx | — | Covered |
| SMS reminders | reminders.test.ts, sms.test.ts, sendReminders.test.ts | — | Covered |
| Toast notifications | Toast.test.tsx | — | Covered |
| Mobile responsiveness | mobile.test.tsx | mobile-responsiveness.spec.ts (5) | Covered |
| Footer branding | Footer.test.tsx | — | Covered |
| Service worker registration | ServiceWorker.test.tsx | — | Covered |
| Service worker caching | ServiceWorker.test.tsx | — | Covered |
| Service worker updates | ServiceWorker.test.tsx | — | Covered |
| Push notification permission | PushNotifications.test.tsx | — | Covered |
| Push notification subscribe | PushNotifications.test.tsx | — | Covered |
| Push notification unsubscribe | PushNotifications.test.tsx | — | Covered |
| Push notification UI in settings | Settings.test.tsx, PushNotifications.test.tsx | — | Covered |
| Code splitting (lazy routes) | CodeSplitting.test.tsx | — | Covered |
| Suspense loading fallback | LoadingFallback.test.tsx | — | Covered |
| Chunk error boundary | ChunkErrorBoundary.test.tsx | — | Covered |
| Responsive images (srcset) | ResponsiveImage.test.tsx | — | Covered |
| Dark mode toggle | ThemeContext.test.tsx, ThemeToggle.test.tsx | dark-mode.spec.ts | Covered |
| Dark mode persistence | ThemeContext.test.tsx | dark-mode.spec.ts | Covered |
| Dark mode system preference | ThemeContext.test.tsx | dark-mode.spec.ts | Covered |
| Dark mode settings UI | ThemeContext.test.tsx | dark-mode.spec.ts | Covered |
| Theme section in settings | Settings.test.tsx | dark-mode.spec.ts | Covered |
| Settings save success toast | Settings.test.tsx | comprehensive.spec.ts | Covered |
| Notifications page | Notifications.test.tsx | golden-path.spec.ts, comprehensive.spec.ts | Covered |
| Notification bell | NavBar.test.tsx | smoke-crud.spec.ts | Covered |
| Pending request approve | Notifications.test.tsx | golden-path.spec.ts, borrow-flow.spec.ts | Covered |
| Pending request decline | Notifications.test.tsx | borrow-flow.spec.ts | Covered |
| Overdue loan display | Notifications.test.tsx, Dashboard.test.tsx | — | Covered |
| Mark returned (notifications) | Notifications.test.tsx | golden-path.spec.ts | Covered |
| Edit item | EditItem.test.tsx | smoke-crud.spec.ts | Covered |
| Edit item photo resolution | EditItem.test.tsx | — | Covered |
| Delete library | LibraryDetail.test.tsx | smoke-crud.spec.ts | Covered |
| Dashboard load error | Dashboard.test.tsx | — | Covered |
| Dashboard skeleton shimmer | Dashboard.test.tsx | golden-path.spec.ts | Covered |
| LibraryDetail skeleton shimmer | LibraryDetail.test.tsx | — | Covered |
| Run Tracker map + GPS | RunTracker.test.tsx | run-tracker.spec.ts | Covered |
| Run Tracker state machine | RunTracker.test.tsx | run-tracker.spec.ts | Covered |
| Run Tracker stats display | RunTracker.test.tsx | run-tracker.spec.ts | Covered |
| GPS tracking hook | RunTracker.test.tsx | run-tracker.spec.ts | Covered |
| Geo math utilities | geo.test.ts | — | Covered |
| Unit conversions | units.test.ts | — | Covered |
| Unit preference setting | Settings.test.tsx | run-tracker.spec.ts | Covered |
| Dashboard overflow protection | Dashboard.test.tsx, CollapsibleSection.test.tsx | — | Covered |
| CollapsibleSection | CollapsibleSection.test.tsx | — | Covered |
| Notifications overflow | Notifications.test.tsx | — | Covered |
| Returning user data | — | returning-user.spec.ts | Covered |
| Cross-session persistence | — | returning-user.spec.ts | Covered |
| Pre-existing loan display | Dashboard.test.tsx | returning-user.spec.ts | Covered |
| Test data isolation | — | returning-user.spec.ts | Covered |
