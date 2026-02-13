/**
 * Global setup: clean test data before each Playwright run.
 * Only cleans data belonging to ephemeral test users (test-*@example.com).
 * Seed user data (@sigil.app, @shareborough.com) is preserved.
 */
export default async function globalSetup() {
  const baseURL = process.env.AYB_URL ?? "http://localhost:8090";
  const adminPassword = process.env.AYB_ADMIN_PASSWORD ?? "";

  // Authenticate as admin to get a token for cleanup queries.
  let adminToken = "";
  if (adminPassword) {
    const authRes = await fetch(`${baseURL}/api/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword }),
    });
    if (authRes.ok) {
      const data = (await authRes.json()) as { token: string };
      adminToken = data.token;
      console.log("Global setup: admin auth succeeded");
    } else {
      console.warn(`Global setup: admin auth failed (${authRes.status}), cleanup will be skipped`);
      return;
    }
  } else {
    console.warn("Global setup: AYB_ADMIN_PASSWORD not set, skipping cleanup");
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
  };

  // Scoped cleanup: only delete content owned by ephemeral test users.
  // Subqueries cascade through the ownership chain:
  //   test users → libraries → items → loans/requests/facets/reminders
  const testUserSub = `(SELECT id FROM _ayb_users WHERE email LIKE 'test-%@example.com')`;
  const testLibSub = `(SELECT id FROM libraries WHERE owner_id IN ${testUserSub})`;
  const testItemSub = `(SELECT id FROM items WHERE library_id IN ${testLibSub})`;
  const testLoanSub = `(SELECT id FROM loans WHERE item_id IN ${testItemSub})`;

  // Tables cleaned in dependency order (children first).
  const cleanupQueries = [
    `DELETE FROM reminders WHERE loan_id IN ${testLoanSub}`,
    `DELETE FROM loans WHERE item_id IN ${testItemSub}`,
    `DELETE FROM borrow_requests WHERE item_id IN ${testItemSub}`,
    `DELETE FROM item_facets WHERE item_id IN ${testItemSub}`,
    `DELETE FROM items WHERE library_id IN ${testLibSub}`,
    `DELETE FROM facet_definitions WHERE library_id IN ${testLibSub}`,
    // Clean borrowers linked to test-user items via loans or requests
    `DELETE FROM borrowers WHERE id IN (
      SELECT DISTINCT borrower_id FROM loans WHERE item_id IN ${testItemSub}
      UNION
      SELECT DISTINCT borrower_id FROM borrow_requests WHERE item_id IN ${testItemSub}
    )`,
    `DELETE FROM libraries WHERE owner_id IN ${testUserSub}`,
  ];

  for (const query of cleanupQueries) {
    const res = await fetch(`${baseURL}/api/admin/sql`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });
    if (res.ok) {
      const data = (await res.json()) as { rowCount: number };
      if (data.rowCount > 0) {
        // Extract table name from query for logging
        const table = query.match(/DELETE FROM (\w+)/)?.[1] ?? "unknown";
        console.log(`  Cleaned ${data.rowCount} rows from ${table}`);
      }
    } else {
      const table = query.match(/DELETE FROM (\w+)/)?.[1] ?? "unknown";
      console.warn(`  Warning: could not clean table ${table}: ${res.status}`);
    }
  }

  // Clean test users themselves (emails matching test pattern)
  const res = await fetch(`${baseURL}/api/admin/sql`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: `DELETE FROM _ayb_users WHERE email LIKE 'test-%@example.com'`,
    }),
  });
  if (res.ok) {
    const data = (await res.json()) as { rowCount: number };
    console.log(`  Cleaned ${data.rowCount} test users`);
  } else {
    console.warn(`  Warning: could not clean test users: ${res.status}`);
  }
}
