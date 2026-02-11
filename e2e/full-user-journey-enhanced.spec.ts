import { test, expect } from "@playwright/test";

/**
 * Enhanced full user journey test
 * Covers the complete flow from signup to borrowing and returning items
 */
test.describe("Full User Journey (Enhanced)", () => {
  const timestamp = Date.now();
  const ownerEmail = `owner-${timestamp}@test.local`;
  const ownerPassword = "SecurePass123!";
  let librarySlug: string;
  let itemId: string;

  test("Complete flow: signup → create library → add item → borrow → return", async ({ page }) => {
    // ========== STEP 1: Owner Registration ==========
    await page.goto("/signup");
    await page.fill('input[type="email"]', ownerEmail);
    await page.fill('input[type="password"]', ownerPassword);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("h1")).toContainText("My Libraries");

    // ========== STEP 2: Create Library ==========
    await page.click('button:has-text("Create Library")');
    await page.fill('input[name="name"]', `Test Library ${timestamp}`);
    await page.fill('textarea[name="description"]', "A test library for E2E testing");
    await page.click('button:has-text("Create")');

    // Wait for library to appear
    await expect(page.locator(".card").first()).toBeVisible();
    const libraryCard = page.locator(".card").first();
    await expect(libraryCard).toContainText(`Test Library ${timestamp}`);

    // Extract library slug from the URL
    await libraryCard.click();
    await page.waitForURL(/\/dashboard\/library\/.+/);
    librarySlug = page.url().split("/").pop()!;

    // ========== STEP 3: Add Item ==========
    await page.click('a:has-text("Add Item")');
    await expect(page).toHaveURL(`/dashboard/library/${librarySlug}/add`);

    // Fill item form (skip photo for speed)
    await page.fill('input[name="name"]', "Test Item");
    await page.fill('textarea[placeholder*="details"]', "A test item description");
    await page.click('button[type="submit"]');

    // Should redirect back to library
    await expect(page).toHaveURL(`/dashboard/library/${librarySlug}`);
    await expect(page.locator(".card").first()).toContainText("Test Item");

    // Extract item ID
    const itemCard = page.locator(".card:has-text('Test Item')").first();
    const itemLink = await itemCard.locator("a").first().getAttribute("href");
    itemId = itemLink?.split("/").pop()!;

    // ========== STEP 4: Copy Share Link ==========
    await page.click('button:has-text("Share")');
    const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(shareUrl).toContain(`/l/${librarySlug}`);

    // ========== STEP 5: Public Browsing (as borrower) ==========
    // Sign out
    await page.click('[aria-label="User menu"]');
    await page.click('button:has-text("Sign out")');
    await expect(page).toHaveURL("/login");

    // Visit public library
    await page.goto(`/l/${librarySlug}`);
    await expect(page.locator("h1")).toContainText(`Test Library ${timestamp}`);
    await expect(page.locator(".card:has-text('Test Item')")).toBeVisible();

    // ========== STEP 6: Borrow Request ==========
    await page.click(".card:has-text('Test Item')");
    await expect(page).toHaveURL(`/l/${librarySlug}/${itemId}`);
    await expect(page.locator("h1")).toContainText("Test Item");

    await page.click('button:has-text("Borrow This")');

    // Fill borrow request form
    await page.fill('input[placeholder*="name"]', "Test Borrower");
    await page.fill('input[type="tel"]', "+1 555-0100");
    await page.fill('textarea[placeholder*="message"]', "I need this for testing");
    await page.click('button:has-text("Submit Request")');

    // Should show confirmation
    await expect(page).toHaveURL(/\/borrow\/.+/);
    await expect(page.locator("h1")).toContainText("Request Sent");

    // ========== STEP 7: Owner Approves Request ==========
    // Sign back in as owner
    await page.goto("/login");
    await page.fill('input[type="email"]', ownerEmail);
    await page.fill('input[type="password"]', ownerPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");

    // Should see pending request
    await expect(page.locator('h2:has-text("Pending Requests")')).toBeVisible();
    await expect(page.locator('.card:has-text("Test Borrower")')).toBeVisible();

    // Approve request
    await page.click('.card:has-text("Test Borrower") button:has-text("Approve")');

    // Set return date (7 days from now)
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 7);
    const dateStr = returnDate.toISOString().split("T")[0];
    await page.fill('input[type="date"]', dateStr);
    await page.click('button:has-text("Confirm")');

    // Should show success toast
    await expect(page.locator('[role="alert"]:has-text("approved")')).toBeVisible();

    // ========== STEP 8: Verify Active Loan ==========
    await expect(page.locator('h2:has-text("Active Loans")')).toBeVisible();
    await expect(page.locator('.card:has-text("Test Item")')).toBeVisible();
    await expect(page.locator('.card:has-text("Test Borrower")')).toBeVisible();

    // ========== STEP 9: Mark as Returned ==========
    await page.click('.card:has-text("Test Item") button:has-text("Mark Returned")');

    // Confirmation dialog
    await page.click('button:has-text("Confirm")');

    // Should show success toast
    await expect(page.locator('[role="alert"]:has-text("returned")')).toBeVisible();

    // Active loans section should be empty or show "No active loans"
    await expect(page.locator('.card:has-text("Test Item")')).not.toBeVisible();

    // ========== STEP 10: Verify Item is Available Again ==========
    await page.goto(`/dashboard/library/${librarySlug}`);
    const itemStatus = page.locator(".card:has-text('Test Item') .badge");
    await expect(itemStatus).toHaveText("Available");
  });

  test("Settings: Update display name and phone", async ({ page }) => {
    // Sign in first
    await page.goto("/login");
    await page.fill('input[type="email"]', ownerEmail);
    await page.fill('input[type="password"]', ownerPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");

    // Navigate to settings
    await page.click('[aria-label="User menu"]');
    await page.click('a:has-text("Settings")');
    await expect(page).toHaveURL("/dashboard/settings");

    // Update profile
    await page.fill('input[id="displayName"]', "Test User");
    await page.fill('input[id="phone"]', "+1 555-0100");
    await page.click('button[type="submit"]');

    // Should show success toast
    await expect(page.locator('[role="alert"]:has-text("Settings saved")')).toBeVisible();

    // Reload page and verify persistence
    await page.reload();
    await expect(page.locator('input[id="displayName"]')).toHaveValue("Test User");
    await expect(page.locator('input[id="phone"]')).toHaveValue("+1 555-0100");
  });

  test("404 Page: Unknown routes show not found", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.locator("h1")).toContainText("404");
    await expect(page.locator('a:has-text("Go Home")')).toBeVisible();

    await page.click('a:has-text("Go Home")');
    await expect(page).toHaveURL("/");
  });
});
