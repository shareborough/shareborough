import { test, expect } from "@playwright/test";
import { registerUser, createLibrary, uniqueName } from "./helpers";

/**
 * Barcode Scanner E2E tests (BEHAVIORS.md §5.3)
 *
 * Camera-based scanning can't be tested in headless Playwright (no camera hardware).
 * These tests verify the scanner UI flow: button presence, scanner activation,
 * error handling (no camera → error state), and cancel/close behavior.
 *
 * Full barcode detection + ISBN lookup logic is covered by unit tests:
 *   - tests/BarcodeScanner.test.tsx (12 tests — Quagga2 mocks)
 *   - tests/barcode.test.ts (17 tests — ISBN detection + Open Library API)
 *   - tests/AddItem.test.tsx (barcode integration tests)
 */

test.describe("Barcode Scanner — Add Item Page", () => {
  let libName: string;

  test.beforeEach(async ({ page }) => {
    await registerUser(page);
    libName = uniqueName("ScanLib");
    await createLibrary(page, libName);

    // Navigate into the library
    await page.getByRole("link", { name: libName }).first().click();
    await expect(page.getByRole("heading", { name: libName })).toBeVisible({ timeout: 10000 });

    // Go to Add Item page
    await page.getByRole("link", { name: "+ Add Item" }).click();
    await expect(page.getByRole("heading", { name: "Add Item" })).toBeVisible({ timeout: 10000 });
  });

  test("5.3a Scan Barcode button is visible on Add Item form", async ({ page }) => {
    const scanButton = page.getByRole("button", { name: /Scan Barcode/i });
    await expect(scanButton).toBeVisible();
    await expect(scanButton).toContainText("Scan Barcode (ISBN / UPC)");
  });

  test("5.3b Clicking Scan Barcode activates scanner UI", async ({ page }) => {
    await page.getByRole("button", { name: /Scan Barcode/i }).click();

    // Scanner component should appear — either the camera viewport or an error
    // In headless mode without a camera, we expect the error state
    // Wait for either the scanner viewport or the error message
    // In headless mode: expect camera error text (permission denied, not found, etc.)
    const cameraError = page.getByText(/Camera permission denied|Camera error|No camera found/);
    await expect(cameraError).toBeVisible({ timeout: 10000 });
  });

  test("5.3c Scanner shows error state without camera, with close button", async ({ page }) => {
    await page.getByRole("button", { name: /Scan Barcode/i }).click();

    // In headless Playwright, camera access fails → error message shown
    // Either "Camera permission denied" or "Camera error" or "No camera found"
    const errorText = page.getByText(/Camera permission denied|Camera error|No camera found/);
    await expect(errorText).toBeVisible({ timeout: 10000 });

    // Close button should be available
    const closeButton = page.getByRole("button", { name: "Close" });
    await expect(closeButton).toBeVisible();

    // Clicking Close returns to normal form
    await closeButton.click();

    // Scan button should be visible again
    await expect(page.getByRole("button", { name: /Scan Barcode/i })).toBeVisible();
  });

  test("5.3d Form fields (name, description) remain functional alongside scanner", async ({ page }) => {
    // Verify form fields are present and editable before and after scanner interaction
    const nameInput = page.getByPlaceholder("What is this item?");
    const descInput = page.getByPlaceholder("Any details about this item");

    await nameInput.fill("Test Item");
    await descInput.fill("Test Description");

    // Open and close scanner
    await page.getByRole("button", { name: /Scan Barcode/i }).click();

    // Wait for scanner error (headless mode)
    const errorText = page.getByText(/Camera permission denied|Camera error|No camera found/);
    await expect(errorText).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Close" }).click();

    // Form fields should retain their values
    await expect(nameInput).toHaveValue("Test Item");
    await expect(descInput).toHaveValue("Test Description");
  });
});
