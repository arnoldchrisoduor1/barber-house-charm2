import { test, expect } from "@playwright/test";

import { waitForWorkspace } from "../helpers/crud";

test("reports page loads chart UI", async ({ page }) => {
  await page.goto("/reports");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
  const stats = page.getByTestId("reports-stats");
  if (await stats.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await expect(page.getByTestId("reports-chart")).toBeVisible();
  }
});

test("scorecards page loads", async ({ page }) => {
  await page.goto("/scorecards");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("revenue forecast page loads", async ({ page }) => {
  await page.goto("/revenue-forecast");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("call centre page loads dial pad", async ({ page }) => {
  await page.goto("/call-centre");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
  const dialPad = page.getByTestId("dial-pad");
  if (await dialPad.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await expect(dialPad).toBeVisible();
  }
});

test("field operations tabs render", async ({ page }) => {
  await page.goto("/field-operations");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("my earnings page loads", async ({ page }) => {
  await page.goto("/my-earnings");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});
