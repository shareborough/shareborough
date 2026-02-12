/**
 * seed.ts — Create demo + test users with sample data.
 *
 * Usage:
 *   npx tsx scripts/seed.ts                          # seeds localhost:8090
 *   VITE_AYB_URL=https://api.shareborough.com npx tsx scripts/seed.ts  # seeds production
 *
 * Creates:
 *   - Demo user: demo@shareborough.com / demo1234
 *   - 7 test users (see SEED_USERS below)
 *   - "Neighborhood Tools" library with 5 items (owned by demo user)
 *   - "Book Club" library with 3 items (owned by demo user)
 *   - "Running Gear" library with 3 items (owned by alice@sigil.app)
 *   - A pending borrow request from "Jane Neighbor"
 *
 * Safe to run multiple times — skips if demo libraries already exist.
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
  let auth: AuthResponse;
  try {
    auth = await api<AuthResponse>("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEMO_USER),
    });
    console.log(`Created user: ${DEMO_USER.email}`);
  } catch {
    // User probably exists — try login
    auth = await api<AuthResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEMO_USER),
    });
    console.log(`User exists, logged in: ${DEMO_USER.email}`);
  }

  const token = auth.token;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const create = <T = Record<string, unknown>>(collection: string, data: Record<string, unknown>) =>
    api<T>(`/api/collections/${collection}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

  const list = <T = Record<string, unknown>>(collection: string, filter?: string) => {
    const qs = filter ? `?filter=${encodeURIComponent(filter)}` : "";
    return api<ListResponse<T>>(`/api/collections/${collection}${qs}`, { headers });
  };

  // 1b. Create or login all seed users and set up profiles
  const seedAuths: Map<string, { token: string; userId: string }> = new Map();
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
    seedAuths.set(user.email, { token: seedAuth.token, userId: seedAuth.user.id });

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

  // 2. Check if demo libraries already exist (skip demo data if so)
  const existing = await list("libraries");
  const demoLibrariesExist = existing.totalItems > 0;

  if (demoLibrariesExist) {
    console.log(`\nDemo libraries already exist (${existing.totalItems}). Skipping demo data.`);
  }

  // 3. Create demo user's libraries (skip if they already exist)
  if (!demoLibrariesExist) {
    const tools = await create<{ id: string }>("libraries", {
      name: "Neighborhood Tools",
      slug: "neighborhood-tools",
      description: "Borrow our tools anytime. Just return them clean!",
      is_public: true,
    });
    console.log(`Created library: Neighborhood Tools`);

    const batteryFacet = await create<{ id: string }>("facet_definitions", {
      library_id: tools.id,
      name: "Battery",
      facet_type: "text",
      position: 0,
    });

    const toolItems = [
      { name: "Cordless Drill", description: "DeWalt 20V Max. Comes with two batteries and charger.", max_borrow_days: 7 },
      { name: "Circular Saw", description: "7-1/4 inch blade. Great for deck projects.", max_borrow_days: 3 },
      { name: "Pressure Washer", description: "2000 PSI electric. Perfect for driveways and siding.", max_borrow_days: 2 },
      { name: "Jigsaw", description: "Variable speed with orbital action. Includes extra blades.", max_borrow_days: 7 },
      { name: "Ladder (Extension)", description: "24-foot aluminum extension ladder. Rated for 250 lbs.", max_borrow_days: 3 },
    ];

    for (const item of toolItems) {
      const created = await create<{ id: string }>("items", {
        library_id: tools.id,
        ...item,
        status: "available",
      });

      if (item.name === "Cordless Drill") {
        await create("item_facets", {
          item_id: created.id,
          facet_definition_id: batteryFacet.id,
          value: "20V Max",
        });
      }
    }
    console.log(`  Added ${toolItems.length} items`);

    // 4. Create "Book Club" library
    const books = await create<{ id: string }>("libraries", {
      name: "Book Club",
      slug: "book-club",
      description: "Read it, pass it on. No due dates, just vibes.",
      is_public: true,
    });
    console.log(`Created library: Book Club`);

    const genreFacet = await create<{ id: string }>("facet_definitions", {
      library_id: books.id,
      name: "Genre",
      facet_type: "text",
      position: 0,
    });

    const bookItems = [
      { name: "Educated", description: "Tara Westover's memoir. Incredible story.", genre: "Memoir" },
      { name: "Project Hail Mary", description: "Andy Weir. If you liked The Martian, you'll love this.", genre: "Sci-Fi" },
      { name: "Atomic Habits", description: "James Clear. The one everyone's read.", genre: "Self-Help" },
    ];

    for (const book of bookItems) {
      const { genre, ...itemData } = book;
      const created = await create<{ id: string }>("items", {
        library_id: books.id,
        ...itemData,
        status: "available",
      });
      await create("item_facets", {
        item_id: created.id,
        facet_definition_id: genreFacet.id,
        value: genre,
      });
    }
    console.log(`  Added ${bookItems.length} items`);

    // 5. Create a sample borrower and pending request
    const borrower = await create<{ id: string }>("borrowers", {
      phone: "+15551234567",
      name: "Jane Neighbor",
    });

    const drillResults = await list<{ id: string }>("items", "name='Cordless Drill'");
    if (drillResults.items.length > 0) {
      await create("borrow_requests", {
        item_id: drillResults.items[0].id,
        borrower_id: borrower.id,
        message: "Hey! Can I borrow the drill this weekend? Working on some shelves.",
        status: "pending",
      });
      console.log(`  Created pending borrow request from Jane Neighbor`);
    }
  }

  // 6. Create Alice's "Running Gear" library (always try — idempotent)
  const aliceAuth = seedAuths.get("alice@sigil.app");
  if (aliceAuth) {
    const aliceHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aliceAuth.token}`,
    };
    const aliceList = <T = Record<string, unknown>>(collection: string, filter?: string) => {
      const qs = filter ? `?filter=${encodeURIComponent(filter)}` : "";
      return api<ListResponse<T>>(`/api/collections/${collection}${qs}`, { headers: aliceHeaders });
    };

    const aliceLibraries = await aliceList("libraries");
    if (aliceLibraries.totalItems === 0) {
      const aliceCreate = <T = Record<string, unknown>>(collection: string, data: Record<string, unknown>) =>
        api<T>(`/api/collections/${collection}`, {
          method: "POST",
          headers: aliceHeaders,
          body: JSON.stringify(data),
        });

      const running = await aliceCreate<{ id: string }>("libraries", {
        name: "Running Gear",
        slug: "running-gear",
        description: "Spare running gear to lend. Take what you need, bring it back clean!",
        is_public: true,
      });
      console.log(`Created library: Running Gear (alice@sigil.app)`);

      const runningItems = [
        { name: "GPS Watch (Garmin 265)", description: "Garmin Forerunner 265. Charged and ready to go.", max_borrow_days: 7 },
        { name: "Foam Roller", description: "18-inch high-density foam roller for recovery.", max_borrow_days: 14 },
        { name: "Running Vest (S/M)", description: "Salomon ADV Skin 12. Fits S/M. Great for long runs.", max_borrow_days: 7 },
      ];

      for (const item of runningItems) {
        await aliceCreate("items", {
          library_id: running.id,
          ...item,
          status: "available",
        });
      }
      console.log(`  Added ${runningItems.length} items`);
    } else {
      console.log(`Alice's libraries already exist (${aliceLibraries.totalItems}). Skipping.`);
    }
  }

  console.log(`\n--- Seed complete ---`);
  printAllLogins();
}

function printAllLogins() {
  console.log(`\n--- Test Accounts ---`);
  console.log(`  ${DEMO_USER.email} / ${DEMO_USER.password} (demo — owns Tools + Books)`);
  for (const user of SEED_USERS) {
    const note = user.email === "alice@sigil.app" ? " (owns Running Gear)" : "";
    console.log(`  ${user.email} / ${user.password}${note}`);
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
