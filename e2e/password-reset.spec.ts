import { test, expect } from "@playwright/test";
import { createTestInbox, waitForEmail, extractLinks, extractToken, deleteInbox } from "../tests/helpers/mailslurp";
import { TEST_PASSWORD, registerUser } from "./helpers";

/**
 * Password Reset E2E Test
 * Uses MailSlurp to test the complete password reset flow
 *
 * Prerequisites:
 * - MAILSLURP_API_KEY environment variable must be set
 * - Backend password reset functionality must be enabled
 * - Email sending must be configured (SMTP or webhook)
 */

test.describe("Password Reset", () => {

  test("Complete password reset flow", async ({ page }) => {
    // Skip if MailSlurp not configured
    if (!process.env.MAILSLURP_API_KEY && !process.env.VITE_MAILSLURP_API_KEY) {
      test.skip();
    }

    // Step 1: Create test account with disposable email
    const { email, id: inboxId } = await createTestInbox();
    console.log(`Created test inbox: ${email}`);

    try {
      // Step 2: Register account
      await page.goto("/signup");
      await page.getByPlaceholder("Email").fill(email);
      await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Create Account" }).click();
      await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

      // Step 3: Sign out
      await page.getByRole("button", { name: /avatar/i }).click();
      await page.getByText("Sign out").click();
      await page.reload();
      await expect(page).toHaveURL("/login");

      // Step 4: Click "Forgot password?" link
      await page.goto("/login");
      const forgotLink = page.getByRole("link", { name: /Forgot.*password/i });
      await expect(forgotLink).toBeVisible({ timeout: 5000 });
      await forgotLink.click();

      // Step 5: Enter email and submit reset request
      await page.getByPlaceholder(/Email/i).fill(email);
      await page.getByRole("button", { name: /Send.*Reset.*Link|Reset.*Password/i }).click();

      // Step 6: Should show success message
      await expect(
        page.locator("text=/check your email|sent|instructions/i")
      ).toBeVisible({ timeout: 10000 });

      // Step 7: Wait for password reset email
      console.log("Waiting for password reset email...");
      const resetEmail = await waitForEmail(inboxId, {
        matches: "reset",
        timeout: 60000,
      });

      console.log(`Received reset email: ${resetEmail.subject}`);

      // Step 8: Extract reset link from email
      const emailBody = resetEmail.body || "";
      const links = extractLinks(emailBody);
      const resetLink = links.find((link) =>
        link.includes("/reset") || link.includes("password")
      );

      expect(resetLink).toBeTruthy();
      console.log(`Reset link: ${resetLink}`);

      // Step 9: Visit reset link
      await page.goto(resetLink!);

      // Step 10: Enter new password
      const newPassword = "NewSecurePassword456!";
      await page.getByPlaceholder(/New.*Password|Password/i).first().fill(newPassword);

      // Some forms have confirmation field
      const confirmField = page.getByPlaceholder(/Confirm.*Password/i);
      if (await confirmField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmField.fill(newPassword);
      }

      await page.getByRole("button", { name: /Reset.*Password|Change.*Password|Update/i }).click();

      // Step 11: Should show success message and redirect to login
      await expect(
        page.locator("text=/success|updated|changed/i")
      ).toBeVisible({ timeout: 5000 });

      // Step 12: Try logging in with new password
      await page.goto("/login");
      await page.getByPlaceholder("Email").fill(email);
      await page.getByPlaceholder("Password").fill(newPassword);
      await page.getByRole("button", { name: "Sign In" }).click();

      // Step 13: Should successfully log in
      await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
      await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible();

      console.log("✅ Password reset flow completed successfully");
    } finally {
      await deleteInbox(inboxId);
      console.log(`Deleted test inbox: ${email}`);
    }
  });

  test("Password reset: old password no longer works", async ({ page }) => {
    // Skip if MailSlurp not configured
    if (!process.env.MAILSLURP_API_KEY && !process.env.VITE_MAILSLURP_API_KEY) {
      test.skip();
    }

    const { email, id: inboxId } = await createTestInbox();

    try {
      // Register
      await page.goto("/signup");
      await page.getByPlaceholder("Email").fill(email);
      await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Create Account" }).click();
      await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

      // Sign out
      await page.getByRole("button", { name: /avatar/i }).click();
      await page.getByText("Sign out").click();
      await page.reload();

      // Request password reset
      await page.goto("/login");
      await page.getByRole("link", { name: /Forgot.*password/i }).click();
      await page.getByPlaceholder(/Email/i).fill(email);
      await page.getByRole("button", { name: /Send.*Reset.*Link|Reset.*Password/i }).click();

      // Wait for email and get reset link
      const resetEmail = await waitForEmail(inboxId, {
        matches: "reset",
        timeout: 60000,
      });

      const emailBody = resetEmail.body || "";
      const links = extractLinks(emailBody);
      const resetLink = links.find((link) =>
        link.includes("/reset") || link.includes("password")
      );

      // Complete reset with new password
      await page.goto(resetLink!);
      const newPassword = "NewSecurePassword789!";
      await page.getByPlaceholder(/New.*Password|Password/i).first().fill(newPassword);
      const confirmField = page.getByPlaceholder(/Confirm.*Password/i);
      if (await confirmField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmField.fill(newPassword);
      }
      await page.getByRole("button", { name: /Reset.*Password|Change.*Password|Update/i }).click();

      // Try logging in with OLD password (should fail)
      await page.goto("/login");
      await page.getByPlaceholder("Email").fill(email);
      await page.getByPlaceholder("Password").fill(TEST_PASSWORD); // Old password
      await page.getByRole("button", { name: "Sign In" }).click();

      // Should show error
      await expect(page.locator(".text-red-500")).toBeVisible({ timeout: 5000 });

      // Now try with NEW password (should succeed)
      await page.getByPlaceholder("Password").fill(newPassword);
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

      console.log("✅ Old password correctly invalidated after reset");
    } finally {
      await deleteInbox(inboxId);
    }
  });

  test("Password reset: invalid/expired token shows error", async ({ page }) => {
    // Skip if MailSlurp not configured
    if (!process.env.MAILSLURP_API_KEY && !process.env.VITE_MAILSLURP_API_KEY) {
      test.skip();
    }

    const { email, id: inboxId } = await createTestInbox();

    try {
      // Register
      await page.goto("/signup");
      await page.getByPlaceholder("Email").fill(email);
      await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Create Account" }).click();
      await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

      // Sign out and request reset
      await page.getByRole("button", { name: /avatar/i }).click();
      await page.getByText("Sign out").click();
      await page.reload();

      await page.goto("/login");
      await page.getByRole("link", { name: /Forgot.*password/i }).click();
      await page.getByPlaceholder(/Email/i).fill(email);
      await page.getByRole("button", { name: /Send.*Reset.*Link|Reset.*Password/i }).click();

      // Wait for email
      const resetEmail = await waitForEmail(inboxId, {
        matches: "reset",
        timeout: 60000,
      });

      const emailBody = resetEmail.body || "";
      const links = extractLinks(emailBody);
      const resetLink = links.find((link) =>
        link.includes("/reset") || link.includes("password")
      );

      // Create invalid link by modifying token
      const invalidLink = resetLink!.replace(/token=([^&]+)/, "token=invalid_token_xyz_123");

      // Visit invalid link
      await page.goto(invalidLink);

      // Enter new password
      const newPassword = "ShouldNotWork123!";
      await page.getByPlaceholder(/New.*Password|Password/i).first().fill(newPassword);
      const confirmField = page.getByPlaceholder(/Confirm.*Password/i);
      if (await confirmField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmField.fill(newPassword);
      }
      await page.getByRole("button", { name: /Reset.*Password|Change.*Password|Update/i }).click();

      // Should show error
      await expect(
        page.locator("text=/invalid|expired|error/i")
      ).toBeVisible({ timeout: 5000 });

      console.log("✅ Invalid reset token correctly rejected");
    } finally {
      await deleteInbox(inboxId);
    }
  });

  test("Password reset: can request multiple times", async ({ page }) => {
    // Skip if MailSlurp not configured
    if (!process.env.MAILSLURP_API_KEY && !process.env.VITE_MAILSLURP_API_KEY) {
      test.skip();
    }

    const { email, id: inboxId } = await createTestInbox();

    try {
      // Register
      await page.goto("/signup");
      await page.getByPlaceholder("Email").fill(email);
      await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Create Account" }).click();
      await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

      // Sign out
      await page.getByRole("button", { name: /avatar/i }).click();
      await page.getByText("Sign out").click();
      await page.reload();

      // Request reset #1
      await page.goto("/login");
      await page.getByRole("link", { name: /Forgot.*password/i }).click();
      await page.getByPlaceholder(/Email/i).fill(email);
      await page.getByRole("button", { name: /Send.*Reset.*Link|Reset.*Password/i }).click();
      await expect(page.locator("text=/check your email|sent/i")).toBeVisible({ timeout: 10000 });

      // Wait for first email
      await waitForEmail(inboxId, {
        matches: "reset",
        timeout: 60000,
      });

      // Request reset #2 (immediately after)
      await page.goto("/login");
      await page.getByRole("link", { name: /Forgot.*password/i }).click();
      await page.getByPlaceholder(/Email/i).fill(email);
      await page.getByRole("button", { name: /Send.*Reset.*Link|Reset.*Password/i }).click();
      await expect(page.locator("text=/check your email|sent/i")).toBeVisible({ timeout: 10000 });

      // Should receive second email
      // Note: This might be rate-limited, so we check for either success or rate-limit message
      const secondEmailOrRateLimit = await Promise.race([
        waitForEmail(inboxId, { matches: "reset", timeout: 30000 }),
        page.waitForSelector("text=/rate.*limit|too many|wait/i", { timeout: 5000 }).then(() => null),
      ]);

      if (secondEmailOrRateLimit) {
        console.log("✅ Second reset email sent successfully");
      } else {
        console.log("✅ Rate limiting applied correctly");
      }
    } finally {
      await deleteInbox(inboxId);
    }
  });
});
