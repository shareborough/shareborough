import { test, expect } from "@playwright/test";
import { isConfigured, createTestAddress, waitForTestEmail, extractEmailLinks } from "../tests/helpers/mailpail";
import { TEST_PASSWORD } from "./helpers";

/**
 * Password Reset E2E Test
 * Uses mailpail (AWS SES + S3) to test the complete password reset flow.
 *
 * Prerequisites:
 * - MAILPAIL_DOMAIN and MAILPAIL_BUCKET environment variables must be set
 * - AWS credentials available (IAM role on EC2 or env vars)
 * - Backend password reset functionality must be enabled
 */

test.describe("Password Reset", () => {

  test.beforeEach(() => {
    test.skip(!isConfigured(), "Mailpail not configured (MAILPAIL_DOMAIN / MAILPAIL_BUCKET)");
  });

  test("Complete password reset flow", async ({ page }) => {
    const email = createTestAddress();
    console.log(`Test email: ${email}`);

    // Register account
    await page.goto("/signup");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    // Sign out
    await page.getByRole("button", { name: /avatar/i }).click();
    await page.getByText("Sign out").click();
    await page.reload();
    await expect(page).toHaveURL("/login");

    // Click "Forgot password?" link
    await page.goto("/login");
    const forgotLink = page.getByRole("link", { name: /Forgot.*password/i });
    await expect(forgotLink).toBeVisible({ timeout: 5000 });
    await forgotLink.click();

    // Enter email and submit reset request
    await page.getByPlaceholder(/Email/i).fill(email);
    await page.getByRole("button", { name: /Send.*Reset.*Link|Reset.*Password/i }).click();

    // Should show success message
    await expect(
      page.locator("text=/check your email|sent|instructions/i")
    ).toBeVisible({ timeout: 10000 });

    // Wait for password reset email
    console.log("Waiting for password reset email...");
    const resetEmail = await waitForTestEmail(email, {
      subject: "reset",
      timeout: 60_000,
    });
    console.log(`Received reset email: ${resetEmail.subject}`);

    // Extract reset link
    const links = extractEmailLinks(resetEmail);
    const resetLink = links.find((link) =>
      link.includes("/reset") || link.includes("password")
    );
    expect(resetLink).toBeTruthy();
    console.log(`Reset link: ${resetLink}`);

    // Visit reset link
    await page.goto(resetLink!);

    // Enter new password
    const newPassword = "NewSecurePassword456!";
    await page.getByPlaceholder(/New.*Password|Password/i).first().fill(newPassword);

    const confirmField = page.getByPlaceholder(/Confirm.*Password/i);
    if (await confirmField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmField.fill(newPassword);
    }

    await page.getByRole("button", { name: /Reset.*Password|Change.*Password|Update/i }).click();

    // Should show success message
    await expect(
      page.locator("text=/success|updated|changed/i")
    ).toBeVisible({ timeout: 5000 });

    // Login with new password
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(newPassword);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "My Libraries" })).toBeVisible();

    console.log("Password reset flow completed successfully");
  });

  test("Password reset: old password no longer works", async ({ page }) => {
    const email = createTestAddress();

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
    const resetEmail = await waitForTestEmail(email, {
      subject: "reset",
      timeout: 60_000,
    });

    const links = extractEmailLinks(resetEmail);
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
    await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should show error
    await expect(page.locator(".text-red-500")).toBeVisible({ timeout: 5000 });

    // Now try with NEW password (should succeed)
    await page.getByPlaceholder("Password").fill(newPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    console.log("Old password correctly invalidated after reset");
  });

  test("Password reset: invalid/expired token shows error", async ({ page }) => {
    const email = createTestAddress();

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
    const resetEmail = await waitForTestEmail(email, {
      subject: "reset",
      timeout: 60_000,
    });

    const links = extractEmailLinks(resetEmail);
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

    console.log("Invalid reset token correctly rejected");
  });

  test("Password reset: can request multiple times", async ({ page }) => {
    const email = createTestAddress();

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
    await waitForTestEmail(email, {
      subject: "reset",
      timeout: 60_000,
    });

    // Request reset #2
    await page.goto("/login");
    await page.getByRole("link", { name: /Forgot.*password/i }).click();
    await page.getByPlaceholder(/Email/i).fill(email);
    await page.getByRole("button", { name: /Send.*Reset.*Link|Reset.*Password/i }).click();
    await expect(page.locator("text=/check your email|sent/i")).toBeVisible({ timeout: 10000 });

    // Should receive second email (or rate limit)
    const secondEmailOrRateLimit = await Promise.race([
      waitForTestEmail(email, { subject: "reset", timeout: 30_000 }),
      page.waitForSelector("text=/rate.*limit|too many|wait/i", { timeout: 5000 }).then(() => null),
    ]);

    if (secondEmailOrRateLimit) {
      console.log("Second reset email sent successfully");
    } else {
      console.log("Rate limiting applied correctly");
    }
  });
});
