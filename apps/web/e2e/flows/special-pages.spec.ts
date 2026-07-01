import { test, expect } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";

const ANALYTICS_ROUTES = [
  "/reports",
  "/scorecards",
  "/revenue-forecast",
  "/call-centre",
  "/patient-intake",
  "/aftercare",
  "/session-notes",
  "/progress-tracking",
  "/coverage-zones",
  "/field-operations",
] as const;

test.beforeEach(async ({ context }) => {
  await ensureAuthenticated(context);
});

for (const route of ANALYTICS_ROUTES) {
  test(`read-model page loads: ${route}`, async ({ page }) => {
    await page.goto(route);
    await waitForWorkspace(page);
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(
      page
        .locator("pre, table, .text-destructive")
        .or(page.getByRole("heading", { name: /feature locked/i })),
    ).toBeVisible({ timeout: 30_000 });
  });
}

test("client-ownership page loads data or empty state", async ({ page }) => {
  await page.goto("/client-ownership");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("schedule page loads without API error", async ({ page }) => {
  await page.goto("/schedule");
  await waitForWorkspace(page);
  await expect(page.getByText(/failed to load schedules/i)).toHaveCount(0);
});

test("branding page shows form", async ({ page }) => {
  await page.goto("/branding");
  await waitForWorkspace(page);
  await expect(page.getByLabel(/tagline/i)).toBeVisible({ timeout: 15_000 });
});

test("settings tabs render", async ({ page }) => {
  await page.goto("/settings");
  await waitForWorkspace(page);
  for (const tab of ["Profile", "Security", "Theme", "Notifications"]) {
    await page.getByRole("button", { name: tab }).click();
    await expect(page.locator("body")).not.toContainText("Application error");
  }
});

test("staff-chat page loads", async ({ page }) => {
  await page.goto("/staff-chat");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("whatsapp page loads", async ({ page }) => {
  await page.goto("/whatsapp");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("payments-demo UI renders", async ({ page }) => {
  await page.goto("/payments-demo");
  await waitForWorkspace(page);
  await expect(page.getByText(/pesapal/i).first()).toBeVisible({ timeout: 15_000 });
});

test("my-earnings page loads", async ({ page }) => {
  await page.goto("/my-earnings");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});
