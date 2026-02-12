# Shareborough

Lend stuff to your friends. No sign-up needed to borrow.

## Try It on Your Phone

Open **https://shareborough.com** on your phone. It's a PWA — works like a native app.

### Add to Home Screen (optional)

- **iPhone**: Open in Safari > tap Share > "Add to Home Screen"
- **Android**: Open in Chrome > tap the three-dot menu > "Add to Home Screen"

### Test Accounts

Log in with any of these pre-seeded accounts:

| Email | Password | Notes |
|-------|----------|-------|
| `test@sigil.app` | `TestPass123!` | Stuart's main test account |
| `alice@sigil.app` | `TestPass123!` | Owns "Running Gear" library |
| `bob@sigil.app` | `TestPass123!` | Empty — create your own library |
| `carol@sigil.app` | `TestPass123!` | Empty — create your own library |
| `m@m.m` | `mmmmmmm&` | Quick-type test account |
| `n@n.n` | `nnnnnnn&` | Quick-type test account |
| `q@q.q` | `qqqqqqq&` | Quick-type test account |
| `demo@shareborough.com` | `demo1234` | Demo user (owns Tools + Books) |

### Things to Try

1. **Browse without logging in** — visit a public library link:
   - https://shareborough.com/l/neighborhood-tools
   - https://shareborough.com/l/book-club

2. **Borrow something** — tap any item, then "Borrow This". Enter a name + phone. No account needed.

3. **Log in as a lender** — use `test@sigil.app` / `TestPass123!`:
   - Create a new library from your Dashboard
   - Add items (try the barcode scanner on real books!)
   - Approve/decline borrow requests
   - Share your library link with friends

4. **Dark mode** — tap the sun/moon icon in the nav bar to toggle

5. **Settings** — go to Settings to set your display name + phone number

## Quick Start (Local Dev)

```bash
# 1. Start AYB with the included config
ayb start

# 2. Apply the schema
psql postgresql://ayb:ayb@localhost:15432/ayb -f schema.sql

# 3. Install & run
npm install
npm run dev
```

Open http://localhost:5176

### Seed Data

Create demo + test users with sample libraries:

```bash
npx tsx scripts/seed.ts                          # local
VITE_AYB_URL=https://api.shareborough.com npx tsx scripts/seed.ts  # production
```

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
- **Backend**: [AllYourBase](https://github.com/AYB-Archive) (auto-generated REST API from PostgreSQL)
- **Database**: PostgreSQL with RLS policies
- **Hosting**: Cloudflare Pages (frontend) + EC2 (backend)
- **Realtime**: Server-Sent Events
- **SMS**: Telnyx (via cron worker)

## Tests

```bash
npm test              # unit tests (vitest) — 577+ tests
npm run test:e2e      # end-to-end tests (playwright) — ~116 tests
npm run test:e2e:ui   # e2e with interactive UI
```

## Database Schema

| Table | Purpose |
|-------|---------|
| libraries | Owner's lending collections |
| facet_definitions | Custom metadata fields (e.g. "Battery Size") |
| items | Things that can be lent |
| borrowers | People who borrow (phone + name, no account) |
| borrow_requests | Requests to borrow items |
| loans | Active and completed loans |
| reminders | Scheduled SMS reminders |

## Key Design Decisions

1. **Borrowers don't need accounts** — Just name + phone. Like Partiful.
2. **Custom facets per library** — Power tools have "battery size", books have "genre".
3. **RLS everywhere** — Row-Level Security policies enforce access at the database level.
4. **SMS reminders** — Friendly texts for return dates, not push notifications.
