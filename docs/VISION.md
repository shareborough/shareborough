# Shareborough — Vision & Product Spec

## What Is Shareborough?

Shareborough makes it easy to lend stuff to your friends. Catalog your things,
share a library link, and let friends borrow with zero friction — they don't
even need to create an account.

## Core Principles

1. **Zero friction for borrowers** — No signup required. Just a phone number.
   Inspired by Partiful's approach: interact first, account later (maybe never).
2. **Delight the lender** — Phone-based cataloging with photos. Quick and
   satisfying to build your library. See your stuff organized beautifully.
3. **Community vibes** — This isn't a business transaction. It's friends
   helping friends. The tone is warm, casual, and trusting.
4. **Free to lend** — Core lending is always free. Paid features come later
   as optional upgrades.

## User Stories

### As a Library Owner (Lender)

- I sign up with email/password
- I create one or more **libraries** (e.g. "Power Tools", "Board Games", "Books")
- Each library can have **custom facets** (e.g. battery type for tools, genre for books)
- I add **items** to my library: snap a photo, add name, description, facet values
- I get a **shareable link** for each library (e.g. `shareborough.app/l/stuart-power-tools`)
- I can **invite friends** by sharing the link (text, email, etc.)
- I see a **dashboard** of:
  - Pending borrow requests
  - Currently borrowed items (who has what, when it's due)
  - Late items (overdue, with borrower info)
  - My full library inventory
- I can **approve or decline** borrow requests
- I can **mark items as returned**
- I can configure **visibility settings** per library:
  - Show/hide who currently has an item
  - Show/hide return dates

### As a Borrower (Friend)

- I receive a link to my friend's library (via text, social media, etc.)
- I browse items — see photos, descriptions, availability
- I tap **"Borrow This"** on an item I want
- I enter my **name and phone number** — that's it. No signup. No password.
- The library owner gets notified
- When approved, I get a **text confirmation** with the return date
- As the return date approaches, I get **SMS reminders**:
  - 2 days before: "Hey! Remember to return [item] to [owner] by [date]"
  - On the day: "Today's the day! Return [item] to [owner]"
  - 1 day late: "[item] was due yesterday — please return to [owner] soon!"
  - 3 days late: "[item] is 3 days overdue — [owner] is waiting for it back"
- I can optionally create an account later to see my borrow history

## Data Model (High Level)

```
Owner (AYB auth user)
  └── Library (name, slug, description, cover_photo)
        ├── Facet Definitions (name, type per library)
        └── Item (name, description, photo, status)
              ├── Item Facet Values
              └── Loans
                    └── Borrower (name, phone — no account needed)
```

## Key Flows

### Cataloging Flow
1. Owner opens library → taps "Add Item"
2. Camera opens → snap photo (or pick from gallery)
3. Enter name + description
4. Fill in facet values (optional)
5. Item appears in library instantly

### Borrowing Flow
1. Friend opens shared library link
2. Browses items (filter by facet, search by name)
3. Taps "Borrow" on available item
4. Enters name + phone number
5. Owner gets push/SMS notification
6. Owner approves → borrower gets SMS confirmation
7. Item shows as "borrowed" in library

### Return Flow
1. Borrower returns item in person
2. Owner opens app → taps "Mark Returned" on the loan
3. Item becomes available again
4. Borrower gets "Thanks for returning!" text

## Delight Features (What Makes This Special)

- **Beautiful item cards** with photos — feels like browsing a curated shop
- **Smart reminders** — not naggy, friendly tone, well-timed
- **Library stats** — "You've lent 47 items to 12 friends this year!"
- **Borrower reputation** — owners can see if someone always returns on time
- **Quick-add mode** — rapid-fire cataloging, photo → name → done
- **Shareable library cards** — pretty preview cards for social sharing (OG tags)

## Future Paid Features (v2+)

- Insurance/deposit tracking
- Barcode/ISBN scanning for books
- Integration with shipping for long-distance lending
- Library co-management (multiple admins)
- Analytics dashboard
- Custom branding for libraries
- API access for integrations

## Tech Stack

- **Backend**: AYB (AllYourBase) — PostgreSQL BaaS
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **SMS**: Twilio (via AYB webhooks)
- **Storage**: AYB file storage (photos)
- **Realtime**: AYB SSE (live updates for owner dashboard)
