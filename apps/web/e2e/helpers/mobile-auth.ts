import { expect, type BrowserContext, type Page } from "@playwright/test";

import { ensureAuthenticated } from "./ensure-auth";
import { waitForWorkspace } from "./crud";

export const MOBILE_ORG_SLUG = process.env.E2E_MOBILE_ORG_SLUG ?? "mobile-demo-pros";

export async function switchToMobileOrg(context: BrowserContext) {
  await ensureAuthenticated(context);
  const res = await context.request.get("/api/v1/public/orgs?category=mobile");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: Array<{ id?: string; slug?: string }> };
  const org = body.data?.find((o) => o.slug === MOBILE_ORG_SLUG);
  expect(org?.id).toBeTruthy();
  const select = await context.request.post("/api/v1/auth/select-org", { data: { orgId: org!.id } });
  expect(select.ok()).toBeTruthy();
  const me = await context.request.get("/api/v1/me");
  expect(me.ok()).toBeTruthy();
  const meBody = (await me.json()) as {
    activeOrg?: { id?: string; slug?: string; businessType?: string; specialty?: string };
    features?: string[];
  };
  expect(meBody.activeOrg?.slug).toBe(MOBILE_ORG_SLUG);
  expect(meBody.activeOrg?.businessType).toBe("mobile");
  expect(meBody.features ?? []).toContain("coverage_zones");
  return meBody.activeOrg!;
}

/** Select mobile org then hydrate client /me via dashboard. */
export async function openMobileWorkspace(page: Page, context: BrowserContext) {
  const org = await switchToMobileOrg(context);
  await page.goto("/dashboard");
  await waitForWorkspace(page);
  await expect(page.locator("html")).toHaveClass(/theme-mobile/);
  // Brand stays Haus of Mobile; specialty only overlays terms (seed specialty=barber)
  await expect(page.getByText(/Haus of Mobile/i).first()).toBeVisible({ timeout: 30_000 });
  return org;
}
