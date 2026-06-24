import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
      },
    },
    {
      name: "public",
      testMatch: /public-routes\.spec\.ts/,
    },
    {
      name: "authenticated",
      dependencies: ["setup"],
      testMatch: /(authenticated-routes|core-flows)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
        storageState: "e2e/.auth/user.json",
      },
    },
    {
      name: "api",
      dependencies: ["setup"],
      testMatch: /api\.spec\.ts/,
      use: {
        storageState: "e2e/.auth/user.json",
      },
    },
  ],
});
