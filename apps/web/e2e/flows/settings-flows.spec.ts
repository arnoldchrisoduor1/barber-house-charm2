import { test, expect } from "@playwright/test";

import { waitForWorkspace } from "../helpers/crud";

test("settings security tab shows 2FA controls", async ({ page }) => {
  await page.goto("/settings");
  await waitForWorkspace(page);
  await page.getByRole("button", { name: /security/i }).click();
  await expect(page.getByText(/two-factor|2fa|verification/i).first()).toBeVisible();
});
