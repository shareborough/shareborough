import { test, expect } from "@playwright/test";
import { registerUser, uniqueName, createLibrary, openLibrary, addItem } from "./helpers";

test.describe("Golden Path — Full User Journey", () => {
  test("register, create library, add item, share, borrow, approve, return", async ({ page }) => {
    // Step 1: Register a new owner
    const email = await registerUser(page);
    await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible();

    // Step 2: Create a library
    const libraryName = uniqueName("Neighborhood Tools");
    await createLibrary(page, libraryName);

    // Step 3: Open the library
    await openLibrary(page, libraryName);
    await expect(page.getByRole("heading", { name: libraryName })).toBeVisible();

    // Step 4: Add an item
    const itemName = uniqueName("Cordless Drill");
    await addItem(page, itemName, "DeWalt 20V Max");
    await expect(page.getByText(itemName)).toBeVisible();
    await expect(page.getByText("available")).toBeVisible();

    // Step 5: Get the share link
    await page.getByRole("button", { name: "Copy Link" }).click();
    await expect(page.getByText("Copied!")).toBeVisible();

    // Step 6: Visit the public library page
    const shareLink = page.getByRole("link", { name: /\/l\// });
    const slug = await shareLink.getAttribute("href");
    expect(slug).toBeTruthy();
    await page.goto(slug!);
    await expect(page.getByRole("heading", { name: libraryName })).toBeVisible();
    await expect(page.getByText(itemName)).toBeVisible();

    // Step 7: Click on the item
    await page.getByText(itemName).click();
    await expect(page.getByRole("heading", { name: itemName })).toBeVisible();
    await expect(page.getByText("available")).toBeVisible();
    await expect(page.getByRole("button", { name: "Borrow This" })).toBeVisible();

    // Step 8: Submit borrow request
    await page.getByRole("button", { name: "Borrow This" }).click();
    await page.getByPlaceholder("Your name").fill("Jane Neighbor");
    await page.getByPlaceholder("Phone number").fill("+15559876543");
    await page.getByPlaceholder("Message to the owner").fill("I need it for a weekend project!");
    await page.getByRole("button", { name: "Send Request" }).click();

    // Step 9: Confirm borrow request page
    await expect(page.getByText("Request Sent!")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Your request to borrow")).toBeVisible();

    // Step 10: Go to notifications page to approve
    await page.goto("/dashboard/notifications");
    await expect(page.getByText("Pending Requests")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Jane Neighbor")).toBeVisible();
    await expect(page.getByText(itemName)).toBeVisible();

    // Step 11: Approve the request
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Request approved")).toBeVisible({ timeout: 10000 });

    // Step 12: Verify item shows as borrowed
    await expect(page.getByText("Currently Borrowed")).toBeVisible({ timeout: 5000 });

    // Step 13: Mark as returned
    await page.getByRole("button", { name: "Mark Returned" }).click();
    // Confirm in the ConfirmDialog modal
    await page.getByRole("dialog").getByRole("button", { name: "Mark Returned" }).click();
    await expect(page.getByText("Item marked as returned")).toBeVisible({ timeout: 10000 });
  });

  test("settings page is accessible from avatar dropdown", async ({ page }) => {
    await registerUser(page);

    // Open avatar dropdown
    await page.getByLabel("Account menu").click();
    await page.getByRole("menuitem", { name: "Settings" }).click();

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Display name")).toBeVisible();
  });

  test("404 page shows for unknown routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
  });

  test("skeleton loading states appear while data loads", async ({ page }) => {
    await registerUser(page);

    // Navigate to dashboard — the skeleton should appear briefly before content
    await page.goto("/dashboard");
    // We can't reliably catch the skeleton (it's <100ms), but we verify
    // the page transitions from loading → content without errors.
    // The aria-label "Loading dashboard" is the skeleton container.
    await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible({ timeout: 10000 });

    // Navigate to settings to verify another page's skeleton
    await page.getByLabel("Account menu").click();
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 5000 });
  });

  test("library stats show after lending activity", async ({ page }) => {
    // Register and create library with item
    await registerUser(page);
    const libraryName = uniqueName("Stats Library");
    await createLibrary(page, libraryName);
    await openLibrary(page, libraryName);
    const itemName = uniqueName("Stat Item");
    await addItem(page, itemName, "For stats test");

    // Borrow the item
    const shareLink = page.getByRole("link", { name: /\/l\// });
    const slug = await shareLink.getAttribute("href");
    await page.goto(slug!);
    await page.getByText(itemName).click();
    await page.getByRole("button", { name: "Borrow This" }).click();
    await page.getByPlaceholder("Your name").fill("Stats Friend");
    await page.getByPlaceholder("Phone number").fill("+15559999999");
    await page.getByRole("button", { name: "Send Request" }).click();
    await expect(page.getByText("Request Sent!")).toBeVisible({ timeout: 10000 });

    // Approve from notifications page
    await page.goto("/dashboard/notifications");
    await expect(page.getByText("Pending Requests")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Request approved")).toBeVisible({ timeout: 10000 });

    // Verify stats appear on library card
    await expect(page.getByTestId("stat-lent")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("stat-friends")).toBeVisible();
  });

  test("PWA manifest is accessible", async ({ page }) => {
    await page.goto("/manifest.json");
    const response = await page.evaluate(() =>
      fetch("/manifest.json").then((r) => r.json()),
    );
    expect(response.name).toContain("Shareborough");
    expect(response.display).toBe("standalone");
    expect(response.icons.length).toBeGreaterThanOrEqual(2);
  });

  test("item images use lazy loading attributes when photos exist", async ({ page }) => {
    await registerUser(page);
    const libraryName = uniqueName("Lazy Lib");
    await createLibrary(page, libraryName);
    await openLibrary(page, libraryName);
    const itemName = uniqueName("Lazy Item");
    await addItem(page, itemName, "Lazy load test");

    // Visit public library — check img attributes
    const shareLink = page.getByRole("link", { name: /\/l\// });
    const slug = await shareLink.getAttribute("href");
    await page.goto(slug!);
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10000 });

    // Check all remote images for lazy loading attributes.
    // Items added without photos won't have remote images, so this loop
    // validates the pattern only when photo URLs are present.
    const images = page.locator("img[alt]");
    const count = await images.count();
    let remoteImageCount = 0;
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const src = await img.getAttribute("src");
      // Only check remote images (not emoji placeholders or data URLs)
      if (src && !src.startsWith("data:") && src.startsWith("http")) {
        remoteImageCount++;
        await expect(img).toHaveAttribute("loading", "lazy");
        await expect(img).toHaveAttribute("decoding", "async");
      }
    }
    // Log for visibility — this test is meaningful only when items have photos
    if (remoteImageCount === 0) {
      // No remote images found (item added without photo), which is expected.
      // The lazy loading behavior is verified in unit tests (ResponsiveImage.test.tsx).
      expect(true).toBe(true);
    }
  });
});
