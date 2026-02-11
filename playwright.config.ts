import { defineConfig } from "@playwright/test";

const E2E_PORT = 5199;

export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  testDir: "./e2e",
  timeout: 90000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    headless: true,
    locale: "en-US",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${E2E_PORT}`,
    port: E2E_PORT,
    reuseExistingServer: true,
    timeout: 15000,
  },
});
