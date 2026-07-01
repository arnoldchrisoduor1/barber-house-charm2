import { test, expect } from "@playwright/test";

import { uniqueEmail, uniqueName } from "../helpers/unique";

test("register with house picker creates org and lands on dashboard", async ({ page }) => {
  const orgName = uniqueName("E2E Org");
  const email = uniqueEmail("e2e-register");

  await page.goto("/register?category=barber&portal=business");
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="fullName"]').fill("E2E Test User");
  await page.locator('input[name="organizationName"]').fill(orgName);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("TestPass123!");
  await expect(page.getByRole("button", { name: /create account/i })).toBeEnabled();
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
  await expect(page.locator("body")).not.toContainText("Registration failed");
});
