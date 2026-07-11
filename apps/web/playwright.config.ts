import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const storageState = "e2e/.auth/user.json";
/** Use more workers against production `web` container (set E2E_PROD=1 or PLAYWRIGHT_WORKERS). */
const workers = process.env.PLAYWRIGHT_WORKERS
  ? Number(process.env.PLAYWRIGHT_WORKERS)
  : process.env.E2E_PROD === "1"
    ? 2
    : 1;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers,
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
    },
    {
      name: "public",
      testMatch: /smoke\/public-routes\.spec\.ts/,
    },
    {
      name: "landing",
      testMatch: /flows\/landing-register\.spec\.ts/,
    },
    {
      name: "smoke",
      dependencies: ["setup"],
      testMatch: /smoke\/(authenticated-routes|admin-routes)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
        storageState,
      },
    },
    {
      name: "flows",
      dependencies: ["setup"],
      testMatch: /flows\/(auth-flows|register-flows|theme-flows|core-flows|settings-flows|special-pages|pos-flows|booking-flows|cross-portal-flow|dashboard-flows|analytics-flows|operations-flows|finance-flows|staff-portal-flows|client-portal-flows|major-updates-flows|email-verification|staff-invite|client-home|attendance-flows)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
        storageState,
      },
    },
    {
      name: "crud",
      dependencies: ["setup"],
      testMatch: /crud-flows\.spec\.ts/,
      timeout: 120_000,
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
        storageState,
      },
    },
    {
      name: "api",
      dependencies: ["setup"],
      testMatch: /api\.spec\.ts/,
      use: { storageState },
    },
    {
      name: "gating",
      dependencies: ["setup"],
      testMatch: /gating\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
        storageState,
      },
    },
    {
      name: "twofa",
      dependencies: ["setup"],
      testMatch: /flows\/twofa-flows\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
        storageState,
      },
    },
  ],
});
