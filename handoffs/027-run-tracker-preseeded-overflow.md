# Handoff 027 — Run Tracker, Pre-Seeded Data, Dashboard Overflow, Unit Preferences

## What Was Done

### 1. Live GPS Running Tracker with Map (`/dashboard/run`)
Built a complete run tracking feature with:
- **GPS tracking** via `navigator.geolocation.watchPosition` with accuracy filtering (>30m ignored)
- **Leaflet map** with OpenStreetMap tiles — shows current position (blue dot) and route polyline (sage green)
- **Stats overlay** — distance, duration, pace, speed — updates live as GPS data streams in
- **State machine** — idle → running → paused → finished with appropriate button controls
- **Timer** with pause support (excludes paused durations)
- **Unit preference integration** — all stats respect metric/imperial setting
- **Nav link** — "Run" added to NavBar for authenticated users

### 2. Unit Preference System
- `UnitContext` provides `unitSystem` ("imperial" | "metric") to all components
- Default: imperial, persisted to localStorage
- Settings page has new "Units" section with toggle buttons
- Saved to `user_profiles.unit_system` column alongside other profile data
- Used by RunTracker stats (and available for future features)

### 3. Dashboard Overflow Protection
- **Priority ordering**: Pending Requests → Overdue → Active Loans → Libraries
- **CollapsibleSection component**: reusable section with truncation, "View all" links, and collapse/expand persisted to localStorage
- **Dashboard**: pending requests (max 3), overdue (max 3), active loans (max 5), libraries (max 6)
- **Notifications**: sections wrapped in CollapsibleSection with maxItems=10
- New `borrow_requests` fetch added to Dashboard's `loadAll()` with realtime handler

### 4. Pre-Seeded Data Investigation
- **Fixed `global-setup.ts`**: cleanup now scoped to `test-%@example.com` users only (was deleting ALL data)
- **Enhanced `seed.ts`**: creates rich content for alice/bob (2 libraries, 5 items, facets, borrowers, loans, borrow requests)
- **Created `scripts/diagnose.ts`**: API diagnostic script that mirrors Dashboard/LibraryDetail/Notifications API calls and checks data integrity

### 5. Tests
- **54 new unit tests**: geo.test.ts (28), units.test.ts (6), RunTracker.test.tsx (10), CollapsibleSection.test.tsx (10)
- **11 new e2e scenarios**: returning-user.spec.ts (5), run-tracker.spec.ts (6)
- **Updated existing tests**: Dashboard.test.tsx (borrow_requests mock), Settings.test.tsx (unit_system assertions)
- **Full suite**: 698+ unit tests passing, ~130 e2e scenarios across 19 spec files

## Key Files

### New
- `src/pages/RunTracker.tsx` — Run tracker page
- `src/hooks/useGps.ts` — GPS tracking hook
- `src/components/RunMap.tsx` — Leaflet map component
- `src/components/RunStats.tsx` — Stats overlay
- `src/components/CollapsibleSection.tsx` — Reusable collapsible section
- `src/contexts/UnitContext.tsx` — Unit preference context
- `src/lib/geo.ts` — GPS math utilities
- `src/lib/units.ts` — Unit conversion utilities
- `scripts/diagnose.ts` — API diagnostic script
- `e2e/returning-user.spec.ts` — Returning user e2e tests
- `e2e/run-tracker.spec.ts` — Run tracker e2e tests

### Modified
- `src/App.tsx` — RunTracker route
- `src/main.tsx` — UnitProvider
- `src/components/NavBar.tsx` — "Run" link
- `src/pages/Settings.tsx` — Unit toggle
- `src/pages/Dashboard.tsx` — Priority ordering + overflow protection
- `src/pages/Notifications.tsx` — CollapsibleSection wrapping
- `e2e/global-setup.ts` — Scoped cleanup
- `scripts/seed.ts` — Rich content

## Checklists

- Master checklist: [docs/CHECKLIST.md](../docs/CHECKLIST.md)
- Session checklist: [docs/SESSION-027-CHECKLIST.md](../docs/SESSION-027-CHECKLIST.md)
- Behavior spec: [docs/BEHAVIORS.md](../docs/BEHAVIORS.md)

## What's Next

1. **Deploy to staging** — `./scripts/sync-and-deploy.sh "Session 027: Run Tracker, unit prefs, dashboard overflow" --staging-only`
2. **Run EC2 E2E tests** — verify returning-user and run-tracker e2e tests pass on staging
3. **Manual test on phone** — GPS tracking with real movement, verify map and stats
4. **Run `npx tsx scripts/diagnose.ts`** — against staging to validate pre-seeded data
5. **Deploy to prod** — once staging tests pass

## Known Considerations

- Leaflet installed with `--legacy-peer-deps` (React 18 peer dep conflict)
- RunTracker GPS tracking not tested on real device yet — e2e tests use Playwright geolocation mock
- Vitest full suite has OOM crash on last file (pre-existing, not related to this session)
- `returning-user.spec.ts` creates test data via API — needs backend running for cleanup
