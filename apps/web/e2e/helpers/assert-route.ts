import { expect, type Page } from "@playwright/test";

export async function assertRouteLoads(page: Page, route: string) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  let response = null as Awaited<ReturnType<Page["goto"]>>;
  await expect(async () => {
    response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `HTTP status for ${route}`).toBeLessThan(500);
  }).toPass({ timeout: 60_000 });

  await expect(page.locator("body")).not.toContainText("Application error", { timeout: 15_000 });

  const loading = page.getByText(/loading (workspace|admin console|portal)/i);
  await expect(loading).toHaveCount(0, { timeout: 30_000 });

  expect(errors, `client errors on ${route}`).toEqual([]);
}
