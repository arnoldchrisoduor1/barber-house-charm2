import { expect, test } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Client portal flows", () => {
  test.beforeEach(async ({ context }) => {
    await ensureAuthenticated(context);
  });

  test("portal home shows discovery sections", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await page.getByRole("tab", { name: /client/i }).click();
    await page.waitForURL("**/portal", { timeout: 15_000 });

    await expect(page.getByText(/hello/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/branches/i).first()).toBeVisible();
    await expect(page.getByText(/featured|services/i).first()).toBeVisible();
  });

  test("portal nav reaches loyalty, profile, and bookings", async ({ page }) => {
    await page.goto("/portal/profile");
    await waitForWorkspace(page);
    await expect(page.getByTestId("portal-profile-form")).toBeVisible({ timeout: 15_000 });

    await page.goto("/portal/bookings");
    await waitForWorkspace(page);
    await expect(page.getByRole("button", { name: /upcoming/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /past/i })).toBeVisible();

    await page.goto("/portal/loyalty");
    await waitForWorkspace(page);
    await expect(page.getByText(/loyalty|rewards|points/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("portal profile saves contact details", async ({ page }) => {
    await page.goto("/portal/profile");
    await waitForWorkspace(page);

    const unique = Date.now().toString().slice(-7);
    await page.getByLabel(/full name/i).fill(`Portal User ${unique}`);
    await page.getByLabel(/phone/i).fill(`+25479${unique}`);
    await page.getByRole("button", { name: /save profile/i }).click();
    await expect(page.getByText(/profile saved/i)).toBeVisible({ timeout: 10_000 });
  });

  test("referrals and reviews pages load", async ({ page }) => {
    await page.goto("/portal/referrals");
    await waitForWorkspace(page);
    await expect(page.getByText(/referral/i).first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/portal/reviews");
    await waitForWorkspace(page);
    await expect(page.getByText(/review/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
