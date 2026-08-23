import { test, expect } from "@playwright/test";

import { switchToClinicOrg } from "../helpers/clinic-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Clinic floor ops (HA1)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToClinicOrg(context);
  });

  test("gallery before/after pairing UI", async ({ page }) => {
    await page.goto("/gallery");
    await waitForWorkspace(page);
    await expect(page.getByRole("heading", { name: /Before & After/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("gallery-upload-slot")).toBeVisible();
  });

  test("queue page reachable", async ({ page }) => {
    await page.goto("/queue");
    await waitForWorkspace(page);
    await expect(page.getByTestId("walk-in-form")).toBeVisible({ timeout: 15_000 });
  });

  test("waitlist page reachable", async ({ page }) => {
    await page.goto("/waitlist");
    await waitForWorkspace(page);
    await expect(page.getByText(/waitlist/i).first()).toBeVisible();
  });
});
