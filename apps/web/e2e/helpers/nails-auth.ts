import { expect, type BrowserContext } from "@playwright/test";

import { ensureAuthenticated } from "./ensure-auth";

export const NAILS_ORG_SLUG = process.env.E2E_NAILS_ORG_SLUG ?? "nail-demo-studio";

export async function switchToNailsOrg(context: BrowserContext) {
  await ensureAuthenticated(context);
  const res = await context.request.get("/api/v1/public/orgs?category=nail_bar");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: Array<{ id?: string; slug?: string }> };
  const org = body.data?.find((o) => o.slug === NAILS_ORG_SLUG);
  expect(org?.id).toBeTruthy();
  const select = await context.request.post("/api/v1/auth/select-org", { data: { orgId: org!.id } });
  expect(select.ok()).toBeTruthy();
}
