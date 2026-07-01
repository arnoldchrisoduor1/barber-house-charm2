import { expect, test } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";

async function switchPortal(page: import("@playwright/test").Page, portal: "business" | "staff" | "client") {
  const labels: Record<typeof portal, RegExp> = {
    business: /business owner/i,
    staff: /staff/i,
    client: /client/i,
  };
  await page.getByRole("tab", { name: labels[portal] }).click();
}

async function getOrgId(request: import("@playwright/test").APIRequestContext) {
  const me = await request.get("/api/v1/me");
  expect(me.ok()).toBeTruthy();
  const body = await me.json();
  return body.activeOrg?.id as string;
}

async function getRevenue(request: import("@playwright/test").APIRequestContext, orgId: string) {
  const res = await request.get(`/api/v1/organizations/${orgId}/analytics/reports`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return Number(body.total_revenue_kes ?? 0);
}

test.describe("Cross-portal booking → POS → dashboard flow", () => {
  test.beforeEach(async ({ context }) => {
    await ensureAuthenticated(context);
  });

  test("client books, staff bills via POS, executive sees updated revenue", async ({ page, request }) => {
    test.setTimeout(120_000);
    const orgId = await getOrgId(request);
    const revenueBefore = await getRevenue(request, orgId);
    const unique = Date.now().toString().slice(-7);
    const guestPhone = `+25479${unique}`;
    const guestName = `Flow Guest ${unique}`;

    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.getByRole("tablist", { name: /switch portal/i })).toBeVisible({ timeout: 15_000 });

    // Client portal: book an appointment
    await switchPortal(page, "client");
    await page.waitForURL("**/portal", { timeout: 15_000 });
    await page.goto("/portal/book");
    await expect(page.getByRole("heading", { name: /book your next visit/i })).toBeVisible({
      timeout: 20_000,
    });

    await expect(page.getByRole("heading", { name: /select services/i })).toBeVisible({ timeout: 20_000 });
    const serviceTile = page.getByRole("button").filter({ hasText: /classic haircut|beard trim/i }).first();
    await expect(serviceTile).toBeVisible({ timeout: 20_000 });
    await serviceTile.click();
    await page.getByRole("button", { name: /continue/i }).click();

    const future = new Date();
    future.setDate(future.getDate() + 4);
    const bookingDate = future.toISOString().slice(0, 10);
    await page.getByLabel(/date/i).fill(bookingDate);
    await page.getByLabel(/time/i).fill("11:30");
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByRole("heading", { name: /choose your professional/i })).toBeVisible({
      timeout: 20_000,
    });
    const staffTile = page.getByRole("button").filter({ hasText: /alex|stylist|barber/i }).first();
    await expect(staffTile).toBeVisible({ timeout: 20_000 });
    await staffTile.click();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByRole("heading", { name: /confirm details/i })).toBeVisible();
    await page.getByLabel(/full name/i).fill(guestName);
    await page.getByLabel(/phone/i).fill(guestPhone);
    await page.getByRole("button", { name: /confirm booking/i }).click();
    await expect(page.getByText(/booking confirmed/i)).toBeVisible({ timeout: 20_000 });

    // Client portal: booking appears in My bookings
    await page.goto("/portal/bookings");
    await expect(page.getByRole("heading", { name: /my bookings/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("portal-booking-card").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("portal-booking-card").first()).toContainText(/scheduled/i);

    const bookingsRes = await request.get(
      `/api/v1/organizations/${orgId}/bookings?customer_phone=${encodeURIComponent(guestPhone)}`,
    );
    expect(bookingsRes.ok()).toBeTruthy();
    const bookingsBody = await bookingsRes.json();
    const bookingId = bookingsBody.data?.[0]?.ID ?? bookingsBody.data?.[0]?.id;
    expect(bookingId).toBeTruthy();

    // Staff portal: bill the appointment through POS
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await switchPortal(page, "staff");
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await page.goto("/pos");
    await waitForWorkspace(page);

    await expect(page.getByTestId("pos-scheduled-bookings")).toBeVisible({ timeout: 20_000 });
    const appointmentRow = page.getByTestId(`pos-booking-${bookingId}`);
    await expect(appointmentRow).toBeVisible({ timeout: 20_000 });
    await appointmentRow.getByRole("button", { name: /bill appointment/i }).click();

    await expect(page.getByText(/classic haircut|beard trim/i).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^checkout$/i }).click();
    await expect(page.getByRole("heading", { name: /take payment/i })).toBeVisible();
    await page.getByRole("button", { name: /complete sale/i }).click();
    await expect(page.getByText(/sale complete/i)).toBeVisible({ timeout: 30_000 });

    // Executive dashboard: revenue increased
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await switchPortal(page, "business");
    await expect(page.getByTestId("dashboard-metrics")).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(async () => getRevenue(request, orgId), { timeout: 20_000 })
      .toBeGreaterThan(revenueBefore);

    // Staff chat works
    await page.goto("/staff-chat");
    await waitForWorkspace(page);
    const chatMessage = `E2E staff chat ${unique}`;
    await page.getByPlaceholder(/type a message/i).fill(chatMessage);
    await page.getByRole("button", { name: /^send$/i }).click();
    await expect(page.getByText(chatMessage)).toBeVisible({ timeout: 15_000 });
  });
});
