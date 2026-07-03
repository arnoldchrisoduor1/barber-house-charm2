import { expect, test } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";

async function switchPortal(page: import("@playwright/test").Page, portal: "staff" | "business") {
  await page.getByRole("tab", { name: portal === "staff" ? /staff/i : /business owner/i }).click();
}

test.describe("Staff portal flows", () => {
  test.beforeEach(async ({ context }) => {
    await ensureAuthenticated(context);
  });

  test("staff preview shows scoped dashboard and bookings", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);

    await switchPortal(page, "staff");
    await expect(page.getByTestId("staff-dashboard")).toBeVisible({ timeout: 15_000 });

    await page.goto("/bookings");
    await waitForWorkspace(page);
    await expect(page.getByText(/your appointments|today's schedule|no bookings for this date/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("schedule and my-earnings pages load in staff preview", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await switchPortal(page, "staff");

    await page.goto("/schedule");
    await waitForWorkspace(page);
    await expect(page.getByText(/schedule/i).first()).toBeVisible();

    await page.goto("/my-earnings");
    await waitForWorkspace(page);
    await expect(page.getByText(/earnings|commission|revenue/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("QR clock page shows QR display and clock actions", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await switchPortal(page, "staff");

    await page.goto("/qr-clock");
    await waitForWorkspace(page);
    await expect(page.getByTestId("qr-clock-display")).toBeVisible({ timeout: 20_000 });
  });

  test("QR attendance page shows manager view", async ({ page }) => {
    await page.goto("/qr-attendance");
    await waitForWorkspace(page);
    await expect(page.getByTestId("qr-attendance-display")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/attendance|scan log/i).first()).toBeVisible();
  });
});
