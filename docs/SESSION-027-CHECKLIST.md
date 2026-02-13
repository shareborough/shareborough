# Session 027 Checklist — Run Tracker, Pre-Seeded Data, Dashboard Overflow, Unit Preferences

## Stream A: Pre-Seeded Data Investigation & Returning User Tests

- [x] A1. Fix `global-setup.ts` — scope cleanup to test users only (`test-%@example.com`)
- [x] A2. Enhance `seed.ts` — rich content for alice/bob (libraries, items, loans, borrowers, requests)
- [x] A3. Create `scripts/diagnose.ts` — diagnostic API script (raw fetch, no Playwright)
- [x] A4. Create `e2e/returning-user.spec.ts` — 5 returning-user e2e scenarios

## Stream B: Live GPS Running Tracker with Map

- [x] B1. Install `leaflet` + `react-leaflet` + `@types/leaflet`
- [x] B2. Create `src/lib/geo.ts` — GPS math utilities (haversine, totalDistance, pace, speed, filtering, formatting)
- [x] B3. Create `src/lib/units.ts` — unit conversions (meters↔km/miles, speed, labels)
- [x] B4. Create `src/hooks/useGps.ts` — GPS tracking hook (watchPosition, accuracy filter, error handling)
- [x] B5. Create `src/components/RunMap.tsx` — Leaflet map with route polyline + position marker
- [x] B6. Create `src/components/RunStats.tsx` — live stats overlay (distance, duration, pace, speed)
- [x] B7. Create `src/pages/RunTracker.tsx` — state machine (idle/running/paused/finished)
- [x] B8. Add `/dashboard/run` route in `App.tsx` (lazy import + auth guard)
- [x] B9. Add "Run" nav link in `NavBar.tsx`

## Stream C: Unit Preference Setting

- [x] C1. Add `unit_system` to `UserProfile` type in `types.ts`
- [x] C2. Create `src/contexts/UnitContext.tsx` — metric/imperial context + localStorage persistence
- [x] C3. Add `UnitProvider` to `main.tsx`
- [x] C4. Add unit toggle to Settings page (between Theme and Danger Zone)
- [x] C5. Save/load `unit_system` in Settings profile handler

## Stream D: Dashboard Overflow Protection

- [x] D1. Create `src/components/CollapsibleSection.tsx` — reusable collapsible with truncation + persistence
- [x] D2. Refactor `Dashboard.tsx` — priority ordering, pending requests, overdue/active split, library truncation
- [x] D3. Refactor `Notifications.tsx` — CollapsibleSection wrapping with maxItems=10

## Stream E: Tests

- [x] E1. `tests/geo.test.ts` — 28 tests (haversine, totalDistance, pace, speed, filtering, formatting)
- [x] E2. `tests/units.test.ts` — 6 tests (conversions + labels)
- [x] E3. `tests/RunTracker.test.tsx` — 10 tests (state machine, GPS mocking, stats display)
- [x] E4. `tests/CollapsibleSection.test.tsx` — 10 tests (truncation, expand, persistence, empty state)
- [x] E5. Update `tests/Dashboard.test.tsx` — add borrow_requests mock to all 11 tests
- [x] E6. Update `tests/Settings.test.tsx` — add unit_system to save assertions
- [x] E7. `e2e/returning-user.spec.ts` — 5 scenarios (pre-existing data, cross-session, mark returned)
- [x] E8. `e2e/run-tracker.spec.ts` — 6 scenarios (map, state flow, GPS tracking, unit switching)
- [x] E9. Full vitest suite — 698+ tests passing across 54 files

## Stream F: Documentation

- [x] F1. Update `BEHAVIORS.md` — Run Tracker (S12), Unit Preferences (S9.2), Dashboard Density (S3.1a), Returning User (S13), Test Coverage Matrix
- [x] F2. Update `CHECKLIST.md` — Phase 10 (Session 027 items), status update
- [x] F3. Create `docs/SESSION-027-CHECKLIST.md` (this file)
- [x] F4. Create `handoffs/027-run-tracker-preseeded-overflow.md`

## New Files Created

| File | Purpose |
|------|---------|
| `src/lib/geo.ts` | GPS math (haversine, pace, speed, formatting) |
| `src/lib/units.ts` | Metric/imperial conversions + labels |
| `src/hooks/useGps.ts` | GPS tracking hook (watchPosition) |
| `src/contexts/UnitContext.tsx` | Unit preference context |
| `src/components/RunMap.tsx` | Leaflet map with route + marker |
| `src/components/RunStats.tsx` | Live stats overlay |
| `src/components/CollapsibleSection.tsx` | Reusable collapsible section |
| `src/pages/RunTracker.tsx` | Run tracker page |
| `scripts/diagnose.ts` | Diagnostic API script |
| `tests/geo.test.ts` | Geo utility tests (28) |
| `tests/units.test.ts` | Unit conversion tests (6) |
| `tests/RunTracker.test.tsx` | RunTracker page tests (10) |
| `tests/CollapsibleSection.test.tsx` | CollapsibleSection tests (10) |
| `e2e/returning-user.spec.ts` | Returning user e2e (5) |
| `e2e/run-tracker.spec.ts` | Run tracker e2e (6) |

## Files Modified

| File | Change |
|------|--------|
| `e2e/global-setup.ts` | Scoped cleanup to test users only |
| `scripts/seed.ts` | Rich content creation (libraries, items, loans, etc.) |
| `src/App.tsx` | Added RunTracker lazy route |
| `src/main.tsx` | Added UnitProvider |
| `src/components/NavBar.tsx` | Added "Run" link |
| `src/types.ts` | Added unit_system to UserProfile |
| `src/pages/Settings.tsx` | Unit toggle + unit_system save/load |
| `src/pages/Dashboard.tsx` | Priority ordering, CollapsibleSection, pending requests |
| `src/pages/Notifications.tsx` | CollapsibleSection wrapping |
| `tests/testHelpers.tsx` | Added UnitProvider wrapper |
| `tests/Dashboard.test.tsx` | Added borrow_requests mock |
| `tests/Settings.test.tsx` | Added unit_system assertions |
| `docs/BEHAVIORS.md` | New sections 12, 13, 9.2, 3.1a + test matrix rows |
| `docs/CHECKLIST.md` | Phase 10 + status update |

## Test Summary

- **Unit tests**: 698+ passing across 54 files (28 geo + 6 units + 10 RunTracker + 10 CollapsibleSection + 644 existing)
- **E2E tests**: ~130 across 19 spec files (5 returning-user + 6 run-tracker + ~119 existing)
