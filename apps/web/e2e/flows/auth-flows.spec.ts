import { test, expect } from "@playwright/test";

import { DEMO_EMAIL, DEMO_PASSWORD } from "../fixtures";
import { loginAndWait } from "../helpers/auth";

test("login redirects platform admin to admin console", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("**/admin**", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Platform Admin" })).toBeVisible();

  await context.close();
});

test("authenticated session persists on dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText(/loading workspace/i)).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator("body")).not.toContainText("Login failed");
});

test("fresh login via helper", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAndWait(page);
  await expect(page).toHaveURL(/\/(admin|dashboard|portal)/);
  await context.close();
});
