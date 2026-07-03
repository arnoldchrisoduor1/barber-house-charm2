import { test, expect } from "@playwright/test";

import { waitForWorkspace } from "../helpers/crud";

test("bookings page loads with date picker and cards", async ({ page }) => {
  await page.goto("/bookings");
  await waitForWorkspace(page);
  await expect(page.getByRole("heading", { name: /bookings/i })).toBeVisible();
  await expect(page.getByTestId("booking-date-picker")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("booking-cards")).toBeVisible();
});

test("schedule week grid loads", async ({ page }) => {
  await page.goto("/schedule");
  await waitForWorkspace(page);
  await expect(page.getByTestId("schedule-week-grid")).toBeVisible({ timeout: 15_000 });
});

test("queue kanban board loads", async ({ page }) => {
  await page.goto("/queue");
  await waitForWorkspace(page);
  await expect(page.getByTestId("queue-kanban")).toBeVisible({ timeout: 15_000 });
});

test("waitlist page loads with form", async ({ page }) => {
  await page.goto("/waitlist");
  await waitForWorkspace(page);
  await expect(page.getByTestId("waitlist-form")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("waitlist-entries")).toBeVisible();
});
