import { test, expect } from "@playwright/test";
import { registerUser, createLibrary, openLibrary, addItem, uniqueName } from "./helpers";

test.describe("Borrow Flow", () => {
  // These tests set up an owner with a library and item,
  // then exercise the full borrow lifecycle.

  async function setupOwnerWithItem(page: import("@playwright/test").Page) {
    const libName = uniqueName("Lending");
    await registerUser(page);
    await createLibrary(page, libName);
    await openLibrary(page, libName);
    await addItem(page, "Electric Sander", "Great for woodworking");

    // Extract the slug from the share link on the library detail page
    const shareLinkEl = page.locator("a").filter({ hasText: /\/l\// });
    const href = await shareLinkEl.getAttribute("href");
    return href!.replace("/l/", "");
  }

  /** Submit a borrow request from a public page and return to confirmation. */
  async function submitBorrowRequest(
    page: import("@playwright/test").Page,
    slug: string,
    borrowerName: string,
    borrowerPhone: string,
    message?: string,
  ) {
    const publicPage = await page.context().newPage();
    await publicPage.goto(`/l/${slug}`);
    await publicPage.getByText("Electric Sander").click();
    await expect(publicPage.getByRole("button", { name: "Borrow This" })).toBeVisible({ timeout: 5000 });
    await publicPage.getByRole("button", { name: "Borrow This" }).click();
    await publicPage.getByPlaceholder("Your name").fill(borrowerName);
    await publicPage.getByPlaceholder("Phone number").fill(borrowerPhone);
    if (message) {
      await publicPage.getByPlaceholder(/Message to the owner/).fill(message);
    }
    await publicPage.getByRole("button", { name: "Send Request" }).click();
    await expect(publicPage.getByText("Request Sent!")).toBeVisible({ timeout: 10000 });
    await publicPage.close();
  }

  test("public library is accessible without auth", async ({ page }) => {
    const slug = await setupOwnerWithItem(page);

    const publicPage = await page.context().newPage();
    await publicPage.goto(`/l/${slug}`);
    await expect(publicPage.getByText("Electric Sander")).toBeVisible({ timeout: 5000 });
    await publicPage.close();
  });

  test("public library shows items grid", async ({ page }) => {
    const slug = await setupOwnerWithItem(page);

    const publicPage = await page.context().newPage();
    await publicPage.goto(`/l/${slug}`);
    await expect(publicPage.getByText("Electric Sander")).toBeVisible({ timeout: 5000 });
    await expect(publicPage.getByText("available", { exact: true }).first()).toBeVisible();
    await publicPage.close();
  });

  test("can open item detail from public library", async ({ page }) => {
    const slug = await setupOwnerWithItem(page);

    const publicPage = await page.context().newPage();
    await publicPage.goto(`/l/${slug}`);
    await publicPage.getByText("Electric Sander").click();

    await expect(publicPage.getByRole("heading", { name: "Electric Sander" })).toBeVisible({ timeout: 5000 });
    await expect(publicPage.getByText("Great for woodworking")).toBeVisible();
    await expect(publicPage.getByRole("button", { name: "Borrow This" })).toBeVisible();
    await publicPage.close();
  });

  test("can submit a borrow request", async ({ page }) => {
    const slug = await setupOwnerWithItem(page);
    await submitBorrowRequest(page, slug, "Bob Borrower", "555-123-4567", "Would love to use this!");
    // Confirmation page shows "Request Sent!" — verified inside submitBorrowRequest
  });

  test("owner can approve a borrow request", async ({ page }) => {
    const slug = await setupOwnerWithItem(page);
    await submitBorrowRequest(page, slug, "Alice Asker", "555-999-0001");

    // Owner goes to notifications page and approves the specific request
    await page.goto("/dashboard/notifications");
    await expect(page.getByText("Pending Requests")).toBeVisible({ timeout: 5000 });
    const requestCard = page.locator(".card").filter({ hasText: "Alice Asker" });
    await expect(requestCard).toBeVisible();
    await requestCard.getByRole("button", { name: "Approve" }).click();

    // After approval, a loan should appear
    await expect(page.getByText("Currently Borrowed")).toBeVisible({ timeout: 5000 });
  });

  test("owner can decline a borrow request", async ({ page }) => {
    const slug = await setupOwnerWithItem(page);
    await submitBorrowRequest(page, slug, "Charlie Cancel", "555-999-0002");

    // Owner declines the specific request on notifications page
    await page.goto("/dashboard/notifications");
    await expect(page.getByText("Pending Requests")).toBeVisible({ timeout: 5000 });
    const requestCard = page.locator(".card").filter({ hasText: "Charlie Cancel" });
    await requestCard.getByRole("button", { name: "Decline" }).click();

    // Confirm in the ConfirmDialog modal
    await page.getByRole("dialog").getByRole("button", { name: "Decline" }).click();

    // That specific request should disappear
    await expect(requestCard).not.toBeVisible({ timeout: 5000 });
  });

  test("full lifecycle: borrow → approve → return", async ({ page }) => {
    const slug = await setupOwnerWithItem(page);
    await submitBorrowRequest(page, slug, "Dave Doer", "555-999-0003");

    // Owner approves the specific request on notifications page
    await page.goto("/dashboard/notifications");
    await expect(page.getByText("Pending Requests")).toBeVisible({ timeout: 5000 });
    const requestCard = page.locator(".card").filter({ hasText: "Dave Doer" });
    await requestCard.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Currently Borrowed")).toBeVisible({ timeout: 5000 });

    // Owner marks returned
    const loanCard = page.locator(".card").filter({ hasText: "Electric Sander" }).filter({ hasText: "Dave Doer" });
    await loanCard.getByRole("button", { name: "Mark Returned" }).click();

    // Confirm in the ConfirmDialog modal
    await page.getByRole("dialog").getByRole("button", { name: "Mark Returned" }).click();

    // Loan should disappear
    await expect(loanCard).not.toBeVisible({ timeout: 5000 });
  });
});
