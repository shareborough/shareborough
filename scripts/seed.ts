/**
 * seed.ts — Create demo + test users (no pre-loaded content).
 *
 * Usage:
 *   npx tsx scripts/seed.ts                          # seeds localhost:8090
 *   VITE_AYB_URL=https://api.shareborough.com npx tsx scripts/seed.ts  # seeds production
 *
 * Creates:
 *   - Demo user: demo@shareborough.com / demo1234
 *   - 7 test users (see SEED_USERS below)
 *   - User profiles for all seed users
 *
 * No libraries, items, or borrow requests are pre-loaded — users start fresh.
 * Safe to run multiple times — skips existing users.
 */

const BASE_URL = process.env.VITE_AYB_URL || "http://localhost:8090";

const DEMO_USER = {
  email: "demo@shareborough.com",
  password: "demo1234",
};

const SEED_USERS = [
  { email: "test@sigil.app", password: "TestPass123!", name: "Stuart Test" },
  { email: "alice@sigil.app", password: "TestPass123!", name: "Alice Runner" },
  { email: "bob@sigil.app", password: "TestPass123!", name: "Bob Lifter" },
  { email: "carol@sigil.app", password: "TestPass123!", name: "Carol Yogi" },
  { email: "m@m.m", password: "mmmmmmm&", name: "User M" },
  { email: "n@n.n", password: "nnnnnnn&", name: "User N" },
  { email: "q@q.q", password: "qqqqqqq&", name: "User Q" },
];

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: { id: string; email: string };
}

interface ListResponse<T> {
  items: T[];
  totalItems: number;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${path}: ${body}`);
  }
  return res.json();
}

async function seed() {
  console.log(`Seeding ${BASE_URL}...\n`);

  // 1. Create or login demo user
  try {
    await api<AuthResponse>("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEMO_USER),
    });
    console.log(`Created user: ${DEMO_USER.email}`);
  } catch {
    // User probably exists — already seeded
    console.log(`User exists: ${DEMO_USER.email}`);
  }

  // 2. Create or login all seed users and set up profiles
  for (const user of SEED_USERS) {
    let seedAuth: AuthResponse;
    try {
      seedAuth = await api<AuthResponse>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, password: user.password }),
      });
      console.log(`Created user: ${user.email}`);
    } catch {
      seedAuth = await api<AuthResponse>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, password: user.password }),
      });
      console.log(`User exists, logged in: ${user.email}`);
    }
    // Create user profile
    const profileHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${seedAuth.token}`,
    };
    try {
      const profiles = await api<ListResponse<{ id: string }>>(`/api/collections/user_profiles`, { headers: profileHeaders });
      if (profiles.items.length === 0) {
        await api(`/api/collections/user_profiles`, {
          method: "POST",
          headers: profileHeaders,
          body: JSON.stringify({ user_id: seedAuth.user.id, display_name: user.name }),
        });
        console.log(`  Created profile: ${user.name}`);
      }
    } catch {
      // Table may not exist yet — skip profile creation
    }
  }

  console.log(`\n--- Seed complete (users only, no pre-loaded content) ---`);
  printAllLogins();
}

function printAllLogins() {
  console.log(`\n--- Test Accounts ---`);
  console.log(`  ${DEMO_USER.email} / ${DEMO_USER.password} (demo)`);
  for (const user of SEED_USERS) {
    console.log(`  ${user.email} / ${user.password}`);
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
