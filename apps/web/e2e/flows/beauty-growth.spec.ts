import { test, expect } from "@playwright/test";

import { switchToBeautyOrg } from "../helpers/beauty-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Beauty growth (HB2)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToBeautyOrg(context);
  });

  test("loyalty page loads", async ({ page }) => {
    await page.goto("/loyalty");
    await waitForWorkspace(page);
    await expect(page.locator("body")).toContainText(/loyalty|reward/i);
  });

  test("consent forms page loads", async ({ page }) => {
    await page.goto("/consent-forms");
    await waitForWorkspace(page);
    await expect(page.locator("body")).toContainText(/consent/i);
  });

  test("gallery page loads", async ({ page }) => {
    await page.goto("/gallery");
    await waitForWorkspace(page);
    await expect(page.locator("body")).toContainText(/gallery|before/i);
  });
});
