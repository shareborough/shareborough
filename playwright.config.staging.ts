import { defineConfig } from "@playwright/test";

/**
 * Playwright config for STAGING testing against staging.shareborough.pages.dev
 * Run with: npx playwright test --config=playwright.config.staging.ts
 * Override URL: STAGING_URL=https://custom-url.com npx playwright test --config=playwright.config.staging.ts
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  retries: 2, // Staging flakiness tolerance
  use: {
    baseURL: process.env.STAGING_URL || "https://staging.shareborough.pages.dev",
    headless: true,
    locale: "en-US",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  // No webServer — testing against live staging
});
