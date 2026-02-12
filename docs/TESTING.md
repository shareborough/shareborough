# Shareborough — Testing Strategy

## Stack

- **Unit/Component**: Vitest + React Testing Library (jsdom)
- **E2E**: Playwright (real browser against real AYB server)
- **Assertions**: Vitest `expect` + `@testing-library/jest-dom` (unit), Playwright `expect` (e2e)

## Running Tests

```bash
# Unit/component tests (no server needed, sub-second)
npm test            # single run
npm run test:watch  # watch mode

# E2E tests (requires AYB server running)
# Terminal 1: start AYB from repo root
../../ayb start

# Terminal 2: apply schema (first time only, or after schema changes)
psql postgresql://ayb:ayb@localhost:15432/ayb -f schema.sql

# Terminal 3: run e2e tests
npm run test:e2e         # headless
npm run test:e2e:ui      # interactive UI mode
```

## Two-Tier Strategy

### Tier 1: Component Tests (Vitest + Testing Library)

Fast, mocked, no server required. Run in jsdom. Cover:

- Component rendering and state changes
- User interaction (clicks, form fills)
- Loading/error/success state transitions
- Unit logic (`rpc()`, `scheduleReminders()`, `sendSms()`)

The AYB client is mocked via `vi.mock()` — tests control exactly what data
components receive. Tests never make real HTTP requests.

### Tier 2: E2E Tests (Playwright)

Full browser tests against a real AYB server with embedded Postgres. Cover:

- Owner auth flow (register, login, logout, persistence)
- Library CRUD (create, view, share link)
- Item management (add, delete, status badges)
- Full borrow lifecycle (request → approve → return)
- Public pages (library browsing, search, item detail, not-found)
- RLS isolation (borrowers can't see owner-only data)

Tests live in `e2e/` and use per-test isolation via unique user emails
(no cleanup needed, no test interference between runs).

### No Sleeps. No Arbitrary Waits. Ever.

**This is a hard rule.** Never use `setTimeout`, `sleep()`, `waitForTimeout`,
`new Promise(resolve => setTimeout(resolve, n))`, or any arbitrary delay
in tests.

Instead:

- **Component tests**: `screen.findByText()`, `waitFor(() => expect(...))`
- **E2E tests**: `expect(locator).toBeVisible()`, `page.waitForURL()`

These all use built-in polling with automatic timeout. They are deterministic:
they pass as soon as the condition is met, and fail after a reasonable timeout.

```typescript
// WRONG — arbitrary delay, flaky, slow
await new Promise(r => setTimeout(r, 500));
expect(screen.getByText("Done")).toBeInTheDocument();

// RIGHT — polls until condition is met, fast and deterministic
expect(await screen.findByText("Done")).toBeInTheDocument();
```

### Mocking (component tests only)

The AYB client (`src/lib/ayb.ts`) is mocked in every component test via
`vi.mock()`. This means:

- Tests never make real HTTP requests
- Tests control exactly what data the component receives
- Tests are fast, deterministic, and offline-capable

For the RPC helper (`src/lib/rpc.ts`) and SMS worker (`worker/sms.ts`),
we mock `globalThis.fetch` directly.

### What We Test

| Layer | What | How |
|-------|------|-----|
| Types | Type definitions compile | `tsc --noEmit` (not unit tests) |
| Lib | `rpc()`, `scheduleReminders()`, `sendSms()` | Unit tests with mocked fetch/ayb |
| Components | Rendering, user interaction, state changes | Testing Library + mocked ayb |
| AddItem | Camera capture, photo upload, preview, facets | Testing Library + mocked ayb/storage |
| LibraryDetail | Item grid, delete, facets, loans, share link | Testing Library + mocked ayb |
| AddFacet | Type selector, option parsing, create flow | Testing Library + mocked ayb |
| Worker | SMS sending logic | Unit tests with mocked fetch |
| Worker | Reminder processing (send-reminders) | Unit tests with mocked fetch/sendSms |
| Auth flows | Register, login, logout, persistence | Playwright e2e |
| Library CRUD | Create, view detail, share link | Playwright e2e |
| Item management | Add, delete, status transitions | Playwright e2e |
| Borrow lifecycle | Request → approve/decline → return | Playwright e2e |
| Public pages | Browse, search, not-found states | Playwright e2e |

### What We Don't Test (and why)

- **AYB SDK internals** — Not our code. We mock it in component tests.
- **CSS/styling** — Not testable in jsdom; visual review only.
- **`useRealtime` hook** — Thin wrapper around AYB SDK subscription. Not
  worth mocking the SSE layer in component tests. The approve/return flows
  in e2e tests exercise realtime indirectly.

## Test File Conventions

- Component/unit tests: `tests/{ComponentName}.test.tsx` or `tests/{module}.test.ts`
- E2E tests: `e2e/{feature}.spec.ts`
- Shared e2e helpers: `e2e/helpers.ts`
- Each component test file mocks its own dependencies at the top
- `tests/setup.ts` imports `@testing-library/jest-dom` globally
