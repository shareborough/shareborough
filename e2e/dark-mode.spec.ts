import { test, expect } from "@playwright/test";
import { registerUser } from "./helpers";

test.describe("Dark Mode — Theme Toggle & Persistence", () => {
  test("theme toggle cycles through light → dark → system", async ({ page }) => {
    await registerUser(page);

    // NavBar should have a theme toggle button
    const toggle = page.getByRole("button", { name: /Switch to/ });
    await expect(toggle).toBeVisible();

    // Default is system — label should be "Switch to light mode"
    await expect(toggle).toHaveAttribute("aria-label", "Switch to light mode");

    // Click to switch to light mode
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Switch to dark mode");

    // Click to switch to dark mode
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Switch to system theme");

    // Verify dark class is on <html>
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");

    // Click to switch back to system
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Switch to light mode");
  });

  test("dark mode persists across page navigation", async ({ page }) => {
    await registerUser(page);

    // Switch to dark mode
    const toggle = page.getByRole("button", { name: /Switch to/ });
    await toggle.click(); // system → light
    await toggle.click(); // light → dark

    // Verify dark class applied
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Navigate to settings
    await page.goto("/dashboard/settings");

    // Wait for Settings page to load (replaces networkidle which hangs with SSE)
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10000 });

    // Dark class should still be applied after navigation
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Toggle should still show dark mode state
    const settingsToggle = page.getByRole("button", { name: "Switch to system theme" });
    await expect(settingsToggle).toBeVisible();
  });

  test("dark mode persists across page reload", async ({ page }) => {
    await registerUser(page);

    // Switch to dark mode
    const toggle = page.getByRole("button", { name: /Switch to/ });
    await toggle.click(); // system → light
    await toggle.click(); // light → dark

    await expect(page.locator("html")).toHaveClass(/dark/);

    // Reload the page
    await page.reload();

    // Wait for dashboard to load (replaces networkidle which hangs with SSE)
    await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible({ timeout: 15000 });

    // Dark class should be applied immediately (FOUC prevention script)
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Toggle should still be in dark mode state
    await expect(page.getByRole("button", { name: "Switch to system theme" })).toBeVisible();
  });

  test("dark mode applies correct background colors", async ({ page }) => {
    await registerUser(page);

    // Switch to dark mode
    const toggle = page.getByRole("button", { name: /Switch to/ });
    await toggle.click(); // system → light
    await toggle.click(); // light → dark

    // Check that the body has a dark background
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // Dark mode bg-gray-900 = rgb(17, 24, 39)
    expect(bodyBg).toBe("rgb(17, 24, 39)");
  });

  test("theme toggle is accessible on landing page", async ({ page }) => {
    await page.goto("/");

    // Landing page has a ThemeToggle in its header
    const toggle = page.getByRole("button", { name: /Switch to/ });
    await expect(toggle).toBeVisible({ timeout: 5000 });

    // Click to verify it works and doesn't crash
    await toggle.click();
    await expect(toggle).toBeVisible();
  });

  test("light mode has light background", async ({ page }) => {
    await registerUser(page);

    // Switch to explicit light mode
    const toggle = page.getByRole("button", { name: /Switch to/ });
    await toggle.click(); // system → light

    // html should NOT have dark class
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass || "").not.toContain("dark");

    // Body should have light background
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Should not be the dark background color
    expect(bodyBg).not.toBe("rgb(17, 24, 39)");
  });
});
