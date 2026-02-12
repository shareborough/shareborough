# Session 023 Checklist — Notifications UI, Camera Fix, Smoke Tests

## Completed

- [x] **Notifications page** — Created `src/pages/Notifications.tsx` with approve/decline/return actions
- [x] **Dashboard cleanup** — Removed inline "Pending Requests" section from Dashboard (moved to Notifications page)
- [x] **NotificationBell links** — Updated bell dropdown to link to `/dashboard/notifications` instead of `/dashboard`
- [x] **App routing** — Added `/dashboard/notifications` route in `App.tsx`
- [x] **Camera fix** — Changed `capture` to `capture="environment"` in AddItem + EditItem (iOS blank camera fix)
- [x] **Delete library** — Added "Delete Library" button + confirm dialog to LibraryDetail page
- [x] **Smoke test updates** — Added library deletion step to `smoke-crud.spec.ts` and `prod-smoke.spec.ts`
- [x] **Dashboard unit tests** — Updated `tests/Dashboard.test.tsx` (removed approve/decline tests, fixed mock counts)
- [x] **TypeScript check** — `npx tsc --noEmit` passes clean
- [x] **Vite build** — Production build succeeds (Notifications chunk: 9.68 kB)

## Still TODO (for next session)

- [ ] **Deploy to staging** — `./scripts/sync-and-deploy.sh "Session 023: notifications, camera fix, smoke tests" --staging-only`
- [ ] **Deploy to production** — After staging looks good, `./scripts/sync-and-deploy.sh "Session 023" --prod-only` or full pipeline
- [ ] **Launch EC2 E2E** — Run `./scripts/launch-ec2-tests.sh` or let deploy pipeline handle it
- [ ] **Verify camera fix on iPhone** — Test `capture="environment"` on real device against staging/prod
- [ ] **Update master checklist** — Add Session 023 items to `docs/CHECKLIST.md`
