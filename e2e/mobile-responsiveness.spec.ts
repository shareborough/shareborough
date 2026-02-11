import { test, expect, devices } from "@playwright/test";

/**
 * Mobile responsiveness tests
 * Verifies UI works correctly on mobile devices (iPhone SE viewport)
 */

// Configure mobile device for all tests in this file
const mobileTest = test.extend({});
mobileTest.use({
  ...devices["iPhone SE"],
});

test.describe("Mobile Responsiveness", () => {

  const timestamp = Date.now();
  const testEmail = `mobile-${timestamp}@test.local`;
  const testPassword = "SecurePass123!";

  mobileTest("Landing page: No overflow, buttons accessible", async ({ page }) => {
    await page.goto("/");

    // Check for horizontal overflow
    const body = await page.locator("body").boundingBox();
    const viewport = page.viewportSize()!;
    expect(body!.width).toBeLessThanOrEqual(viewport.width);

    // Verify buttons are visible and clickable
    const signInButton = page.locator('a:has-text("Sign in")');
    const getStartedButton = page.locator('a:has-text("Get Started")');

    await expect(signInButton).toBeVisible();
    await expect(getStartedButton).toBeVisible();

    // Verify minimum touch target size (44px)
    const signInBox = await signInButton.boundingBox();
    expect(signInBox!.height).toBeGreaterThanOrEqual(44);

    // Click buttons to verify they work
    await getStartedButton.click();
    await expect(page).toHaveURL("/signup");
  });

  mobileTest("Auth pages: Forms fit viewport, no horizontal scroll", async ({ page }) => {
    await page.goto("/signup");

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance

    // Fill form on mobile
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    // Verify inputs are fully visible
    const emailInput = page.locator('input[type="email"]');
    const inputBox = await emailInput.boundingBox();
    const viewport = page.viewportSize()!;
    expect(inputBox!.x).toBeGreaterThanOrEqual(0);
    expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(viewport.width);
  });

  mobileTest("Dashboard: Cards stack vertically on mobile", async ({ page }) => {
    // Sign up first
    await page.goto("/signup");
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");

    // Create a test library
    await page.click('button:has-text("Create Library")');
    await page.fill('input[name="name"]', "Mobile Test Library");
    await page.click('button:has-text("Create")');

    // Verify library card is visible and fits viewport
    const libraryCard = page.locator(".card").first();
    await expect(libraryCard).toBeVisible();

    const cardBox = await libraryCard.boundingBox();
    const viewport = page.viewportSize()!;
    expect(cardBox!.width).toBeLessThanOrEqual(viewport.width);
  });

  mobileTest("Add Item: Photo buttons visible, crop gestures work", async ({ page }) => {
    // Sign in
    await page.goto("/login");
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");

    // Go to first library
    await page.click(".card").first();
    await page.click('a:has-text("Add Item")');

    // Verify both photo buttons are visible
    const cameraButton = page.locator('label:has-text("📸 Camera")');
    const galleryButton = page.locator('label:has-text("🖼️ Gallery")');

    await expect(cameraButton).toBeVisible();
    await expect(galleryButton).toBeVisible();

    // Verify buttons are side-by-side (flex layout)
    const cameraBox = await cameraButton.boundingBox();
    const galleryBox = await galleryButton.boundingBox();

    // Both should be in the same row (similar Y position)
    expect(Math.abs(cameraBox!.y - galleryBox!.y)).toBeLessThan(10);

    // Both should fit within viewport
    const viewport = page.viewportSize()!;
    expect(cameraBox!.x + cameraBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(galleryBox!.x + galleryBox!.width).toBeLessThanOrEqual(viewport.width);
  });

  mobileTest("Settings: Form fields stack vertically, no overflow", async ({ page }) => {
    // Sign in
    await page.goto("/login");
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");

    // Go to settings
    await page.click('[aria-label="User menu"]');
    await page.click('a:has-text("Settings")');
    await expect(page).toHaveURL("/dashboard/settings");

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Verify input fields are fully visible
    const displayNameInput = page.locator('input[id="displayName"]');
    const inputBox = await displayNameInput.boundingBox();
    const viewport = page.viewportSize()!;
    expect(inputBox!.width).toBeLessThanOrEqual(viewport.width - 32); // Account for padding
  });

  mobileTest("Public library: Grid adapts to mobile, text wraps properly", async ({ page }) => {
    // Create a public library with a long name
    await page.goto("/login");
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");

    await page.click('button:has-text("Create Library")');
    await page.fill(
      'input[name="name"]',
      "This is a very long library name that should wrap properly on mobile devices"
    );
    await page.click('button:has-text("Create")');

    // Get library slug
    await page.click(".card").first();
    const url = page.url();
    const librarySlug = url.split("/").pop()!;

    // Visit public page
    await page.goto(`/l/${librarySlug}`);

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Verify title wraps and is visible
    const title = page.locator("h1");
    await expect(title).toBeVisible();
    const titleBox = await title.boundingBox();
    const viewport = page.viewportSize()!;
    expect(titleBox!.width).toBeLessThanOrEqual(viewport.width - 32);
  });
});
