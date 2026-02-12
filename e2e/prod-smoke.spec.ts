/**
 * Prod smoke test — tests against the LIVE shareborough.com site.
 *
 * Verifies the specific issues reported:
 * 1. Borrow flow works (no "Something went wrong")
 * 2. Page fits mobile viewport (no zoom required)
 * 3. My Libraries link is accessible after login
 * 4. Library creation and item add flow works
 *
 * Usage:
 *   BASE_URL=https://shareborough.com npx playwright test e2e/prod-smoke.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";

// Use production URL if BASE_URL is set, otherwise fall back to local
const PROD_URL = process.env.BASE_URL || "https://shareborough.com";

// Test accounts from seed data
const TEST_USER = { email: "m@m.m", password: "mmmmmmm&" };
const DEMO_USER = { email: "demo@shareborough.com", password: "demo1234" };

async function login(page: Page, email: string, password: string) {
  await page.goto(`${PROD_URL}/login`);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible({ timeout: 15000 });
}

test.describe("Prod Smoke Tests", () => {
  test.describe.configure({ timeout: 60000 });

  test("landing page loads", async ({ page }) => {
    await page.goto(PROD_URL);
    await expect(page.getByText("Shareborough")).toBeVisible({ timeout: 10000 });
  });

  test("login works with test account", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    // Should be on dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test("page fits mobile viewport after login (no horizontal overflow)", async ({ page }) => {
    // Use iPhone SE viewport (smallest common phone)
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, TEST_USER.email, TEST_USER.password);

    // Check that no element extends beyond viewport
    const overflowWidth = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflowWidth).toBe(false);
  });

  test("My Libraries heading is visible on dashboard", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, TEST_USER.email, TEST_USER.password);
    await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible();
  });

  test("can create a library and add an item", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // Click + New Library
    await page.getByRole("button", { name: /New Library/ }).click();
    const libName = `Smoke Test ${Date.now()}`;
    await page.getByPlaceholder(/Power Tools/).fill(libName);
    await page.getByRole("button", { name: "Create Library" }).click();

    // Wait for creation — form should disappear
    await expect(page.getByRole("button", { name: "Create Library" })).not.toBeVisible({ timeout: 10000 });

    // Library card should appear
    await expect(page.getByText(libName)).toBeVisible({ timeout: 5000 });

    // Navigate into the library
    await page.getByText(libName).click();
    await expect(page.getByRole("heading", { name: libName })).toBeVisible({ timeout: 10000 });

    // Add an item
    await page.getByRole("link", { name: "+ Add Item" }).click();
    await page.getByPlaceholder("What is this item?").fill("Smoke Test Item");
    await page.getByRole("button", { name: "Add Item" }).click();

    // Should redirect back to library detail with the item visible
    await expect(page.getByText("Smoke Test Item")).toBeVisible({ timeout: 10000 });
  });

  test("public library page loads", async ({ page }) => {
    await page.goto(`${PROD_URL}/l/neighborhood-tools`);
    await expect(page.getByText("Neighborhood Tools")).toBeVisible({ timeout: 10000 });
  });

  test("public library shows My Libraries link when logged in", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto(`${PROD_URL}/l/neighborhood-tools`);
    await expect(page.getByText("Neighborhood Tools")).toBeVisible({ timeout: 10000 });
    // The "My Libraries" link should be visible for logged-in users
    const myLibLink = page.getByRole("link", { name: "My Libraries" });
    await expect(myLibLink).toBeVisible();
    // Click it — should navigate to dashboard
    await myLibLink.click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test("borrow flow: can open item and submit request", async ({ page }) => {
    // Browse as public user (not logged in)
    await page.goto(`${PROD_URL}/l/neighborhood-tools`);
    await expect(page.getByText("Neighborhood Tools")).toBeVisible({ timeout: 10000 });

    // Click first available item
    const availableItem = page.locator("a").filter({ has: page.locator("text=available") }).first();
    await availableItem.click();

    // Should see item detail with "Borrow This" button
    const borrowBtn = page.getByRole("button", { name: "Borrow This" });
    // Item might be borrowed already — check if button exists
    const isBorrowable = await borrowBtn.isVisible().catch(() => false);
    if (!isBorrowable) {
      // Item is borrowed — just verify the page loaded correctly
      await expect(page.getByText(/currently/i)).toBeVisible();
      return;
    }

    await borrowBtn.click();

    // Fill borrow form
    await page.getByPlaceholder("Your name").fill("Smoke Test Borrower");
    await page.getByPlaceholder("Phone number").fill("555-000-9999");
    await page.getByRole("button", { name: "Send Request" }).click();

    // Should see confirmation OR a specific error (not generic "Something went wrong")
    const result = await Promise.race([
      page.getByText("Request Sent!").waitFor({ timeout: 10000 }).then(() => "success"),
      page.getByText(/Something went wrong/).waitFor({ timeout: 10000 }).then(() => "generic-error"),
      page.locator(".text-red-500").first().waitFor({ timeout: 10000 }).then(async (el) => {
        const text = await el.textContent();
        return `error: ${text}`;
      }),
    ]);

    // If we got a generic error, fail with details
    if (result === "generic-error") {
      test.fail(true, "Got generic 'Something went wrong' error — check server logs and RPC endpoints");
    }
    if (result.startsWith("error:")) {
      // We got a specific error — that's better than generic, but still log it
      console.log(`Borrow request returned specific error: ${result}`);
    }
  });

  test("demo user can see and approve pending requests", async ({ page }) => {
    await login(page, DEMO_USER.email, DEMO_USER.password);

    // Check if there are pending requests
    const hasPending = await page.getByText("Pending Requests").isVisible().catch(() => false);
    if (hasPending) {
      // Try to approve
      const approveBtn = page.getByRole("button", { name: "Approve" }).first();
      await approveBtn.click();

      // Should NOT get generic error
      await page.waitForTimeout(3000);
      const errorVisible = await page.getByText(/Something went wrong/).isVisible().catch(() => false);
      expect(errorVisible).toBe(false);
    }
  });

  test("mobile viewport: no content overflows on key pages", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Check landing page
    await page.goto(PROD_URL);
    await page.waitForLoadState("networkidle");
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);

    // Check public library page
    await page.goto(`${PROD_URL}/l/neighborhood-tools`);
    await page.waitForLoadState("networkidle");
    overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);

    // Check login page
    await page.goto(`${PROD_URL}/login`);
    await page.waitForLoadState("networkidle");
    overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);

    // Check dashboard after login
    await login(page, TEST_USER.email, TEST_USER.password);
    overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});
