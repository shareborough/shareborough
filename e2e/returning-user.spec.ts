import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./helpers";

/**
 * Returning User E2E Tests — Full CRUD on Pre-existing Data
 *
 * These tests validate that users with pre-existing data can:
 * 1. See their content when they return (libraries, items, loans, requests)
 * 2. Perform ALL operations on pre-existing data (approve, return, delete)
 * 3. Persist data across completely separate browser sessions
 * 4. Clean up ALL created content when done
 *
 * Data is created via API in beforeAll and cleaned up in afterAll.
 * Tests run in serial mode because they mutate shared state.
 */

const runId = Math.random().toString(36).slice(2, 8);
const email = `test-return-${runId}@example.com`;
const password = TEST_PASSWORD;

let apiBase: string;
let authToken: string;
let libraryId: string;
let librarySlug: string;
let itemIds: string[] = [];
let borrowerId: string;
let borrower2Id: string;
let requestId: string;
let loanId: string;

test.describe.configure({ mode: "serial" });

test.describe("Returning User — Pre-existing Data CRUD", () => {
  test.beforeAll(async () => {
    apiBase = process.env.AYB_URL ?? process.env.VITE_AYB_URL ?? "http://localhost:8090";

    // 1. Register user via API
    const regRes = await fetch(`${apiBase}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(regRes.ok, `Registration failed: ${regRes.status}`).toBeTruthy();
    const regData = (await regRes.json()) as { token: string; user: { id: string } };
    authToken = regData.token;
    const userId = regData.user.id;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };

    // 2. Create a library (must include owner_id and slug like the frontend does)
    const slug = `returning-user-${runId}`;
    const libRes = await fetch(`${apiBase}/api/collections/libraries`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        owner_id: userId,
        name: `Returning User Tools ${runId}`,
        slug,
        description: "A library with pre-existing content for e2e testing",
        is_public: true,
      }),
    });
    expect(libRes.ok, `Create library failed: ${libRes.status}`).toBeTruthy();
    const lib = (await libRes.json()) as { id: string; slug: string };
    libraryId = lib.id;
    librarySlug = lib.slug;

    // 3. Create items (4 items: one for loan, one for request, one to delete, one to keep)
    const itemNames = ["Hammer", "Screwdriver Set", "Tape Measure", "Wrench Set"];
    itemIds = [];
    for (const name of itemNames) {
      const res = await fetch(`${apiBase}/api/collections/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          library_id: libraryId,
          name,
          description: "A pre-existing tool for e2e testing",
          status: "available",
        }),
      });
      expect(res.ok, `Create item ${name} failed: ${res.status}`).toBeTruthy();
      const item = (await res.json()) as { id: string };
      itemIds.push(item.id);
    }

    // 4. Create borrower for loan
    const borRes = await fetch(`${apiBase}/api/collections/borrowers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Neighbor Dave",
        phone: `+1555${runId}01`,
      }),
    });
    expect(borRes.ok, `Create borrower failed: ${borRes.status}`).toBeTruthy();
    const bor = (await borRes.json()) as { id: string };
    borrowerId = bor.id;

    // 5. Create second borrower for pending request
    const bor2Res = await fetch(`${apiBase}/api/collections/borrowers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Friend Carol",
        phone: `+1555${runId}02`,
      }),
    });
    expect(bor2Res.ok, `Create borrower2 failed: ${bor2Res.status}`).toBeTruthy();
    const bor2 = (await bor2Res.json()) as { id: string };
    borrower2Id = bor2.id;

    // 6. Create a pending borrow request on item[1] (Screwdriver Set)
    const reqRes = await fetch(`${apiBase}/api/collections/borrow_requests`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        item_id: itemIds[1],
        borrower_id: borrower2Id,
        message: "Can I borrow this for the weekend?",
        status: "pending",
      }),
    });
    expect(reqRes.ok, `Create borrow request failed: ${reqRes.status}`).toBeTruthy();
    const req = (await reqRes.json()) as { id: string };
    requestId = req.id;

    // 7. Create an active loan on item[0] (Hammer)
    const returnBy = new Date(Date.now() + 7 * 86400000).toISOString();
    const loanRes = await fetch(`${apiBase}/api/collections/loans`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        item_id: itemIds[0],
        borrower_id: borrowerId,
        status: "active",
        return_by: returnBy,
      }),
    });
    expect(loanRes.ok, `Create loan failed: ${loanRes.status}`).toBeTruthy();
    const loan = (await loanRes.json()) as { id: string };
    loanId = loan.id;

    // Mark the loaned item as borrowed
    const patchRes = await fetch(`${apiBase}/api/collections/items/${itemIds[0]}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "borrowed" }),
    });
    expect(patchRes.ok, `Patch item status failed: ${patchRes.status}`).toBeTruthy();
  });

  // --- CLEANUP: Delete all created data via API (reverse dependency order) ---
  test.afterAll(async () => {
    if (!authToken) return;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };

    // Helper: ignore 404s (item may have been deleted by a test)
    async function apiDelete(path: string) {
      const res = await fetch(`${apiBase}${path}`, { method: "DELETE", headers });
      if (!res.ok && res.status !== 404 && res.status !== 204) {
        console.warn(`Cleanup: DELETE ${path} returned ${res.status}`);
      }
    }

    // Delete in reverse dependency order: loans → requests → items → borrowers → library
    if (loanId) await apiDelete(`/api/collections/loans/${loanId}`);
    if (requestId) await apiDelete(`/api/collections/borrow_requests/${requestId}`);
    for (const itemId of itemIds) {
      await apiDelete(`/api/collections/items/${itemId}`);
    }
    if (borrowerId) await apiDelete(`/api/collections/borrowers/${borrowerId}`);
    if (borrower2Id) await apiDelete(`/api/collections/borrowers/${borrower2Id}`);
    if (libraryId) await apiDelete(`/api/collections/libraries/${libraryId}`);

    console.log(`Cleanup: deleted all test data for ${email}`);
  });

  async function login(page: Page) {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible({ timeout: 15000 });
  }

  // --- READ tests: verify pre-existing data loads correctly ---

  test("dashboard shows pre-existing library with item count", async ({ page }) => {
    await login(page);

    await expect(page.getByText(`Returning User Tools ${runId}`)).toBeVisible();
    await expect(page.getByText("4 items")).toBeVisible();
  });

  test("dashboard shows active loan in Currently Borrowed", async ({ page }) => {
    await login(page);

    await expect(page.getByText("Currently Borrowed")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Hammer")).toBeVisible();
    await expect(page.getByText("Neighbor Dave")).toBeVisible();
    await expect(page.getByText("Mark Returned")).toBeVisible();
  });

  test("dashboard shows pending request", async ({ page }) => {
    await login(page);

    await expect(page.getByText("Pending Requests")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Screwdriver Set").first()).toBeVisible();
  });

  test("library detail shows pre-existing items with status badges", async ({ page }) => {
    await login(page);

    await page.getByText(`Returning User Tools ${runId}`).click();
    await expect(page.getByRole("heading", { name: `Returning User Tools ${runId}` })).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Hammer")).toBeVisible();
    await expect(page.getByText("Screwdriver Set")).toBeVisible();
    await expect(page.getByText("Tape Measure")).toBeVisible();
    await expect(page.getByText("Wrench Set")).toBeVisible();

    // Borrowed item should show status
    await expect(page.getByText("borrowed").first()).toBeVisible();
  });

  // --- CROSS-SESSION: verify data survives a completely fresh browser session ---

  test("cross-session persistence — logout + re-login shows same data", async ({ page, context }) => {
    await login(page);
    await expect(page.getByText(`Returning User Tools ${runId}`)).toBeVisible();

    // Clear all storage to simulate session expiry
    await context.clearCookies();
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    // Re-login
    await login(page);

    // Same data should be visible
    await expect(page.getByText(`Returning User Tools ${runId}`)).toBeVisible();
    await expect(page.getByText("4 items")).toBeVisible();
  });

  test("cross-browser session — new browser context sees pre-existing data", async ({ browser }) => {
    // Create a completely fresh browser context (no shared cookies, storage, etc.)
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();

    try {
      await freshPage.goto("/login");
      await freshPage.getByPlaceholder("Email").fill(email);
      await freshPage.getByPlaceholder("Password").fill(password);
      await freshPage.getByRole("button", { name: "Sign In" }).click();
      await expect(freshPage.getByRole("heading", { name: "My Libraries" })).toBeVisible({ timeout: 15000 });

      // Verify pre-existing data is all there
      await expect(freshPage.getByText(`Returning User Tools ${runId}`)).toBeVisible();
      await expect(freshPage.getByText("4 items")).toBeVisible();
      await expect(freshPage.getByText("Currently Borrowed")).toBeVisible({ timeout: 10000 });
      await expect(freshPage.getByText("Hammer")).toBeVisible();
    } finally {
      await freshContext.close();
    }
  });

  // --- UPDATE tests: modify pre-existing data ---

  test("approve pre-existing borrow request from notifications", async ({ page }) => {
    await login(page);

    // Navigate to notifications
    await page.goto("/dashboard/notifications");
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible({ timeout: 10000 });

    // Pending request should show
    await expect(page.getByText("Screwdriver Set").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Friend Carol")).toBeVisible();

    // Approve it
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Request approved")).toBeVisible({ timeout: 10000 });
  });

  test("mark pre-existing loan as returned from dashboard", async ({ page }) => {
    await login(page);

    await expect(page.getByText("Currently Borrowed")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Hammer")).toBeVisible();

    // Mark returned
    await page.getByRole("button", { name: "Mark Returned" }).first().click();
    // Confirm in dialog
    await page.getByRole("dialog").getByRole("button", { name: "Mark Returned" }).click();
    await expect(page.getByText("Item marked as returned")).toBeVisible({ timeout: 10000 });
  });

  // --- DELETE tests: remove pre-existing data ---

  test("delete pre-existing item from library detail", async ({ page }) => {
    await login(page);

    // Navigate to library detail
    await page.getByText(`Returning User Tools ${runId}`).click();
    await expect(page.getByRole("heading", { name: `Returning User Tools ${runId}` })).toBeVisible({ timeout: 10000 });

    // Tape Measure should be visible
    await expect(page.getByText("Tape Measure")).toBeVisible();

    // Delete Tape Measure — find its card and click Delete
    const tapeCard = page.locator(".card", { hasText: "Tape Measure" });
    await tapeCard.getByRole("button", { name: "Delete" }).click();

    // Confirm deletion in dialog
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Item deleted")).toBeVisible({ timeout: 10000 });

    // Tape Measure should be gone
    await expect(page.getByText("Tape Measure")).not.toBeVisible();
  });

  // --- FINAL VERIFICATION: after all mutations, verify state is correct ---

  test("final state — verify all mutations persisted in fresh session", async ({ browser }) => {
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();

    try {
      await freshPage.goto("/login");
      await freshPage.getByPlaceholder("Email").fill(email);
      await freshPage.getByPlaceholder("Password").fill(password);
      await freshPage.getByRole("button", { name: "Sign In" }).click();
      await expect(freshPage.getByRole("heading", { name: "My Libraries" })).toBeVisible({ timeout: 15000 });

      // Library should show updated item count (4 - 1 deleted = 3)
      await expect(freshPage.getByText(`Returning User Tools ${runId}`)).toBeVisible();
      await expect(freshPage.getByText("3 items")).toBeVisible();

      // Navigate to library detail to verify item state
      await freshPage.getByText(`Returning User Tools ${runId}`).click();
      await expect(freshPage.getByRole("heading", { name: `Returning User Tools ${runId}` })).toBeVisible({ timeout: 10000 });

      // Hammer should be back to available (loan was returned)
      await expect(freshPage.getByText("Hammer")).toBeVisible();
      // Screwdriver Set should be borrowed (request was approved → loan created)
      await expect(freshPage.getByText("Screwdriver Set")).toBeVisible();
      // Wrench Set should still be available
      await expect(freshPage.getByText("Wrench Set")).toBeVisible();
      // Tape Measure should be gone (deleted)
      await expect(freshPage.getByText("Tape Measure")).not.toBeVisible();
    } finally {
      await freshContext.close();
    }
  });
});
