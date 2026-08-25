import { expect, test } from "@playwright/test";

import { waitForWorkspace } from "../helpers/crud";

test.describe("Haus switcher", () => {
  test("CEO can switch from Haus of Barber to Haus of Spa", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);

    const switcher = page.getByTestId("haus-switcher");
    await expect(switcher).toBeVisible({ timeout: 15_000 });
    await switcher.getByRole("combobox").click();
    await page.getByRole("option", { name: /haus of spa/i }).click();

    await waitForWorkspace(page);
    await expect(page.getByTestId("app-sidebar")).toContainText(/haus of spa/i, { timeout: 20_000 });
  });
});
