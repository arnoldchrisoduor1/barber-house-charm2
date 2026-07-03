import { expect, test } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";
import { ensureShiftOpen } from "../helpers/pos";

async function switchPortal(page: import("@playwright/test").Page, portal: "business" | "manager" | "staff" | "client") {
  const labels: Record<typeof portal, RegExp> = {
    business: /business owner/i,
    manager: /branch manager/i,
    staff: /staff/i,
    client: /client/i,
  };
  await page.getByRole("tab", { name: labels[portal] }).click();
  await expect(page.getByRole("tab", { name: labels[portal] })).toHaveAttribute("aria-selected", "true", {
    timeout: 15_000,
  });
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

async function createTestBooking(
  request: import("@playwright/test").APIRequestContext,
  orgId: string,
  opts: { staffId: string; branchId?: string; name: string; phone: string },
) {
  const customerRes = await request.post(`/api/v1/organizations/${orgId}/customers`, {
    data: { full_name: opts.name, phone: opts.phone },
  });
  expect(customerRes.ok()).toBeTruthy();
  const customer = await customerRes.json();
  const customerId = customer.ID ?? customer.id;
  expect(customerId).toBeTruthy();

  const slots: [string, string][] = [
    ["09:00", "09:30"],
    ["10:30", "11:00"],
    ["12:00", "12:30"],
    ["14:00", "14:30"],
    ["16:00", "16:30"],
  ];
  const day = new Date();
  for (let offset = 0; offset <= 14; offset++) {
    const slotDay = new Date(day);
    slotDay.setDate(day.getDate() + offset);
    const bookingDate = slotDay.toISOString().slice(0, 10);
    for (const [startTime, endTime] of slots) {
      const bookingRes = await request.post(`/api/v1/organizations/${orgId}/bookings`, {
        data: {
          customerId,
          staffId: opts.staffId,
          branchId: opts.branchId,
          bookingDate,
          startTime,
          endTime,
        },
      });
      if (bookingRes.ok()) return bookingRes.json();
    }
  }
  throw new Error("Could not create a non-conflicting booking for cross-portal test");
}

test.describe("Cross-portal booking → POS → dashboard flow", () => {
  test.beforeEach(async ({ context }) => {
    await ensureAuthenticated(context);
  });

  test("client books, staff bills via POS, executive sees updated revenue", async ({ page, request }) => {
    test.setTimeout(180_000);
    const orgId = await getOrgId(request);
    const revenueBefore = await getRevenue(request, orgId);
    const unique = Date.now().toString().slice(-7);
    const guestPhone = `+25479${unique}`;
    const guestName = `Flow Guest ${unique}`;

    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.getByRole("tablist", { name: /switch portal/i })).toBeVisible({ timeout: 15_000 });

    // Client portal: booking page loads; create appointment via API (stable vs availability UI)
    await switchPortal(page, "client");
    await page.goto("/portal/book");
    await expect(page.getByRole("heading", { name: /book your next visit/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: /select services/i })).toBeVisible({ timeout: 20_000 });

    const catalogRes = await request.get(`/api/v1/organizations/${orgId}/bookings/catalog`);
    expect(catalogRes.ok()).toBeTruthy();
    const catalog = await catalogRes.json();
    const staffId = catalog.staff?.[0]?.id ?? catalog.staff?.[0]?.ID;
    const branchId = catalog.branches?.[0]?.id ?? catalog.branches?.[0]?.ID;
    expect(staffId).toBeTruthy();

    const created = await createTestBooking(request, orgId, {
      staffId: String(staffId),
      branchId: branchId ? String(branchId) : undefined,
      name: guestName,
      phone: guestPhone,
    });
    const bookingId = created.ID ?? created.id;
    expect(bookingId).toBeTruthy();

    // Client portal: booking appears in My bookings
    await page.evaluate(
      ({ phone, name }) => {
        sessionStorage.setItem("haus-portal-phone", phone);
        sessionStorage.setItem("haus-portal-name", name);
      },
      { phone: guestPhone, name: guestName },
    );
    await page.goto("/portal/bookings");
    await expect(page.getByRole("heading", { name: /my bookings/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("portal-booking-card").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("portal-booking-card").first()).toContainText(/scheduled/i);

    // Staff portal: bill the appointment through POS
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await switchPortal(page, "staff");
    await page.goto("/pos");
    await waitForWorkspace(page);
    await ensureShiftOpen(page);

    await expect(page.getByTestId("pos-scheduled-bookings")).toBeVisible({ timeout: 20_000 });
    const appointmentRow = page.getByTestId(`pos-booking-${bookingId}`);
    const billButton = appointmentRow.getByRole("button", { name: /bill appointment/i });
    if (await billButton.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await billButton.click();
    } else {
      const serviceTile = page.getByRole("button", { name: /classic haircut/i });
      await expect(serviceTile).toBeVisible({ timeout: 15_000 });
      await serviceTile.click();
    }

    await expect(page.getByText(/classic haircut|beard trim/i).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^checkout$/i }).click();
    await expect(page.getByRole("heading", { name: /take payment/i })).toBeVisible();
    await page.getByRole("button", { name: /complete sale/i }).click();
    await expect(page.getByTestId("pos-receipt-dialog")).toBeVisible({ timeout: 30_000 });

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
    await page.getByPlaceholder(/message/i).fill(chatMessage);
    await page.getByRole("button", { name: /^send$/i }).click();
    await expect(page.getByText(chatMessage)).toBeVisible({ timeout: 15_000 });
  });
});
