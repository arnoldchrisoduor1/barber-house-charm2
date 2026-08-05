import { test, expect } from "@playwright/test";

import { switchToSpaOrg } from "../helpers/spa-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Spa growth (HS2)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToSpaOrg(context);
  });

  test("loyalty page loads", async ({ page }) => {
    await page.goto("/loyalty");
    await waitForWorkspace(page);
    await expect(page.getByText(/loyalty/i).first()).toBeVisible();
  });

  test("packages page loads", async ({ page }) => {
    await page.goto("/packages");
    await waitForWorkspace(page);
    await expect(page.getByText(/package/i).first()).toBeVisible();
  });

  test("consent forms spa page", async ({ page }) => {
    await page.goto("/consent-forms");
    await waitForWorkspace(page);
    await expect(page.getByTestId("consent-forms-page")).toBeVisible();
  });

  test("gallery page loads", async ({ page }) => {
    await page.goto("/gallery");
    await waitForWorkspace(page);
    await expect(page.getByText(/gallery/i).first()).toBeVisible();
  });
});
