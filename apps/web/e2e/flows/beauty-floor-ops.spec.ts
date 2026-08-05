import { test, expect } from "@playwright/test";

import { switchToBeautyOrg } from "../helpers/beauty-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Beauty floor ops (HB1)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToBeautyOrg(context);
  });

  test("queue walk-in form visible", async ({ page }) => {
    await page.goto("/queue");
    await waitForWorkspace(page);
    await expect(page.getByTestId("walk-in-form")).toBeVisible({ timeout: 15_000 });
  });

  test("time-off page loads", async ({ page }) => {
    await page.goto("/time-off");
    await waitForWorkspace(page);
    await expect(page.locator("body")).toContainText(/time off|leave/i);
  });

  test("booking deposits page loads", async ({ page }) => {
    await page.goto("/booking-deposits");
    await waitForWorkspace(page);
    await expect(page.locator("body")).toContainText(/deposit|cancellation/i);
  });
});
