/**
 * seed.ts — Create demo + test users and pre-load content for testing.
 *
 * Usage:
 *   npx tsx scripts/seed.ts                          # seeds localhost:8090
 *   VITE_AYB_URL=https://api.shareborough.com npx tsx scripts/seed.ts  # seeds production
 *
 * Creates:
 *   - Demo user: demo@shareborough.com / demo1234
 *   - 7 test users (see SEED_USERS below)
 *   - User profiles for all seed users
 *   - Rich content for alice@sigil.app: 2 libraries, 5 items, facets, 1 loan, 1 pending request
 *   - Content for bob@sigil.app: 1 library, 2 items
 *
 * Safe to run multiple times — skips existing users and content.
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

async function loginUser(email: string, password: string): Promise<AuthResponse> {
  try {
    return await api<AuthResponse>("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return await api<AuthResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  }
}

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function seedUsers() {
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
    const headers = authHeaders(seedAuth.token);
    try {
      const profiles = await api<ListResponse<{ id: string }>>(`/api/collections/user_profiles`, { headers });
      if (profiles.items.length === 0) {
        await api(`/api/collections/user_profiles`, {
          method: "POST",
          headers,
          body: JSON.stringify({ user_id: seedAuth.user.id, display_name: user.name }),
        });
        console.log(`  Created profile: ${user.name}`);
      }
    } catch {
      // Table may not exist yet — skip profile creation
    }
  }
}

async function seedAliceContent() {
  console.log(`\nSeeding content for alice@sigil.app...`);

  const auth = await loginUser("alice@sigil.app", "TestPass123!");
  const headers = authHeaders(auth.token);

  // Check if content already exists (idempotent)
  const existingLibs = await api<ListResponse<{ id: string; name: string }>>(
    "/api/collections/libraries",
    { headers },
  );
  if (existingLibs.items.length > 0) {
    console.log(`  Content already seeded (${existingLibs.items.length} libraries), skipping`);
    return;
  }

  // --- Library 1: Neighborhood Tools ---
  const toolLib = await api<{ id: string; slug: string }>("/api/collections/libraries", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Neighborhood Tools",
      description: "Power tools and hand tools available for neighbors to borrow. Save money and garage space!",
      is_public: true,
    }),
  });
  console.log(`  Created library: Neighborhood Tools (${toolLib.id})`);

  // Facet definitions for tools
  const brandFacet = await api<{ id: string }>("/api/collections/facet_definitions", {
    method: "POST",
    headers,
    body: JSON.stringify({ library_id: toolLib.id, name: "Brand", facet_type: "text", position: 0 }),
  });
  const condFacet = await api<{ id: string }>("/api/collections/facet_definitions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      library_id: toolLib.id,
      name: "Condition",
      facet_type: "text",
      options: ["Excellent", "Good", "Fair"],
      position: 1,
    }),
  });
  console.log(`  Created 2 facet definitions`);

  // Items for Neighborhood Tools
  const drill = await api<{ id: string }>("/api/collections/items", {
    method: "POST",
    headers,
    body: JSON.stringify({
      library_id: toolLib.id,
      name: "Cordless Drill",
      description: "20V DeWalt cordless drill with two batteries and charger. Great for hanging shelves, assembling furniture.",
      status: "available",
      max_borrow_days: 14,
    }),
  });

  const saw = await api<{ id: string }>("/api/collections/items", {
    method: "POST",
    headers,
    body: JSON.stringify({
      library_id: toolLib.id,
      name: "Circular Saw",
      description: "7-1/4\" Makita circular saw. Cuts through plywood and lumber easily.",
      status: "available",
      max_borrow_days: 7,
    }),
  });

  const jigsaw = await api<{ id: string }>("/api/collections/items", {
    method: "POST",
    headers,
    body: JSON.stringify({
      library_id: toolLib.id,
      name: "Jigsaw",
      description: "Bosch jigsaw with variable speed. Perfect for curved cuts.",
      status: "available",
      max_borrow_days: 14,
    }),
  });

  console.log(`  Created 3 items in Neighborhood Tools`);

  // Facet values
  await api("/api/collections/item_facets", {
    method: "POST",
    headers,
    body: JSON.stringify({ item_id: drill.id, facet_definition_id: brandFacet.id, value: "DeWalt" }),
  });
  await api("/api/collections/item_facets", {
    method: "POST",
    headers,
    body: JSON.stringify({ item_id: drill.id, facet_definition_id: condFacet.id, value: "Excellent" }),
  });
  await api("/api/collections/item_facets", {
    method: "POST",
    headers,
    body: JSON.stringify({ item_id: saw.id, facet_definition_id: brandFacet.id, value: "Makita" }),
  });
  await api("/api/collections/item_facets", {
    method: "POST",
    headers,
    body: JSON.stringify({ item_id: saw.id, facet_definition_id: condFacet.id, value: "Good" }),
  });
  console.log(`  Created 4 facet values`);

  // --- Library 2: Book Club ---
  const bookLib = await api<{ id: string }>("/api/collections/libraries", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Alice's Book Club",
      description: "Sci-fi and fiction books to share with friends. Take one, read it, pass it on!",
      is_public: true,
    }),
  });

  await api("/api/collections/items", {
    method: "POST",
    headers,
    body: JSON.stringify({
      library_id: bookLib.id,
      name: "Dune by Frank Herbert",
      description: "The classic sci-fi epic. Slightly worn cover but all pages intact.",
      status: "available",
      max_borrow_days: 30,
    }),
  });

  await api("/api/collections/items", {
    method: "POST",
    headers,
    body: JSON.stringify({
      library_id: bookLib.id,
      name: "Project Hail Mary by Andy Weir",
      description: "If you liked The Martian, you'll love this. Hardcover edition.",
      status: "available",
      max_borrow_days: 30,
    }),
  });

  console.log(`  Created library: Alice's Book Club with 2 items`);

  // --- Borrower + Loan ---
  // Create a borrower (Bob Neighbor) who borrowed the Jigsaw
  const borrower = await api<{ id: string }>("/api/collections/borrowers", {
    method: "POST",
    headers,
    body: JSON.stringify({ phone: "+15550001111", name: "Bob Neighbor" }),
  });

  // Create a borrow request and approve it to create a loan
  const returnBy = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const request = await api<{ id: string }>("/api/collections/borrow_requests", {
    method: "POST",
    headers,
    body: JSON.stringify({
      item_id: jigsaw.id,
      borrower_id: borrower.id,
      status: "pending",
      return_by: returnBy,
      message: "Hi, I need the jigsaw for a weekend project!",
      private_possession: false,
    }),
  });

  // Approve via RPC to atomically create loan + update item status
  try {
    await api("/api/rpc/approve_borrow", {
      method: "POST",
      headers,
      body: JSON.stringify({ p_request_id: request.id, p_return_by: returnBy }),
    });
    console.log(`  Created loan: Jigsaw → Bob Neighbor (due ${returnBy})`);
  } catch (err) {
    // Fallback: manually create loan and update item
    console.log(`  RPC approve_borrow not available, creating loan manually`);
    await api("/api/collections/loans", {
      method: "POST",
      headers,
      body: JSON.stringify({
        item_id: jigsaw.id,
        borrower_id: borrower.id,
        request_id: request.id,
        return_by: returnBy,
        status: "active",
        private_possession: false,
      }),
    });
    await api(`/api/collections/items/${jigsaw.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "borrowed" }),
    });
    await api(`/api/collections/borrow_requests/${request.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "approved" }),
    });
    console.log(`  Created loan manually: Jigsaw → Bob Neighbor (due ${returnBy})`);
  }

  // --- Pending borrow request ---
  const carol = await api<{ id: string }>("/api/collections/borrowers", {
    method: "POST",
    headers,
    body: JSON.stringify({ phone: "+15550002222", name: "Carol Requestor" }),
  });

  await api("/api/collections/borrow_requests", {
    method: "POST",
    headers,
    body: JSON.stringify({
      item_id: drill.id,
      borrower_id: carol.id,
      status: "pending",
      return_by: returnBy,
      message: "Would love to borrow the drill for some shelf installation!",
      private_possession: false,
    }),
  });
  console.log(`  Created pending request: Cordless Drill ← Carol Requestor`);
}

async function seedBobContent() {
  console.log(`\nSeeding content for bob@sigil.app...`);

  const auth = await loginUser("bob@sigil.app", "TestPass123!");
  const headers = authHeaders(auth.token);

  const existingLibs = await api<ListResponse<{ id: string }>>(
    "/api/collections/libraries",
    { headers },
  );
  if (existingLibs.items.length > 0) {
    console.log(`  Content already seeded (${existingLibs.items.length} libraries), skipping`);
    return;
  }

  const lib = await api<{ id: string }>("/api/collections/libraries", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Bob's Fitness Gear",
      description: "Fitness equipment to share — stay active without buying everything!",
      is_public: true,
    }),
  });

  await api("/api/collections/items", {
    method: "POST",
    headers,
    body: JSON.stringify({
      library_id: lib.id,
      name: "Resistance Bands Set",
      description: "5-piece set with different resistance levels. Great for home workouts.",
      status: "available",
    }),
  });

  await api("/api/collections/items", {
    method: "POST",
    headers,
    body: JSON.stringify({
      library_id: lib.id,
      name: "Yoga Mat",
      description: "Extra thick yoga mat, 6mm. Cleaned and sanitized after each use.",
      status: "available",
    }),
  });

  console.log(`  Created library: Bob's Fitness Gear with 2 items`);
}

function printAllLogins() {
  console.log(`\n--- Test Accounts ---`);
  console.log(`  ${DEMO_USER.email} / ${DEMO_USER.password} (demo)`);
  for (const user of SEED_USERS) {
    console.log(`  ${user.email} / ${user.password}`);
  }
}

async function seed() {
  await seedUsers();
  await seedAliceContent();
  await seedBobContent();

  console.log(`\n--- Seed complete (users + content) ---`);
  printAllLogins();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
