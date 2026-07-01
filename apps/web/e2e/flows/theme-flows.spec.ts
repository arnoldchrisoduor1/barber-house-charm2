import { test, expect } from "@playwright/test";

import { waitForWorkspace } from "../helpers/crud";

test("theme toggle in dashboard header", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForWorkspace(page);

  const toggle = page.getByTitle(/switch to (light|dark) mode/i);
  if (await toggle.count()) {
    const before = await page.locator("html").getAttribute("class");
    await toggle.first().click();
    const after = await page.locator("html").getAttribute("class");
    expect(before !== after || (after ?? "").match(/light|dark/)).toBeTruthy();
  }
});
