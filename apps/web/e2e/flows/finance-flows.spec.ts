import { test, expect } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";

test.beforeEach(async ({ context }) => {
  await ensureAuthenticated(context);
});

test("finance page shows tabs and overview metrics", async ({ page }) => {
  await page.goto("/finance");
  await waitForWorkspace(page);

  await expect(page.getByTestId("finance-tabs")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("tab", { name: /^overview$/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^expenses$/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^transactions$/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^payouts$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /wallet balance/i })).toBeVisible();
});

test("finance expenses tab supports recording an expense", async ({ page }) => {
  await page.goto("/finance");
  await waitForWorkspace(page);

  await page.getByRole("tab", { name: /^expenses$/i }).click();
  await page.getByRole("button", { name: /record expense/i }).click();
  await expect(page.getByRole("heading", { name: /record expense/i })).toBeVisible();

  const unique = Date.now().toString().slice(-5);
  await page.getByLabel(/description/i).fill(`E2E expense ${unique}`);
  await page.getByLabel(/amount \(kes\)/i).fill("1500");
  await page.getByRole("button", { name: /^save$/i }).click();

  await expect(page.getByText(/expense recorded/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(new RegExp(`E2E expense ${unique}`, "i"))).toBeVisible({ timeout: 15_000 });
});

test("commissions page loads rules and summary", async ({ page }) => {
  await page.goto("/commissions");
  await waitForWorkspace(page);

  await expect(page.getByRole("heading", { name: /period summary/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /commission rules/i })).toBeVisible();
  await expect(page.getByLabel(/commission period/i)).toBeVisible();
});

test("payroll page shows payslip table and generate dialog", async ({ page }) => {
  await page.goto("/payroll");
  await waitForWorkspace(page);

  await expect(page.getByRole("heading", { name: /^payslips$/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /generate payslip/i }).click();
  await expect(page.getByRole("heading", { name: /generate payslip/i })).toBeVisible();
});

test("tips page loads ledger table", async ({ page }) => {
  await page.goto("/tips");
  await waitForWorkspace(page);

  await expect(page.getByRole("heading", { name: /tips ledger/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /record tip/i })).toBeVisible();
});
