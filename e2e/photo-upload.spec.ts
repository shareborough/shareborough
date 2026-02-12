import { test, expect } from "@playwright/test";
import { registerUser, createLibrary, openLibrary, uniqueName } from "./helpers";

/**
 * Photo upload tests
 * Verifies camera + gallery options on the Add Item page
 */
test.describe("Photo Upload", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
    const libName = uniqueName("Photo");
    await createLibrary(page, libName);
    await openLibrary(page, libName);
    await page.getByRole("link", { name: /Add Item/i }).click();
  });

  test("Gallery and Camera buttons are visible", async ({ page }) => {
    await expect(page.locator('label:has-text("Gallery")')).toBeVisible();
    await expect(page.locator('label:has-text("Camera")')).toBeVisible();
  });

  test("Camera input has capture attribute for mobile", async ({ page }) => {
    const cameraInput = page.locator('label:has-text("Camera") input[type="file"]');
    const captureAttr = await cameraInput.getAttribute("capture");
    expect(captureAttr).toBe("");
  });

  test("Gallery input does NOT have capture attribute", async ({ page }) => {
    const galleryInput = page.locator('label:has-text("Gallery") input[type="file"]');
    const captureAttr = await galleryInput.getAttribute("capture");
    expect(captureAttr).toBeNull();
  });

  test("Cropper is not visible until photo is uploaded", async ({ page }) => {
    const cropperInstructions = page.locator('text="Drag to pan, pinch or scroll to zoom"');
    await expect(cropperInstructions).not.toBeVisible();
  });

  test("Item created without photo shows placeholder", async ({ page }) => {
    await page.getByPlaceholder("What is this item?").fill("No Photo Item");
    await page.getByRole("button", { name: "Add Item" }).click();

    // Should redirect back to library detail
    await expect(page.getByText("No Photo Item")).toBeVisible({ timeout: 5000 });
  });
});
