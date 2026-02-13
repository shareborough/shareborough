import { test, expect } from "@playwright/test";
import { registerUser, createLibrary, openLibrary, uniqueName } from "./helpers";

/**
 * Quick CRUD smoke test — the essential happy path.
 * Register -> Create Library -> Add Item -> Edit Item -> Delete Item -> Delete Library.
 * No seed data dependencies. Fast and self-contained.
 */
test.describe("CRUD Smoke Test", () => {

  test("full lifecycle: register, create library, add/edit/delete item", async ({ page }) => {
    // 1. Register
    await registerUser(page);
    await expect(page).toHaveURL(/dashboard/);

    // 2. Create library
    const libName = uniqueName("CRUD Smoke");
    await createLibrary(page, libName);
    await expect(page.getByText(libName)).toBeVisible();

    // 3. Open library
    await openLibrary(page, libName);

    // 4. Add item
    await page.getByRole("link", { name: "+ Add Item" }).click();
    await page.getByPlaceholder("What is this item?").fill("Test Widget");
    await page.getByPlaceholder("Any details about this item").fill("A test item for smoke testing");
    await page.getByRole("button", { name: "Add Item" }).click();
    await expect(page.getByText("Test Widget")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("A test item for smoke testing")).toBeVisible();

    // 5. Edit item
    await page.getByText("Edit").first().click();
    await expect(page.getByRole("heading", { name: "Edit Item" })).toBeVisible({ timeout: 10000 });
    const nameInput = page.getByPlaceholder("What is this item?");
    await nameInput.clear();
    await nameInput.fill("Updated Widget");
    const descInput = page.getByPlaceholder("Any details about this item");
    await descInput.clear();
    await descInput.fill("Updated description");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Updated Widget")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Updated description")).toBeVisible();

    // 6. Delete item — scope to item card to avoid matching "Delete Library"
    const itemCard = page.locator(".card", { hasText: "Updated Widget" });
    await itemCard.getByRole("button", { name: "Delete" }).click();
    // Confirm in dialog
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Updated Widget")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("No items yet")).toBeVisible();

    // 7. Delete library
    await page.getByText("Delete Library").click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    await expect(page.getByText(libName)).not.toBeVisible({ timeout: 5000 });
  });

  test("notification bell is visible on dashboard", async ({ page }) => {
    await registerUser(page);
    const bellButton = page.getByLabel(/Notifications/);
    await expect(bellButton).toBeVisible();

    // Click opens dropdown — verify it shows either empty state or notifications
    await bellButton.click();
    await expect(
      page.getByText("All caught up!").or(page.getByText("View all notifications"))
    ).toBeVisible({ timeout: 5000 });
  });
});
