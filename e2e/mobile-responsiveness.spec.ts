import { test, expect, devices } from "@playwright/test";
import { registerUser, createLibrary, openLibrary, uniqueName } from "./helpers";

/**
 * Mobile responsiveness tests
 * Verifies UI works correctly on mobile devices (iPhone SE viewport)
 */
test.describe("Mobile Responsiveness", () => {
  test.use({ ...devices["iPhone SE"] });

  test("Landing page: no overflow, buttons accessible", async ({ page }) => {
    await page.goto("/");

    // Check for horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Verify buttons are visible
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Started" })).toBeVisible();

    // Verify minimum touch target size (44px)
    const getStarted = page.getByRole("link", { name: "Get Started" });
    const box = await getStarted.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("Auth pages: forms fit viewport", async ({ page }) => {
    await page.goto("/signup");

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Verify inputs are fully visible within viewport
    const emailInput = page.getByPlaceholder("Email");
    const inputBox = await emailInput.boundingBox();
    const viewport = page.viewportSize()!;
    expect(inputBox!.x).toBeGreaterThanOrEqual(0);
    expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(viewport.width);
  });

  test("Dashboard: library cards fit mobile viewport", async ({ page }) => {
    await registerUser(page);
    const libName = uniqueName("Mobile");
    await createLibrary(page, libName);

    const libraryCard = page.locator(".card").first();
    await expect(libraryCard).toBeVisible();

    const cardBox = await libraryCard.boundingBox();
    const viewport = page.viewportSize()!;
    expect(cardBox!.width).toBeLessThanOrEqual(viewport.width);
  });

  test("Add Item: photo buttons visible on mobile", async ({ page }) => {
    await registerUser(page);
    const libName = uniqueName("Mobile Photo");
    await createLibrary(page, libName);
    await openLibrary(page, libName);
    await page.getByRole("link", { name: /Add Item/i }).click();

    await expect(page.locator('label:has-text("Camera")')).toBeVisible();
    await expect(page.locator('label:has-text("Gallery")')).toBeVisible();

    // Both should fit within viewport
    const cameraBox = await page.locator('label:has-text("Camera")').boundingBox();
    const galleryBox = await page.locator('label:has-text("Gallery")').boundingBox();
    const viewport = page.viewportSize()!;
    expect(cameraBox!.x + cameraBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(galleryBox!.x + galleryBox!.width).toBeLessThanOrEqual(viewport.width);
  });

  test("Public library: no overflow with long names", async ({ page }) => {
    await registerUser(page);

    // Create library with a long name
    await page.getByRole("button", { name: /New Library/i }).click();
    await page.getByPlaceholder(/Power Tools/i).fill("This Library Has a Very Long Name That Should Wrap");
    await page.getByRole("button", { name: "Create Library" }).click();
    await expect(page.getByRole("button", { name: "Create Library" })).not.toBeVisible({ timeout: 10000 });

    // Navigate to library detail to get the share link
    await page.getByRole("link", { name: /This Library Has/ }).first().click();
    const shareLink = page.getByRole("link", { name: /\/l\// });
    const slug = await shareLink.getAttribute("href");

    // Visit public page
    await page.goto(slug!);
    await expect(page.getByRole("heading", { name: /This Library Has/ })).toBeVisible({ timeout: 5000 });

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
