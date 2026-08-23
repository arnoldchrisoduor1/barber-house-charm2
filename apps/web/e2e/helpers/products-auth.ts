import { expect, type BrowserContext, type Page } from "@playwright/test";

import { ensureAuthenticated } from "./ensure-auth";
import { waitForWorkspace } from "./crud";

export const PRODUCTS_ORG_SLUG = process.env.E2E_PRODUCTS_ORG_SLUG ?? "products-demo-store";

export async function switchToProductsOrg(context: BrowserContext) {
  await ensureAuthenticated(context);
  const res = await context.request.get("/api/v1/public/orgs?category=products");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: Array<{ id?: string; slug?: string }> };
  const org = body.data?.find((o) => o.slug === PRODUCTS_ORG_SLUG);
  expect(org?.id).toBeTruthy();
  const select = await context.request.post("/api/v1/auth/select-org", { data: { orgId: org!.id } });
  expect(select.ok()).toBeTruthy();
  const me = await context.request.get("/api/v1/me");
  expect(me.ok()).toBeTruthy();
  const meBody = (await me.json()) as {
    activeOrg?: { id?: string; slug?: string; businessType?: string };
    features?: string[];
  };
  expect(meBody.activeOrg?.slug).toBe(PRODUCTS_ORG_SLUG);
  expect(meBody.activeOrg?.businessType).toBe("products");
  expect(meBody.features ?? []).toContain("shop_orders");
  return meBody.activeOrg!;
}

export async function openProductsWorkspace(page: Page, context: BrowserContext) {
  const org = await switchToProductsOrg(context);
  await page.goto("/dashboard");
  await waitForWorkspace(page);
  await expect(page.locator("html")).toHaveClass(/theme-products/);
  await expect(page.getByText(/Haus of Products/i).first()).toBeVisible({ timeout: 30_000 });
  return org;
}
