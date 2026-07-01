import { test, expect } from "@playwright/test";

test("landing page loads with Haus sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /nine specialised/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /haus of barber/i }).first()).toBeVisible();
});

test("landing pricing section shows plan descriptions", async ({ page }) => {
  await page.goto("/#pricing");
  await expect(page.getByRole("heading", { name: /simple,/i })).toBeVisible();
  await expect(page.getByText(/for growing businesses that need more power/i)).toBeVisible();
  await expect(page.getByText(/multi-location chains and franchise operations/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /start free trial/i }).first()).toBeVisible();
});

test("get-started flow links to register with category", async ({ page }) => {
  await page.goto("/get-started?category=barber");
  await expect(page.getByText(/business owner/i)).toBeVisible();
  await page.getByRole("link", { name: /continue/i }).first().click();
  await page.waitForURL("**/register?**");
  expect(page.url()).toContain("category=barber");
});

test("theme toggle switches light/dark on marketing page", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByTitle(/switch to (light|dark) mode/i).first();
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toBeEnabled();
});
