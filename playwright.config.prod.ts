import { defineConfig } from "@playwright/test";

/**
 * Playwright config for PRODUCTION testing against https://shareborough.com
 * Run with: npx playwright test --config=playwright.config.prod.ts
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  retries: 2, // Production flakiness tolerance
  use: {
    baseURL: "https://shareborough.com",
    headless: true,
    locale: "en-US",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  // No webServer — testing against live production
});
