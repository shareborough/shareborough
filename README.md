# Shareborough

Lend stuff to your friends. No sign-up needed to borrow.

Built on [AllYourBase](../../README.md) — a PostgreSQL BaaS.

## Quick Start

```bash
# 1. Start AYB with auth + storage enabled (from this directory)
cd examples/shareborough
go run ../../cmd/ayb start

# 2. Apply the schema
psql postgresql://ayb:ayb@localhost:15432/ayb -f schema.sql

# 3. Install & run
npm install
npm run dev
```

Open http://localhost:5176

> **Note:** AYB must be started from this directory so it picks up the included `ayb.toml` which enables auth and storage. Without it, signup/login won't work.

## How It Works

**For lenders:**
1. Sign up, create a library (e.g. "Power Tools", "Books")
2. Add items with photos, descriptions, and custom facets
3. Share your library link with friends

**For borrowers:**
1. Open the shared library link
2. Browse items, tap "Borrow This"
3. Enter name + phone number — that's it. No account needed.
4. Get SMS reminders when it's time to return

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: AYB (auto-generated REST API from PostgreSQL)
- **Database**: PostgreSQL with RLS policies
- **Realtime**: Server-Sent Events via AYB
- **SMS**: Telnyx (via cron worker)

## Project Structure

```
shareborough/
├── ayb.toml               # AYB config (auth + storage enabled)
├── docs/
│   ├── VISION.md          # Product spec & user stories
│   ├── ARCHITECTURE.md    # System design & data model
│   ├── CHECKLIST.md       # Implementation progress
│   ├── SMS-REMINDERS.md   # SMS reminder system docs
│   ├── SMS-PROVIDER-COMPARISON.md  # Provider analysis (chose Telnyx)
│   └── TESTING.md         # Test strategy & conventions
├── schema.sql             # PostgreSQL schema (10 tables, 3 RPC functions)
├── src/
│   ├── pages/             # Route-level components
│   │   ├── Landing.tsx    # Homepage
│   │   ├── AuthPage.tsx   # Login / signup
│   │   ├── Dashboard.tsx  # Owner dashboard
│   │   ├── LibraryDetail.tsx
│   │   ├── AddItem.tsx
│   │   ├── PublicLibrary.tsx   # Shareable browse view
│   │   ├── PublicItem.tsx      # Item detail + borrow form
│   │   └── BorrowConfirmation.tsx
│   ├── components/
│   │   ├── NavBar.tsx
│   │   ├── CreateLibrary.tsx
│   │   ├── AddFacet.tsx
│   │   ├── ConfirmDialog.tsx   # Reusable confirm/cancel dialog
│   │   └── Footer.tsx          # Branding footer
│   ├── lib/
│   │   ├── ayb.ts         # AYB client setup
│   │   ├── rpc.ts         # RPC helper
│   │   ├── borrow.ts      # Public borrow flow (RPC→CRUD fallback)
│   │   ├── image.ts       # Client-side image processing
│   │   └── reminders.ts   # Reminder scheduling
│   ├── hooks/
│   │   └── useRealtime.ts
│   └── types.ts
├── worker/
│   ├── sms.ts             # Telnyx SMS sending (one HTTP POST)
│   └── send-reminders.ts  # Cron worker for pending reminders
└── tests/                 # 167 tests across 20 files
```

## Database Schema

| Table | Purpose |
|-------|---------|
| libraries | Owner's lending collections |
| facet_definitions | Custom metadata fields (e.g. "Battery Size") |
| items | Things that can be lent |
| item_facets | Facet values per item |
| borrowers | People who borrow (phone + name, no account) |
| borrow_requests | Requests to borrow items |
| loans | Active and completed loans |
| reminders | Scheduled SMS reminders |

## Key Design Decisions

1. **Borrowers don't need accounts** — Just name + phone. Like Partiful.
2. **Custom facets per library** — Power tools have "battery size", books have "genre".
3. **RLS everywhere** — Row-Level Security policies enforce access at the database level.
4. **SMS reminders** — Friendly texts for return dates, not push notifications.
