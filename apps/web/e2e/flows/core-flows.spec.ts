import { test, expect } from "@playwright/test";

import { waitForWorkspace } from "../helpers/crud";

test("bookings page loads seeded or empty state", async ({ page }) => {
  await page.goto("/bookings");
  await waitForWorkspace(page);
  await expect(page.getByRole("heading", { name: /bookings/i })).toBeVisible();
  const tableOrEmpty = page.getByText(/no bookings yet|scheduled|walk-in/i);
  await expect(tableOrEmpty.first()).toBeVisible({ timeout: 30_000 });
});

test("clients page loads", async ({ page }) => {
  await page.goto("/clients");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("POS page loads", async ({ page }) => {
  await page.goto("/pos");
  await waitForWorkspace(page);
  await expect(page.getByRole("button", { name: /^services$/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("finance page loads", async ({ page }) => {
  await page.goto("/finance");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("wallet page loads", async ({ page }) => {
  await page.goto("/wallet");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("queue page loads", async ({ page }) => {
  await page.goto("/queue");
  await waitForWorkspace(page);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("public booking widget loads for demo org", async ({ page }) => {
  await page.goto("/book/demo-salon");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});
