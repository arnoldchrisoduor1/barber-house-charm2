import { test, expect } from "@playwright/test";

import { waitForWorkspace } from "../helpers/crud";

test("schedule add-shift dialog opens", async ({ page }) => {
  await page.goto("/schedule");
  await waitForWorkspace(page);
  await page.getByTestId("schedule-add-shift").click();
  await expect(page.getByTestId("schedule-editor")).toBeVisible({ timeout: 10_000 });
});

test("queue walk-in form is visible", async ({ page }) => {
  await page.goto("/queue");
  await waitForWorkspace(page);
  await expect(page.getByTestId("walk-in-form")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("queue-staff-select")).toBeVisible();
});

test("client ownership transfer dialog opens", async ({ page }) => {
  await page.goto("/client-ownership");
  await waitForWorkspace(page);
  const transferBtn = page.getByTestId("ownership-transfer-btn").first();
  const count = await transferBtn.count();
  test.skip(count === 0, "No ownership rows in demo org");
  await transferBtn.click();
  await expect(page.getByTestId("ownership-transfer-dialog")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("ownership-reason")).toBeVisible();
});

test("staff offboard wizard opens", async ({ page }) => {
  await page.goto("/staff");
  await waitForWorkspace(page);
  const offboardBtn = page.getByTestId("staff-offboard-btn").first();
  const count = await offboardBtn.count();
  test.skip(count === 0, "No active staff in demo org");
  await offboardBtn.click();
  await expect(page.getByTestId("staff-offboard-form")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("offboard-reason")).toBeVisible();
});
