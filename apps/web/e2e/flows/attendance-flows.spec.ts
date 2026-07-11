import { expect, test } from "@playwright/test";

import { ensureAuthenticated, ensureStaffAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";

const timePattern = /\d{1,2}:\d{2}/;

test.describe("QR attendance flows", () => {
  test("staff clocks in and out; executive sees times on attendance page", async ({ browser, context }) => {
    test.setTimeout(120_000);

    const staffContext = await browser.newContext();
    await ensureStaffAuthenticated(staffContext);
    const staffPage = await staffContext.newPage();

    await staffPage.goto("/qr-clock");
    await waitForWorkspace(staffPage);
    await expect(staffPage.getByTestId("my-attendance-today")).toBeVisible({ timeout: 20_000 });

    await staffPage.getByTestId("qr-clock-in").click();
    await expect(staffPage.getByText(/clocked in/i)).toBeVisible({ timeout: 15_000 });
    await expect(staffPage.getByTestId("my-clock-in")).toHaveText(timePattern, { timeout: 15_000 });

    await staffPage.getByTestId("qr-clock-out").click();
    await expect(staffPage.getByText(/clocked out/i)).toBeVisible({ timeout: 15_000 });
    await expect(staffPage.getByTestId("my-clock-out")).toHaveText(timePattern, { timeout: 15_000 });

    await staffPage.goto("/dashboard");
    await waitForWorkspace(staffPage);
    await expect(staffPage.getByTestId("staff-dashboard")).toBeVisible({ timeout: 15_000 });
    await expect(staffPage.getByTestId("staff-stat-clock-in")).toHaveText(timePattern);
    await expect(staffPage.getByTestId("staff-stat-clock-out")).toHaveText(timePattern);

    await staffContext.close();

    await ensureAuthenticated(context);
    const execPage = await context.newPage();
    await execPage.goto("/qr-attendance");
    await waitForWorkspace(execPage);
    await expect(execPage.getByTestId("attendance-table")).toBeVisible({ timeout: 20_000 });

    const alexRow = execPage.getByTestId("attendance-row-Alex-Barber");
    await expect(alexRow).toBeVisible({ timeout: 15_000 });
    await expect(alexRow).toContainText(timePattern);
  });
});
