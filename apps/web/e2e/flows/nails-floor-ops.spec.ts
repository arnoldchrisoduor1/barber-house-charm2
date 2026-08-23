import { test, expect } from "@playwright/test";

import { switchToNailsOrg } from "../helpers/nails-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Nails floor ops (HN1)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToNailsOrg(context);
  });

  test("waitlist customer search UX", async ({ page }) => {
    await page.goto("/waitlist");
    await waitForWorkspace(page);
    await expect(page.getByText(/waitlist/i).first()).toBeVisible();
    await expect(page.getByTestId("waitlist-customer-picker")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("booking deposits page loads", async ({ page }) => {
    await page.goto("/booking-deposits");
    await waitForWorkspace(page);
    await expect(page.locator("body")).toContainText(/deposit|cancellation/i);
  });

  test("time-off page loads", async ({ page }) => {
    await page.goto("/time-off");
    await waitForWorkspace(page);
    await expect(page.locator("body")).toContainText(/time off|leave/i);
  });

  test("shift-swap page loads", async ({ page }) => {
    await page.goto("/shift-swap");
    await waitForWorkspace(page);
    await expect(page.locator("body")).toContainText(/shift|swap/i);
  });

  test("pos tabs page loads", async ({ page }) => {
    await page.goto("/pos/tabs");
    await waitForWorkspace(page);
    await expect(page.locator("body")).toContainText(/tab|open/i);
  });

  test("nail art gallery title + before/after upload slot", async ({ page }) => {
    await page.goto("/gallery");
    await waitForWorkspace(page);
    await expect(page.getByRole("heading", { name: /Nail Art Gallery/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("gallery-upload-slot")).toBeVisible();
  });
});
