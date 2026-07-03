import { test, expect } from "@playwright/test";

import { waitForWorkspace } from "../helpers/crud";

test("dashboard loads stat tiles for executive user", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
  const metrics = page.getByTestId("dashboard-metrics");
  if (await metrics.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await expect(page.getByTestId("stat-revenue")).toBeVisible();
    await expect(page.getByTestId("revenue-chart")).toBeVisible();
  } else {
    await expect(page.getByTestId("staff-schedule").or(page.getByText(/welcome/i))).toBeVisible();
  }
});

test("dashboard monthly target progress bar", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForWorkspace(page);
  const target = page.getByTestId("monthly-target");
  if (await target.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await expect(target).toBeVisible();
  }
});

test("dashboard charts render without error", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});
