import { test, expect } from "@playwright/test";

import { switchToBeautyOrg } from "../helpers/beauty-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Beauty advanced (HB3)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToBeautyOrg(context);
  });

  test("clients list shows allergy badge for seeded client", async ({ page }) => {
    await page.goto("/clients");
    await waitForWorkspace(page);
    await expect(page.getByTestId("client-allergy-badge").first()).toBeVisible({ timeout: 15_000 });
  });

  test("patch tests page loads", async ({ page }) => {
    await page.goto("/client-patch-tests");
    await waitForWorkspace(page);
    await expect(page.getByTestId("client-patch-tests-page")).toBeVisible();
  });

  test("consultation notes page loads", async ({ page }) => {
    await page.goto("/client-consultations");
    await waitForWorkspace(page);
    await expect(page.getByTestId("client-consultations-page")).toBeVisible();
  });

  test("bookings page uses appointment copy", async ({ page }) => {
    await page.goto("/bookings");
    await waitForWorkspace(page);
    await expect(page.locator("h1, [data-testid='page-title']").first()).toContainText(/appointment/i);
  });
});
