import { test, expect } from "@playwright/test";

import { switchToSpaOrg } from "../helpers/spa-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Spa floor ops (HS1)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToSpaOrg(context);
  });

  test("sessions page loads with spa terms", async ({ page }) => {
    await page.goto("/bookings");
    await waitForWorkspace(page);
    await expect(page.getByRole("heading", { name: /Sessions/i }).first()).toBeVisible();
  });

  test("waitlist page reachable", async ({ page }) => {
    await page.goto("/waitlist");
    await waitForWorkspace(page);
    await expect(page.getByTestId("waitlist-page").or(page.getByText(/waitlist/i).first())).toBeVisible();
  });

  test("queue page reachable", async ({ page }) => {
    await page.goto("/queue");
    await waitForWorkspace(page);
    await expect(page.getByTestId("queue-page").or(page.getByText(/queue/i).first())).toBeVisible();
  });
});
