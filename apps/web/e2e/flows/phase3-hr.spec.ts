import { test, expect } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";

test.beforeEach(async ({ context }) => {
  await ensureAuthenticated(context);
});

test("time-off page loads request form", async ({ page }) => {
  await page.goto("/time-off");
  await waitForWorkspace(page);
  await expect(page.getByTestId("time-off-request-btn")).toBeVisible({ timeout: 15_000 });
});

test("payroll page has export CSV link", async ({ page }) => {
  await page.goto("/payroll");
  await waitForWorkspace(page);
  await expect(page.getByRole("link", { name: /export csv/i })).toBeVisible({ timeout: 15_000 });
});

test("onboarding checklist enroll UI loads", async ({ page }) => {
  await page.goto("/onboarding-checklist");
  await waitForWorkspace(page);
  await expect(page.getByTestId("onboarding-enroll-btn")).toBeVisible({ timeout: 15_000 });
});

test("shift swap request form loads", async ({ page }) => {
  await page.goto("/shift-swap");
  await waitForWorkspace(page);
  await expect(page.getByTestId("shift-swap-submit-btn")).toBeVisible({ timeout: 15_000 });
});
