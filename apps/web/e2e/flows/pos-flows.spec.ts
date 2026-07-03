import { test, expect } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";
import { ensureShiftOpen } from "../helpers/pos";

test.beforeEach(async ({ context }) => {
  await ensureAuthenticated(context);
});

test("POS page shows catalog, cart, and recent sales", async ({ page }) => {
  await page.goto("/pos");
  await waitForWorkspace(page);
  await ensureShiftOpen(page);
  await expect(page.getByRole("button", { name: /^services$/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /^products$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^packages$/i })).toBeVisible();
  await expect(page.getByText(/cart/i).first()).toBeVisible();
  await expect(page.getByText(/recent sales/i)).toBeVisible();
});

test("POS shift can be opened from the shift bar", async ({ page }) => {
  await page.goto("/pos");
  await waitForWorkspace(page);

  const closeShift = page.getByTestId("pos-close-shift");
  if (await closeShift.isVisible().catch(() => false)) {
    await closeShift.click();
    await expect(page.getByTestId("pos-shift-dialog")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(/counted cash/i).fill("2000");
    await page.getByRole("button", { name: /^close shift$/i }).click();
    await expect(page.getByTestId("pos-open-shift")).toBeVisible({ timeout: 30_000 });
  }

  await page.getByTestId("pos-open-shift").click();
  await expect(page.getByTestId("pos-shift-dialog")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /^open shift$/i }).click();
  await expect(page.getByText(/shift open since/i)).toBeVisible({ timeout: 30_000 });
});

test("POS checkout bills a service with cash and shows receipt", async ({ page }) => {
  await page.goto("/pos");
  await waitForWorkspace(page);
  await ensureShiftOpen(page);

  const serviceTile = page.getByRole("button").filter({ hasText: /classic haircut|beard trim/i }).first();
  await expect(serviceTile).toBeVisible({ timeout: 30_000 });
  await serviceTile.click();

  await expect(page.getByText(/classic haircut/i).first()).toBeVisible();
  await page.getByRole("button", { name: /^checkout$/i }).click();

  await expect(page.getByRole("heading", { name: /take payment/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /take payment/i })).toContainText(/KES [1-9]/);
  await page.getByRole("button", { name: /complete sale/i }).click();

  await expect(page.getByTestId("pos-receipt-dialog")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/recent sales/i)).toBeVisible();
});

test("POS can add a customer from the cart panel", async ({ page }) => {
  await page.goto("/pos");
  await waitForWorkspace(page);
  await ensureShiftOpen(page);

  await page.getByTitle(/add customer/i).click();
  await expect(page.getByRole("heading", { name: /add customer/i })).toBeVisible();

  const unique = Date.now().toString().slice(-6);
  await page.getByLabel(/full name/i).fill(`POS Walk-in ${unique}`);
  await page.getByLabel(/phone/i).fill(`+2547${unique}`);
  await page.getByRole("button", { name: /^add customer$/i }).click();

  await expect(page.getByRole("heading", { name: /add customer/i })).toHaveCount(0, { timeout: 15_000 });
  await page.getByRole("combobox", { name: /pos customer/i }).click();
  await expect(page.getByRole("option", { name: new RegExp(`POS Walk-in ${unique}`, "i") })).toBeVisible();
});
