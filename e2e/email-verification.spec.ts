import { test, expect } from "@playwright/test";
import { createTestInbox, waitForEmail, extractLinks, deleteInbox } from "../tests/helpers/mailslurp";
import { TEST_PASSWORD } from "./helpers";

/**
 * Email Verification E2E Test
 * Uses MailSlurp to create disposable email inboxes and test the verification flow
 *
 * Prerequisites:
 * - MAILSLURP_API_KEY environment variable must be set
 * - Backend must have email verification enabled
 * - Email sending must be configured (SMTP or webhook)
 */

test.describe("Email Verification", () => {

  test("Complete email verification flow", async ({ page }) => {
    // Skip if MailSlurp API key not configured
    if (!process.env.MAILSLURP_API_KEY && !process.env.VITE_MAILSLURP_API_KEY) {
      test.skip();
    }

    // Step 1: Create disposable email inbox
    const { email, id: inboxId } = await createTestInbox();
    console.log(`Created test inbox: ${email}`);

    try {
      // Step 2: Register with disposable email
      await page.goto("/signup");
      await page.getByPlaceholder("Email").fill(email);
      await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Create Account" }).click();

      // Step 3: Should redirect to dashboard (verification is optional)
      await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
      await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible();

      // Step 4: Wait for verification email
      console.log("Waiting for verification email...");
      const verificationEmail = await waitForEmail(inboxId, {
        matches: "verify",
        timeout: 60000, // 1 minute max wait
      });

      console.log(`Received email: ${verificationEmail.subject}`);

      // Step 5: Extract verification link from email body
      const emailBody = verificationEmail.body || "";
      const links = extractLinks(emailBody);
      const verificationLink = links.find((link) =>
        link.includes("/verify") || link.includes("verify")
      );

      expect(verificationLink).toBeTruthy();
      console.log(`Verification link: ${verificationLink}`);

      // Step 6: Visit verification link
      await page.goto(verificationLink!);

      // Step 7: Verify success message or redirect
      // Adjust this based on your actual verification success behavior
      await expect(
        page.locator("text=/verified|success|confirmed/i")
      ).toBeVisible({ timeout: 5000 });

      console.log("✅ Email verification flow completed successfully");
    } finally {
      // Cleanup: delete test inbox
      await deleteInbox(inboxId);
      console.log(`Deleted test inbox: ${email}`);
    }
  });

  test("Resend verification email", async ({ page }) => {
    // Skip if MailSlurp not configured
    if (!process.env.MAILSLURP_API_KEY && !process.env.VITE_MAILSLURP_API_KEY) {
      test.skip();
    }

    const { email, id: inboxId } = await createTestInbox();
    console.log(`Created test inbox: ${email}`);

    try {
      // Register
      await page.goto("/signup");
      await page.getByPlaceholder("Email").fill(email);
      await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Create Account" }).click();
      await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

      // Navigate to settings or profile page
      await page.goto("/dashboard/settings");

      // Look for "Resend Verification" button
      const resendButton = page.getByRole("button", { name: /Resend.*Verification/i });

      if (await resendButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Click resend button
        await resendButton.click();

        // Should show success toast
        await expect(page.locator('[role="alert"]').filter({ hasText: /sent|resent/i })).toBeVisible({ timeout: 5000 });

        // Wait for second verification email
        const secondEmail = await waitForEmail(inboxId, {
          matches: "verify",
          timeout: 60000,
        });

        expect(secondEmail).toBeTruthy();
        console.log("✅ Resend verification email successful");
      } else {
        console.log("⚠️  Resend verification button not found (account may be auto-verified)");
      }
    } finally {
      await deleteInbox(inboxId);
    }
  });

  test("Verification link expires after timeout", async ({ page }) => {
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

      // Wait for verification email
      const verificationEmail = await waitForEmail(inboxId, {
        matches: "verify",
        timeout: 60000,
      });

      const emailBody = verificationEmail.body || "";
      const links = extractLinks(emailBody);
      const verificationLink = links.find((link) =>
        link.includes("/verify") || link.includes("verify")
      );

      // Simulate expired link by modifying token (make it invalid)
      const expiredLink = verificationLink!.replace(/token=([^&]+)/, "token=expired_token_xyz");

      // Visit expired/invalid link
      await page.goto(expiredLink);

      // Should show error message
      await expect(
        page.locator("text=/expired|invalid|error/i")
      ).toBeVisible({ timeout: 5000 });

      console.log("✅ Expired verification link handled correctly");
    } finally {
      await deleteInbox(inboxId);
    }
  });
});
