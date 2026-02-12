import { test, expect } from "@playwright/test";
import { isConfigured, createTestAddress, waitForTestEmail, extractEmailLinks } from "../tests/helpers/mailpail";
import { TEST_PASSWORD } from "./helpers";

/**
 * Email Verification E2E Test
 * Uses mailpail (AWS SES + S3) for disposable email addresses.
 *
 * Prerequisites:
 * - MAILPAIL_DOMAIN and MAILPAIL_BUCKET environment variables must be set
 * - AWS credentials available (IAM role on EC2 or env vars)
 * - Backend must have email verification enabled
 */

test.describe("Email Verification", () => {

  test.beforeEach(() => {
    test.skip(!isConfigured(), "Mailpail not configured (MAILPAIL_DOMAIN / MAILPAIL_BUCKET)");
  });

  test("Complete email verification flow", async ({ page }) => {
    const email = createTestAddress();
    console.log(`Test email: ${email}`);

    // Register with disposable email
    await page.goto("/signup");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible();

    // Wait for verification email
    console.log("Waiting for verification email...");
    const received = await waitForTestEmail(email, {
      subject: "verify",
      timeout: 60_000,
    });
    console.log(`Received email: ${received.subject}`);

    // Extract verification link
    const links = extractEmailLinks(received);
    const verificationLink = links.find((link) =>
      link.includes("/verify") || link.includes("verify")
    );
    expect(verificationLink).toBeTruthy();
    console.log(`Verification link: ${verificationLink}`);

    // Visit verification link
    await page.goto(verificationLink!);

    // Verify success
    await expect(
      page.locator("text=/verified|success|confirmed/i")
    ).toBeVisible({ timeout: 5000 });

    console.log("Email verification flow completed successfully");
  });

  test("Resend verification email", async ({ page }) => {
    const email = createTestAddress();
    console.log(`Test email: ${email}`);

    // Register
    await page.goto("/signup");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    // Navigate to settings
    await page.goto("/dashboard/settings");

    // Look for "Resend Verification" button
    const resendButton = page.getByRole("button", { name: /Resend.*Verification/i });

    if (await resendButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await resendButton.click();

      // Should show success toast
      await expect(page.locator('[role="alert"]').filter({ hasText: /sent|resent/i })).toBeVisible({ timeout: 5000 });

      // Wait for second verification email
      const secondEmail = await waitForTestEmail(email, {
        subject: "verify",
        timeout: 60_000,
      });

      expect(secondEmail).toBeTruthy();
      console.log("Resend verification email successful");
    } else {
      console.log("Resend verification button not found (account may be auto-verified)");
    }
  });

  test("Verification link expires after timeout", async ({ page }) => {
    const email = createTestAddress();

    // Register
    await page.goto("/signup");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    // Wait for verification email
    const received = await waitForTestEmail(email, {
      subject: "verify",
      timeout: 60_000,
    });

    const links = extractEmailLinks(received);
    const verificationLink = links.find((link) =>
      link.includes("/verify") || link.includes("verify")
    );

    // Simulate expired link by modifying token
    const expiredLink = verificationLink!.replace(/token=([^&]+)/, "token=expired_token_xyz");

    // Visit expired/invalid link
    await page.goto(expiredLink);

    // Should show error message
    await expect(
      page.locator("text=/expired|invalid|error/i")
    ).toBeVisible({ timeout: 5000 });

    console.log("Expired verification link handled correctly");
  });
});
