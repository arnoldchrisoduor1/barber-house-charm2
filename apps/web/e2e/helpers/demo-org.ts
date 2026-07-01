import type { APIRequestContext } from "@playwright/test";

/** First customer id in the demo org — used for referral/review CRUD tests. */
export async function getDemoCustomerId(request: APIRequestContext): Promise<string> {
  const me = await request.get("/api/v1/me");
  const { activeOrg } = (await me.json()) as { activeOrg?: { id?: string } };
  const orgId = activeOrg?.id;
  if (!orgId) throw new Error("No active org in /me response");

  const res = await request.get(`/api/v1/organizations/${orgId}/customers`);
  const body = (await res.json()) as { data?: Record<string, unknown>[] };
  const row = body.data?.[0];
  const id = row?.id ?? row?.ID;
  if (!id) throw new Error("No seeded customers found for demo org");
  return String(id);
}
