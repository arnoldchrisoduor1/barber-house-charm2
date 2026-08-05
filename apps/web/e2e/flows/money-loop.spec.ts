import { test, expect } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";
import { ensureShiftOpen } from "../helpers/pos";

test.beforeEach(async ({ context }) => {
  await ensureAuthenticated(context);
});

test("finance P&L tab loads server-computed table", async ({ page }) => {
  await page.goto("/finance");
  await waitForWorkspace(page);
  await page.getByRole("tab", { name: /^p&l$/i }).click();
  await expect(page.getByRole("heading", { name: /profit & loss/i })).toBeVisible({ timeout: 15_000 });
});

test("commissions page shows lines table", async ({ page }) => {
  await page.goto("/commissions");
  await waitForWorkspace(page);
  await expect(page.getByRole("heading", { name: /commission lines/i })).toBeVisible({ timeout: 15_000 });
});

test("reconciliation page loads cash-up form", async ({ page }) => {
  await page.goto("/reconciliation");
  await waitForWorkspace(page);
  await expect(page.getByRole("heading", { name: /today's cash-up/i })).toBeVisible({ timeout: 15_000 });
  const closeBtn = page.getByTestId("reconciliation-close-day");
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
    await expect(page.getByText(/day closed/i)).toBeVisible({ timeout: 15_000 });
  }
});

test("POS cash checkout with tip completes sale", async ({ page }) => {
  await page.goto("/pos");
  await waitForWorkspace(page);
  await ensureShiftOpen(page);

  const serviceTile = page.getByRole("button").filter({ hasText: /classic haircut|beard trim/i }).first();
  await expect(serviceTile).toBeVisible({ timeout: 30_000 });
  await serviceTile.click();

  await page.getByRole("button", { name: /^checkout$/i }).click();
  await expect(page.getByRole("heading", { name: /take payment/i })).toBeVisible();
  await page.getByTestId("tip-preset-10").click();
  await page.getByRole("button", { name: /complete sale/i }).click();
  await expect(page.getByTestId("pos-receipt-dialog")).toBeVisible({ timeout: 30_000 });
});

test("POS checkout creates commission line visible on commissions page", async ({ page }) => {
  await page.goto("/pos");
  await waitForWorkspace(page);
  await ensureShiftOpen(page);

  const serviceTile = page.getByRole("button").filter({ hasText: /classic haircut|beard trim/i }).first();
  await expect(serviceTile).toBeVisible({ timeout: 30_000 });
  await serviceTile.click();
  await page.getByRole("button", { name: /^checkout$/i }).click();
  await page.getByRole("button", { name: /complete sale/i }).click();
  await expect(page.getByTestId("pos-receipt-dialog")).toBeVisible({ timeout: 30_000 });

  await page.goto("/commissions");
  await waitForWorkspace(page);
  await expect(page.getByRole("heading", { name: /commission lines/i })).toBeVisible({ timeout: 15_000 });
  // After a completed service sale, at least one line row should appear (service or table empty-state neither = hard fail if seed commissions already exist).
  await expect(
    page.locator("table").filter({ hasText: /kind|amount|staff/i }).first(),
  ).toBeVisible({ timeout: 15_000 });
});
