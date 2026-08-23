import { expect, type BrowserContext, type Page } from "@playwright/test";

import { ensureAuthenticated } from "./ensure-auth";
import { waitForWorkspace } from "./crud";

export const CLINIC_ORG_SLUG = process.env.E2E_CLINIC_ORG_SLUG ?? "clinic-demo-aesthetics";

export async function switchToClinicOrg(context: BrowserContext) {
  await ensureAuthenticated(context);
  const res = await context.request.get("/api/v1/public/orgs?category=clinic");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: Array<{ id?: string; slug?: string }> };
  const org = body.data?.find((o) => o.slug === CLINIC_ORG_SLUG);
  expect(org?.id).toBeTruthy();
  const select = await context.request.post("/api/v1/auth/select-org", { data: { orgId: org!.id } });
  expect(select.ok()).toBeTruthy();
  const me = await context.request.get("/api/v1/me");
  expect(me.ok()).toBeTruthy();
  const meBody = (await me.json()) as {
    activeOrg?: { id?: string; slug?: string; businessType?: string };
    features?: string[];
  };
  expect(meBody.activeOrg?.slug).toBe(CLINIC_ORG_SLUG);
  expect(meBody.activeOrg?.businessType).toBe("clinic");
  expect(meBody.features ?? []).toContain("clinical");
  return meBody.activeOrg!;
}

/** Select clinic org then hydrate client /me via dashboard. */
export async function openClinicWorkspace(page: Page, context: BrowserContext) {
  const org = await switchToClinicOrg(context);
  await page.goto("/dashboard");
  await waitForWorkspace(page);
  await expect(page.getByText(/Haus of Aesthetics/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("html")).toHaveClass(/theme-clinic/);
  return org;
}
