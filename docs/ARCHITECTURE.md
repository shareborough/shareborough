# Shareborough — Architecture

## System Overview

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│         React + TypeScript + Tailwind            │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Owner   │ │  Public  │ │     Borrower     │ │
│  │Dashboard │ │  Browse  │ │   Request Flow   │ │
│  └────┬─────┘ └────┬─────┘ └───────┬──────────┘ │
│       │             │               │            │
│       └─────────────┴───────────────┘            │
│                     │                            │
└─────────────────────┼────────────────────────────┘
                      │ HTTP/SSE
┌─────────────────────┼────────────────────────────┐
│                AYB Server                        │
│  ┌──────────────────┼──────────────────────────┐ │
│  │           REST API (auto-generated)          │ │
│  │  /api/collections/{table}  /api/auth/*      │ │
│  │  /api/storage/*            /api/rpc/*       │ │
│  │  /api/realtime             /api/webhooks    │ │
│  └──────────────────┼──────────────────────────┘ │
│                     │                            │
│  ┌──────────────────┼──────────────────────────┐ │
│  │              PostgreSQL                      │ │
│  │  Tables + RLS Policies + Functions          │ │
│  └─────────────────────────────────────────────┘ │
│                     │                            │
│  ┌──────────────────┼──────────────────────────┐ │
│  │          Webhook Dispatcher                  │ │
│  │  on loan create/update → SMS service        │ │
│  └──────────────────┼──────────────────────────┘ │
└─────────────────────┼────────────────────────────┘
                      │
┌─────────────────────┼────────────────────────────┐
│           SMS Service (Telnyx)                    │
│  Sends reminders, confirmations, notifications   │
└──────────────────────────────────────────────────┘
```

## Database Schema

### Tables

| Table | Purpose | Auth |
|-------|---------|------|
| `libraries` | Owner's lending libraries | Owner (RLS) |
| `facet_definitions` | Custom metadata fields per library | Owner (RLS) |
| `items` | Things in libraries | Owner write, public read |
| `item_facets` | Facet values for items | Owner write, public read |
| `borrowers` | People who borrow (phone-based) | Self-register |
| `borrow_requests` | Requests to borrow items | Borrower create, owner manage |
| `loans` | Active/completed loans | Owner manage |
| `reminders` | Scheduled SMS reminders | System-managed |

### Row-Level Security Strategy

- **Libraries**: Owner can CRUD their own. Public can read libraries marked as public.
- **Items**: Owner can CRUD for their libraries. Anyone can read items in public libraries.
- **Borrow requests**: Created by anyone (no auth required for borrowers). Managed by library owner.
- **Loans**: Created/managed by library owner only.

### Key Design Decisions

1. **Borrowers are NOT AYB auth users** — They're stored in a simple `borrowers`
   table with just name + phone. This is the critical zero-friction decision.

2. **Facets are user-defined** — Each library has its own facet schema. Stored as
   `facet_definitions` (name, type) + `item_facets` (item_id, facet_id, value).
   This gives flexibility without requiring schema changes.

3. **Photos via AYB storage** — Items have a `photo_url` field pointing to AYB's
   built-in file storage. Upload via the storage API, reference by URL.

4. **SMS via webhooks** — When a loan is created or approaches its return date,
   AYB webhooks fire to an SMS service endpoint. The SMS service (Telnyx API
   via cron worker) handles the actual sending.

5. **Public library slugs** — Each library gets a unique slug for shareable URLs.
   The public browse view uses this slug, no auth required.

## API Endpoints Used

### Owner (Authenticated)
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `GET /api/collections/libraries?filter=owner_id='{user_id}'` — My libraries
- `POST /api/collections/libraries` — Create library
- `POST /api/collections/items` — Add item
- `POST /api/storage/item-photos` — Upload photo
- `GET /api/collections/borrow_requests?filter=...&expand=borrower,item` — Pending requests
- `PATCH /api/collections/borrow_requests/{id}` — Approve/decline
- `POST /api/collections/loans` — Create loan (on approve)
- `PATCH /api/collections/loans/{id}` — Mark returned
- `GET /api/realtime?tables=borrow_requests,loans` — Live updates

### Borrower (Unauthenticated / Token-based)
- `GET /api/collections/libraries?filter=slug='{slug}'` — Browse library
- `GET /api/collections/items?filter=library_id='{id}'&expand=item_facets` — Browse items
- `POST /api/rpc/request_borrow` — Submit borrow request (creates borrower + request atomically)

### Public
- `GET /api/collections/libraries?filter=slug='{slug}'` — View library metadata
- `GET /api/collections/items?filter=library_id='{id}'` — Browse items

## Frontend Routes

```
/                          — Landing page
/signup                    — Owner registration
/login                     — Owner login
/dashboard                 — Owner dashboard (libraries overview)
/dashboard/library/:id     — Library detail (items, requests, loans)
/dashboard/library/:id/add — Add item to library
/l/:slug                   — Public library browse (shareable link)
/l/:slug/:itemId           — Item detail + borrow button
/borrow/:requestId         — Borrow confirmation page
```

## Reminder Schedule

| Timing | Message Tone |
|--------|-------------|
| On approval | "You're borrowing [item] from [owner]! Return by [date]." |
| 2 days before | "Friendly reminder: [item] is due back to [owner] in 2 days!" |
| Day of | "Today's the day! Time to return [item] to [owner]." |
| 1 day late | "[item] was due yesterday — return to [owner] when you can!" |
| 3 days late | "[item] is 3 days overdue. [owner] would appreciate it back!" |
| 7 days late | "Hey, [item] is a week overdue now. Please return to [owner]." |
