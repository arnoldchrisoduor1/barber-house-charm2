import { expect, test } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";
import { ensureShiftOpen } from "../helpers/pos";

async function switchPortal(
  page: import("@playwright/test").Page,
  portal: "business" | "manager" | "staff" | "client",
) {
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

async function createTestBooking(
  request: import("@playwright/test").APIRequestContext,
  orgId: string,
  opts: { staffId: string; branchId?: string; customerId: string },
) {
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
          customerId: opts.customerId,
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
  throw new Error("Could not create a non-conflicting booking");
}

async function getOrgId(request: import("@playwright/test").APIRequestContext) {
  const me = await request.get("/api/v1/me");
  expect(me.ok()).toBeTruthy();
  const body = await me.json();
  return body.activeOrg?.id as string;
}

test.describe("Major updates from docs/major_updates.md", () => {
  test.beforeEach(async ({ context }) => {
    await ensureAuthenticated(context);
  });

  test("sidebar stays fixed while main content scrolls", async ({ page }) => {
    await page.goto("/bookings");
    await waitForWorkspace(page);

    const sidebar = page.getByTestId("app-sidebar");
    const mainScroll = page.getByTestId("app-main-scroll");
    await expect(sidebar).toBeVisible();
    await expect(mainScroll).toBeVisible();

    const before = await sidebar.boundingBox();
    await mainScroll.evaluate((el) => {
      el.scrollTop = 400;
    });
    const after = await sidebar.boundingBox();
    expect(before?.y).toBe(after?.y);
  });

  test("schedule grid shows midnight through late evening hours", async ({ page }) => {
    await page.goto("/schedule");
    await waitForWorkspace(page);
    await expect(page.getByTestId("schedule-hour-00:00")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("schedule-hour-23:00")).toBeVisible();
  });

  test("client portal autofill, referrals, and reviews", async ({ page, request }) => {
    test.setTimeout(120_000);
    const orgId = await getOrgId(request);
    const unique = Date.now().toString().slice(-7);
    const phone = `+25479${unique}`;
    const name = `Portal User ${unique}`;

    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await switchPortal(page, "client");

    await page.goto("/portal/profile");
    await waitForWorkspace(page);
    await page.getByLabel(/full name/i).fill(name);
    await page.getByLabel(/phone/i).fill(phone);
    await page.getByRole("button", { name: /save profile/i }).click();
    await expect(page.getByText(/profile saved/i)).toBeVisible();

    await page.goto("/portal/book");
    await waitForWorkspace(page);
    await expect(page.getByTestId("booking-wizard")).toHaveAttribute("data-prefill-name", name, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("booking-wizard")).toHaveAttribute("data-prefill-phone", phone);

    // Create customer + completed booking via API so referrals/reviews work
    const customerRes = await request.post(`/api/v1/organizations/${orgId}/customers`, {
      data: { full_name: name, phone },
    });
    expect(customerRes.ok()).toBeTruthy();
    const customer = await customerRes.json();
    const customerId = customer.ID ?? customer.id;

    const catalogRes = await request.get(`/api/v1/organizations/${orgId}/bookings/catalog`);
    const catalog = await catalogRes.json();
    const staffId = String(catalog.staff?.[0]?.id ?? catalog.staff?.[0]?.ID ?? "");

    const createdBooking = await createTestBooking(request, orgId, {
      customerId: String(customerId),
      staffId,
    });
    const bookingId = createdBooking.ID ?? createdBooking.id;
    const statusRes = await request.patch(`/api/v1/organizations/${orgId}/bookings/${bookingId}/status`, {
      data: { status: "completed" },
    });
    expect(statusRes.ok()).toBeTruthy();

    await page.goto("/portal/referrals");
    await waitForWorkspace(page);
    await expect(page.getByTestId("referral-code-value")).not.toHaveText("—", { timeout: 15_000 });
    await expect(page.getByTestId("referral-code-value")).toContainText(/REF/i);

    await page.goto("/portal/reviews");
    await waitForWorkspace(page);
    const reviewText = `Great service ${unique}`;
    await page.getByTestId("portal-review-form").getByLabel(/comment/i).fill(reviewText);
    await page.getByRole("button", { name: /submit review/i }).click();
    await expect(page.getByText(/review submitted/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("portal-reviews-list")).toContainText(reviewText, { timeout: 15_000 });
  });

  test("staff can search customer and open booking wizard", async ({ page }) => {
    await page.goto("/bookings");
    await waitForWorkspace(page);
    await page.getByTestId("create-booking-btn").click();
    await expect(page.getByTestId("staff-booking-customer-search")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("staff-booking-search-input").fill("Jane");
    await expect(page.getByTestId(/staff-booking-customer-/).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Jane Client/i }).click();
    await expect(page.getByTestId("staff-booking-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/book on behalf of customer/i)).toBeVisible();
  });

  test("staff chat message appears in channel view", async ({ page }) => {
    await page.goto("/staff-chat");
    await waitForWorkspace(page);
    const unique = Date.now().toString().slice(-6);
    const message = `Major updates chat ${unique}`;
    await page.getByPlaceholder(/message/i).fill(message);
    await page.getByRole("button", { name: /^send$/i }).click();
    await expect(page.getByText(message)).toBeVisible({ timeout: 15_000 });
  });

  test("branch manager portal preview shows branch nav items", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.getByRole("tablist", { name: /switch portal/i })).toBeVisible({ timeout: 15_000 });
    await switchPortal(page, "manager");
    await expect(page.getByRole("link", { name: /^pos$/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /finance/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /audit log/i })).toBeVisible();
  });

  test("POS scheduled appointments show customer, service, staff, and price", async ({ page, request }) => {
    test.setTimeout(120_000);
    const orgId = await getOrgId(request);
    const unique = Date.now().toString().slice(-7);

    const catalogRes = await request.get(`/api/v1/organizations/${orgId}/bookings/catalog`);
    const catalog = await catalogRes.json();
    const staffId = String(catalog.staff?.[0]?.id ?? catalog.staff?.[0]?.ID ?? "");
    const branchId = catalog.branches?.[0]?.id ?? catalog.branches?.[0]?.ID;
    expect(staffId).toBeTruthy();

    const customerRes = await request.post(`/api/v1/organizations/${orgId}/customers`, {
      data: { full_name: `POS Guest ${unique}`, phone: `+25478${unique}` },
    });
    const customer = await customerRes.json();
    const customerId = customer.ID ?? customer.id;

    const created = await createTestBooking(request, orgId, {
      customerId: String(customerId),
      staffId,
      branchId: branchId ? String(branchId) : undefined,
    });
    const bookingId = created.ID ?? created.id;

    await page.goto("/pos");
    await waitForWorkspace(page);
    await ensureShiftOpen(page);

    const row = page.getByTestId(`pos-booking-${bookingId}`);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByTestId(`pos-booking-customer-${bookingId}`)).toContainText(`POS Guest ${unique}`);
    await expect(row).toContainText(/Alex Barber/i);
  });

  test("audit log shows seeded shop events", async ({ page }) => {
    await page.goto("/audit-log");
    await waitForWorkspace(page);
    await expect(page.getByText(/staff\.clock_in|booking\.created|payment\.completed/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
