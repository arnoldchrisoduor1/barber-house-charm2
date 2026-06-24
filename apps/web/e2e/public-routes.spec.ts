import { test, expect } from "@playwright/test";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/book/demo-salon"] as const;

for (const route of PUBLIC_ROUTES) {
  test(`public route loads: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `HTTP status for ${route}`).toBeLessThan(500);

    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Application error");
    expect(errors, `client errors on ${route}`).toEqual([]);
  });
}
