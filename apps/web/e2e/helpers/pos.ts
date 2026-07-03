import { expect, type Page } from "@playwright/test";

export async function ensureShiftOpen(page: Page) {
  const openShift = page.getByTestId("pos-open-shift");
  if (await openShift.isVisible().catch(() => false)) {
    await openShift.click();
    await expect(page.getByTestId("pos-shift-dialog")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^open shift$/i }).click();
    await expect(page.getByText(/shift open since/i)).toBeVisible({ timeout: 30_000 });
  }
}
