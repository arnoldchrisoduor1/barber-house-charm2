import { test, expect } from "@playwright/test";

import { DEMO_EMAIL, DEMO_PASSWORD } from "./fixtures";

test("login redirects platform admin to admin console", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("**/admin**", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Platform Admin" })).toBeVisible();

  await context.close();
});

test("bookings page loads seeded data", async ({ page }) => {
  await page.goto("/bookings");

  await expect(page.getByText(/loading workspace/i)).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /bookings/i })).toBeVisible();

  const tableOrEmpty = page.getByText(/no bookings yet|scheduled|walk-in/i);
  await expect(tableOrEmpty.first()).toBeVisible({ timeout: 30_000 });
});

test("clients page loads", async ({ page }) => {
  await page.goto("/clients");
  await expect(page.getByText(/loading workspace/i)).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("public booking widget loads for demo org", async ({ page }) => {
  await page.goto("/book/demo-salon");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});
