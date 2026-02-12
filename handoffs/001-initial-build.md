# Handoff 001 — Shareborough Initial Build

**Date:** 2026-02-09
**Status:** Core app built, ready for integration testing and deployment

---

## What Is Shareborough?

A lending library app built on AYB (AllYourBase). People catalog their stuff
(power tools, books, board games), share a link with friends, and friends can
borrow with zero friction — no account needed, just name + phone number.

Think Partiful but for lending physical things.

**Location:** `examples/shareborough/` in the AYB repo.

---

## What Was Built

### Documentation
- `docs/VISION.md` — Full product spec, user stories, core principles
- `docs/ARCHITECTURE.md` — System design, data model, API flow, routes
- `docs/CHECKLIST.md` — Implementation progress (most items checked off)
- `docs/SMS-REMINDERS.md` — SMS reminder architecture (needs update — see below)
- `README.md` — Quick start, project overview

### Database (`schema.sql`)
- **8 tables:** libraries, facet_definitions, items, item_facets, borrowers, borrow_requests, loans, reminders
- **3 RPC functions:** `request_borrow` (atomic borrower+request creation), `approve_borrow` (creates loan, updates item status), `return_item` (marks returned, frees item)
- **Full RLS policies** — owners manage their own libraries, public can browse, borrowers can insert requests without auth
- **Indexes** for performance on hot paths

### Frontend (React + TypeScript + Vite + Tailwind)
- **8 pages:** Landing, AuthPage (login/signup), Dashboard, LibraryDetail, AddItem, PublicLibrary, PublicItem, BorrowConfirmation
- **3 components:** NavBar, CreateLibrary, AddFacet
- **3 lib files:** ayb.ts (client), rpc.ts (RPC helper), reminders.ts (scheduling logic)
- **1 hook:** useRealtime.ts (SSE subscription)
- **Custom design:** Sage green + warm palette, community vibes, mobile-first responsive

### Quality
- TypeScript strict mode — compiles cleanly
- 21 tests passing (5 test files)
- Production build: 206KB JS / 63KB gzipped
- Uses `react-router-dom` for client-side routing

---

## Key Architecture Decisions

1. **Borrowers don't need accounts.** They're stored in a `borrowers` table with just phone + name. The `request_borrow` RPC function atomically finds-or-creates a borrower and creates the borrow request. This is the whole point of the app — zero friction.

2. **Custom facets per library.** An EAV pattern: `facet_definitions` (per library) + `item_facets` (per item). So power tools can have "battery size" while books have "genre". No schema changes needed.

3. **RPC for state transitions.** Borrow/approve/return are PostgreSQL functions, not REST calls. This ensures atomicity (e.g., approve_borrow updates request status + item status + creates loan in one transaction).

4. **RLS everywhere.** Row-Level Security policies enforce access at the database level. The frontend doesn't need to filter — PostgreSQL does it.

5. **The SDK doesn't have an RPC wrapper.** We wrote `src/lib/rpc.ts` as a thin fetch wrapper for calling PostgreSQL functions via `/api/rpc/{name}`. This matches how the other AYB examples (live-polls, pixel-canvas) do it.

---

## SMS Provider Recommendation (NOT Twilio)

Research showed Twilio is one of the most expensive options for low-volume SMS. The $15/month 10DLC campaign fee alone makes it ~$17/month for 100 messages.

### Recommendation: **Plivo** (best balance) or **AWS SNS** (cheapest)

| Provider | Per SMS | Phone #/mo | 10DLC/mo | Est. 100 msgs/mo |
|----------|---------|------------|----------|-------------------|
| AWS SNS | $0.00645 | $1.00 | $2.00 | **~$3-5** (100 free/mo) |
| Plivo | $0.0055 | $0.80 | ~$2-10 | **~$3-5** ($5 free credit) |
| Telnyx | $0.0040 | $1.10 | ~$2.00 | **~$4** |
| Twilio | $0.0079 | $1.15 | $15.00 | **~$17** |

**Pick Plivo** for best DX + low cost. **Pick AWS SNS** if you're already in AWS and want the 100 free msgs/month tier. Update `docs/SMS-REMINDERS.md` accordingly when choosing.

---

## What Needs Doing Next

### High Priority
1. **Apply schema to a real AYB instance and test end-to-end.** The schema hasn't been applied yet — it needs `psql -f schema.sql` against a running AYB database. Then test the full flow: signup → create library → add items → share link → borrow → approve → return.

2. **Choose and integrate SMS provider.** The reminder scheduling logic exists (`src/lib/reminders.ts`) but needs a worker to actually send SMS. Options:
   - AWS Lambda cron (checks `reminders` table every 15 min, sends pending via Plivo/SNS)
   - Simple Node.js script on the same server via cron

3. **Wire up reminder scheduling in the approve flow.** The `scheduleReminders()` function in `src/lib/reminders.ts` needs to be called after `approve_borrow` succeeds in `Dashboard.tsx`. Currently it's defined but not wired in.

### Medium Priority
4. **Photo upload testing.** The AddItem page uses `ayb.storage.upload("item-photos", file)`. Need to verify the `item-photos` bucket exists or is auto-created. May need to create it via AYB admin.

5. **Library settings page.** The schema supports `show_borrower_names` and `show_return_dates` toggles, and the LibraryDetail page respects them, but there's no settings UI to change them yet.

6. **Item edit page.** Items can be deleted but not edited inline. Would be nice to edit name/description/facets without deleting and recreating.

### Lower Priority
7. **Loading skeletons** instead of "Loading..." text
8. **Toast notifications** for success/error feedback
9. **PWA manifest** for "add to home screen" on mobile
10. **Library stats** — "You've lent 47 items to 12 friends this year"
11. **Deployment** — AWS EC2/ECS with auto-shutdown cron (see env secrets at `/Users/stuart/repos/flapjack202511/.secret/.env.secret` for AWS credentials)

---

## File Structure

```
examples/shareborough/
├── README.md
├── schema.sql                  # PostgreSQL DDL (8 tables, 3 functions, RLS)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js          # Custom sage + warm color palette
├── postcss.config.js
├── index.html                  # OG meta tags for sharing
├── docs/
│   ├── VISION.md               # Product spec
│   ├── ARCHITECTURE.md         # System design
│   ├── CHECKLIST.md            # Progress tracker
│   └── SMS-REMINDERS.md        # SMS system docs
├── handoffs/
│   └── 001-initial-build.md    # This file
├── src/
│   ├── main.tsx                # Entry + router setup
│   ├── App.tsx                 # Route definitions
│   ├── index.css               # Tailwind + component classes
│   ├── types.ts                # All TypeScript interfaces
│   ├── lib/
│   │   ├── ayb.ts              # AYB client + token persistence
│   │   ├── rpc.ts              # RPC helper (fetch wrapper)
│   │   └── reminders.ts        # Reminder scheduling logic
│   ├── hooks/
│   │   └── useRealtime.ts      # SSE subscription hook
│   ├── pages/
│   │   ├── Landing.tsx         # Homepage hero
│   │   ├── AuthPage.tsx        # Login / signup
│   │   ├── Dashboard.tsx       # Owner: requests, loans, libraries
│   │   ├── LibraryDetail.tsx   # Owner: items grid, facets, share link
│   │   ├── AddItem.tsx         # Owner: photo + name + facets form
│   │   ├── PublicLibrary.tsx   # Public: browse + filter + search
│   │   ├── PublicItem.tsx      # Public: item detail + borrow form
│   │   └── BorrowConfirmation.tsx
│   └── components/
│       ├── NavBar.tsx
│       ├── CreateLibrary.tsx
│       └── AddFacet.tsx
└── tests/
    ├── setup.ts
    ├── Landing.test.tsx         # 5 tests
    ├── AuthPage.test.tsx        # 5 tests
    ├── BorrowConfirmation.test.tsx  # 1 test
    ├── types.test.ts            # 6 tests
    └── reminders.test.ts        # 4 tests
```

---

## Commands

```bash
# Dev server (port 5176, proxies /api to AYB on 8090)
npm run dev

# Type check
npx tsc --noEmit

# Tests (21 passing)
npm test

# Production build (206KB JS / 63KB gzip)
npm run build
```

---

## Important Context

- AYB is at `/Users/stuart/repos/allyourbase_root/allyourbase_dev/`
- AWS/Cloudflare/etc credentials at `/Users/stuart/repos/flapjack202511/.secret/.env.secret`
- The AYB SDK (`@allyourbase/js`) does NOT have a `.rpc` namespace — use `src/lib/rpc.ts` for PostgreSQL function calls
- Other AYB example apps (kanban, pixel-canvas, live-polls) are in `examples/` for reference
- The database schema uses `_ayb_users` for the auth users table (AYB's built-in auth)
