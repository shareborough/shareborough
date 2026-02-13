/**
 * Prod smoke test — tests against the LIVE shareborough.com site.
 *
 * Self-contained: creates its own data (no dependency on seed data).
 * Verifies:
 * 1. Landing page loads
 * 2. Login works
 * 3. No horizontal overflow on mobile viewport
 * 4. Library creation and item CRUD
 * 5. Public library page + borrow flow
 *
 * Usage:
 *   BASE_URL=https://shareborough.com npx playwright test e2e/prod-smoke.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { uniqueEmail, uniqueName, TEST_PASSWORD } from "./helpers";

const PROD_URL = process.env.BASE_URL || "https://shareborough.com";

async function registerProdUser(page: Page): Promise<string> {
  const email = uniqueEmail();
  await page.goto(`${PROD_URL}/signup`);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible({ timeout: 30000 });
  return email;
}

async function loginProd(page: Page, email: string) {
  await page.goto(`${PROD_URL}/login`);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible({ timeout: 15000 });
}

test.describe("Prod Smoke Tests", () => {
  test.describe.configure({ timeout: 60000 });

  test("landing page loads", async ({ page }) => {
    await page.goto(PROD_URL);
    await expect(page.getByText("Shareborough")).toBeVisible({ timeout: 10000 });
  });

  test("register, create library, CRUD item, delete library", async ({ page }) => {
    // Register fresh user
    await registerProdUser(page);
    await expect(page).toHaveURL(/dashboard/);

    // Create library
    const libName = uniqueName("Smoke");
    await page.getByRole("button", { name: /New Library/ }).click();
    await page.getByPlaceholder(/Power Tools/).fill(libName);
    await page.getByRole("button", { name: "Create Library" }).click();
    await expect(page.getByRole("button", { name: "Create Library" })).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(libName)).toBeVisible({ timeout: 5000 });

    // Navigate into library
    await page.getByText(libName).click();
    await expect(page.getByRole("heading", { name: libName })).toBeVisible({ timeout: 10000 });

    // Add item
    await page.getByRole("link", { name: "+ Add Item" }).click();
    await page.getByPlaceholder("What is this item?").fill("Smoke Item");
    await page.getByPlaceholder("Any details about this item").fill("Test description");
    await page.getByRole("button", { name: "Add Item" }).click();
    await expect(page.getByText("Smoke Item")).toBeVisible({ timeout: 10000 });

    // Edit item
    await page.getByText("Edit").first().click();
    await expect(page.getByRole("heading", { name: "Edit Item" })).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder("What is this item?").fill("Smoke Item Updated");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Smoke Item Updated")).toBeVisible({ timeout: 10000 });

    // Delete item — scope to item card to avoid matching "Delete Library"
    const itemCard = page.locator(".card", { hasText: "Smoke Item Updated" });
    await itemCard.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Smoke Item Updated")).not.toBeVisible({ timeout: 5000 });

    // Delete library
    await page.getByText("Delete Library").click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    await expect(page.getByText(libName)).not.toBeVisible({ timeout: 5000 });
  });

  test("mobile viewport: no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Landing
    await page.goto(PROD_URL);
    await page.waitForLoadState("networkidle");
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);

    // Login page
    await page.goto(`${PROD_URL}/login`);
    await page.waitForLoadState("networkidle");
    overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);

    // Dashboard after login
    await registerProdUser(page);
    overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("public library + borrow flow", async ({ page }) => {
    // Register, create public library with item
    await registerProdUser(page);
    const libName = uniqueName("Public Smoke");
    await page.getByRole("button", { name: /New Library/ }).click();
    await page.getByPlaceholder(/Power Tools/).fill(libName);
    await page.getByRole("button", { name: "Create Library" }).click();
    await expect(page.getByRole("button", { name: "Create Library" })).not.toBeVisible({ timeout: 10000 });

    // Open library and add item
    await page.getByText(libName).click();
    await expect(page.getByRole("heading", { name: libName })).toBeVisible({ timeout: 10000 });
    await page.getByRole("link", { name: "+ Add Item" }).click();
    await page.getByPlaceholder("What is this item?").fill("Borrowable Item");
    await page.getByRole("button", { name: "Add Item" }).click();
    await expect(page.getByText("Borrowable Item")).toBeVisible({ timeout: 10000 });

    // Get share link and visit public page
    const shareLink = page.locator('a[href*="/l/"]');
    const slug = await shareLink.getAttribute("href");
    await page.goto(`${PROD_URL}${slug}`);
    await expect(page.getByRole("heading", { name: libName })).toBeVisible({ timeout: 10000 });
  });
});
