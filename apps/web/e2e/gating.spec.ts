import { test, expect } from "@playwright/test";

import { ensureAuthenticated } from "./helpers/ensure-auth";
import { waitForWorkspace } from "./helpers/crud";

test.beforeEach(async ({ context }) => {
  await ensureAuthenticated(context);
});

test("CRM clients page renders with feature enabled for enterprise demo", async ({ page }) => {
  await page.goto("/clients");
  await waitForWorkspace(page);
  await expect(page.getByRole("button", { name: /add new/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("platform admin can access admin console", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText(/loading admin console/i)).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /admin console/i })).toBeVisible({ timeout: 15_000 });
});

test("select-plan page loads and allows plan switch without payment", async ({ page }) => {
  await page.goto("/select-plan");
  await expect(page.getByRole("heading", { name: /choose your/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/no payment required/i).first()).toBeVisible();
  const switchButton = page.getByRole("button", { name: /^switch to /i }).first();
  await expect(switchButton).toBeVisible();
  await switchButton.click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("CEO can switch between business, staff, and client portals", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForWorkspace(page);
  await expect(page.getByRole("tablist", { name: /switch portal/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("tab", { name: /business owner/i })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: /client/i }).click();
  await page.waitForURL("**/portal", { timeout: 15_000 });
  await expect(page.getByRole("tab", { name: /client/i })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: /staff/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page.getByRole("tab", { name: /staff/i })).toHaveAttribute("aria-selected", "true");
});
