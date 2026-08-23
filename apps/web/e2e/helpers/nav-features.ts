import { type Page } from "@playwright/test";

/** Intercept GET /me and drop feature keys so nav gates can be asserted off. */
export async function stripMeFeatures(page: Page, keys: string[]) {
  const drop = new Set(keys);
  await page.route("**/api/v1/me", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    const resp = await route.fetch();
    const json = (await resp.json()) as { features?: string[] };
    json.features = (json.features ?? []).filter((f) => !drop.has(f));
    await route.fulfill({
      status: resp.status(),
      contentType: "application/json",
      body: JSON.stringify(json),
    });
  });
}

export async function setPortal(page: Page, portal: "executive" | "manager" | "staff" | "client") {
  await page.evaluate((activePortal) => {
    localStorage.setItem(
      "haus-portal-view",
      JSON.stringify({ state: { activePortal }, version: 0 }),
    );
  }, portal);
}
