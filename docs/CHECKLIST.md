# Shareborough — Master Implementation Checklist

## Phase 1: Foundation

- [x] Project vision & spec document
- [x] Architecture document
- [x] Database schema (schema.sql)
- [x] Implementation checklist
- [x] Scaffold frontend (React + TypeScript + Vite + Tailwind)
- [x] AYB client setup and API layer
- [x] RPC helper for PostgreSQL function calls
- [x] Type definitions
- [x] Test setup (vitest + testing-library)

## Phase 2: Owner Experience

- [x] Auth flow (signup / login / logout)
- [x] Library creation (name, slug, description, cover photo)
- [x] Library list view (owner dashboard)
- [x] Library settings (visibility, borrower name display)
- [x] Facet definitions (create/edit custom facets per library)
- [x] Add item flow (photo upload, name, description, facet values)
- [x] Camera capture on mobile (`capture="environment"` on photo input)
- [x] Item list view within library
- [x] Item delete

## Phase 3: Public Browse

- [x] Public library page (`/l/:slug`)
- [x] Item grid with photos
- [x] Facet filtering (chips)
- [x] Search items by name
- [x] Item detail view
- [x] Availability status display (green/amber dots)

## Phase 4: Borrowing Flow

- [x] "Borrow This" button on available items
- [x] Borrower form (name + phone number only — no account!)
- [x] `request_borrow` RPC call
- [x] Borrow confirmation page
- [x] Owner notification (realtime via SSE)
- [x] Approve/decline UI for owner
- [x] `approve_borrow` RPC call with return date
- [x] Item status updates (available → borrowed)

## Phase 5: Loan Management

- [x] Active loans list (owner dashboard)
- [x] Loan detail (borrower info, dates, status)
- [x] Mark as returned (`return_item` RPC)
- [x] Late item highlighting
- [x] Overdue day counter

## Phase 6: SMS Reminders

- [x] Reminder scheduling logic (on loan creation)
- [x] Confirmation message (on approve)
- [x] Upcoming reminder (2 days before)
- [x] Due today reminder
- [x] Overdue reminders (1d, 3d, 7d)
- [x] Reminder message templates
- [x] SMS architecture documentation
- [x] Telnyx integration (worker/sms.ts — REST API, no SDK needed)
- [x] Cron worker for sending pending reminders (worker/send-reminders.ts)
- [x] Wire scheduleReminders() into Dashboard approve flow

## Phase 7: Polish & Delight

- [x] Responsive mobile-first design
- [x] OG meta tags for library sharing
- [x] Empty states with helpful prompts
- [x] Custom color scheme (sage + warm palette)
- [x] Component utility classes (btn-primary, card, badge, input)
- [x] Avatar dropdown menu (My Libraries, Settings, Sign out)
- [x] Auth guards on dashboard routes (redirect to /login if not authed)
- [x] Login/signup redirect to /dashboard if already authed
- [x] Fix CORS: SDK uses relative URLs via Vite proxy
- [x] Behaviors acceptance spec (docs/BEHAVIORS.md)
- [x] Settings page (`/dashboard/settings`) — display name, phone, email
- [x] 404 catch-all route (NotFound page)
- [x] Loading skeletons — shimmer placeholders on all 7 pages
- [x] E2E golden path Playwright test
- [x] PWA manifest — installable on mobile + desktop
- [x] Library stats — items lent count, unique friends helped
- [x] Image optimization — lazy loading + responsive srcset
- [x] React Router v7 migration — future flags enabled
- [x] Service worker — offline caching, update detection
- [x] Push notifications — VAPID-based subscriptions
- [x] Responsive images — ResponsiveImage component with srcset
- [x] Performance optimization — code splitting, lazy route chunks
- [x] Barcode scanner — Quagga2 camera-based ISBN/UPC scanning (Session 016)
- [x] ISBN lookup — Open Library API auto-fills item name/description (Session 016)
- [x] Seed data script — demo user + sample libraries for dev/testing (Session 016)
- [x] Test coverage audit — comprehensive audit of all test files (Sessions 011, 016, 020)
- [x] Dark mode — theme toggle (light/dark/system), system preference detection, FOUC prevention, all pages + components (Session 019)
- [x] Fix borrow.ts Unauthorized handling + CodeSplitting test mock (Session 022)
- [x] Test user seeding — 7 test accounts (sigil.app + short) seeded to production (Session 020)
- [x] README with phone testing — PWA install instructions, test accounts table, "Things to Try" guide (Session 020)

## Phase 8: Deployment & CI/CD

- [x] Backend deployment (AYB on AWS EC2 with Docker Compose)
- [x] Domain setup (api.shareborough.com, shareborough.com)
- [x] SSL/TLS (valid certificates on both domains)
- [x] Environment configuration (CORS, JWT secrets, database)
- [x] Sync script (`sync-shareborough.sh`) — dev repo to public repo
- [x] Deploy script (`sync-and-deploy.sh`) — sync, test, build, push, deploy
- [x] EC2 E2E test infrastructure (`launch-ec2-tests.sh` + `run-integration-tests-ec2.sh`)
- [x] S3 artifact storage for test results (`s3://ayb-ci-artifacts/e2e-runs/`)
- [x] Auto-seed on deploy — seed.ts integrated into sync-and-deploy.sh + EC2 runner (Session 017)
- [x] Mailpail email testing — SES receipt rule for test.shareborough.com, mailpail helper (Session 018)
- [x] Set Cloudflare secrets — `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_EMAIL` in GitHub (Session 022)
- [x] Staging deploy pipeline — staging-first workflow with EC2 E2E gate (Session 022)
- [x] Staging Playwright config — `playwright.config.staging.ts` targets `staging.shareborough.pages.dev`
- [x] EC2 staging E2E runner — `run-staging-e2e-ec2.sh` lightweight Playwright-only runner
- [ ] **Configure staging subdomain** — `staging.shareborough.com` CNAME in Cloudflare DNS (optional — pages.dev URL works)
- [ ] Production monitoring (error tracking, uptime)

## Phase 9: SDK & Upstream

- [x] Fix 2 TS errors — `@ts-expect-error` workaround for `signInWithOAuth` + `deleteAccount` (Session 019)
- [ ] **Republish SDK** — add proper type exports for `signInWithOAuth` + `deleteAccount` to `@allyourbase/js`
- [ ] **Clean up allyourbase_dev** — remove original `examples/shareborough/`

## Priority Queue (next up)

1. **Accessibility audit** — WCAG 2.1 AA compliance pass
2. **React Router v7 upgrade** — full upgrade (future flags already enabled)
3. **Backend for push notifications** — VAPID keys, subscription storage, sending
4. **Backend image resizing** — implement `?w=` query param in AYB storage handler
5. **Republish SDK** — proper type exports for signInWithOAuth + deleteAccount
6. **Staging CNAME** — `staging.shareborough.com` → Cloudflare Pages staging branch

## Current Status (Session 022)

- Backend API: LIVE at api.shareborough.com
- Frontend: Deployed to Cloudflare Pages via GitHub Actions CI/CD
- Production: https://shareborough.com (Cloudflare Pages, `main` branch)
- Staging: https://staging.shareborough.pages.dev (Cloudflare Pages, `staging` branch)
- Seed data: Auto-created on deploy (demo@shareborough.com / demo1234) + 7 test users
- Tests: 580+ unit tests passing across 47 vitest files, ~116 Playwright E2E tests across 16 spec files
- E2E: Run on EC2 via `launch-ec2-tests.sh`, results → `s3://ayb-ci-artifacts/e2e-runs/`
- Deploy pipeline:
  - `./scripts/sync-and-deploy.sh "message"` — full pipeline (staging → EC2 E2E → prod)
  - `./scripts/sync-and-deploy.sh "message" --staging-only` — staging only
  - `./scripts/sync-and-deploy.sh "message" --prod-only` — skip staging E2E
- Session 022: Fixed Cloudflare deploy auth, staging-first pipeline, test fixes (borrow.ts + CodeSplitting)

## Known Issues

- `@allyourbase/js@0.1.0` missing `signInWithOAuth` and `deleteAccount` type exports (workaround: `@ts-expect-error`)
- `photo-cropper.spec.ts` tests skip without `tests/fixtures/test-image.jpg`
- `email-verification.spec.ts` + `password-reset.spec.ts` skip without `MAILPAIL_DOMAIN` / `MAILPAIL_BUCKET`
- `production-smoke.spec.ts` only runs when production is live
- Vitest hangs on exit — known jsdom issue, all tests complete before hang

## Latest Session Checklist

See [docs/SESSION-022-CHECKLIST.md](./SESSION-022-CHECKLIST.md)
