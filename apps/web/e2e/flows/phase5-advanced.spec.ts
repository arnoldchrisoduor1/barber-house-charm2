import { test, expect } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";
import { createPublicBooking } from "../helpers/booking";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../fixtures";

test.beforeEach(async ({ context }) => {
  await ensureAuthenticated(context);
});

test("revenue forecast chart renders", async ({ page }) => {
  await page.goto("/revenue-forecast");
  await waitForWorkspace(page);
  await expect(page.getByTestId("revenue-forecast-chart")).toBeVisible({ timeout: 15_000 });
});

test("services form includes buffer fields", async ({ page }) => {
  await page.goto("/services");
  await waitForWorkspace(page);
  await page.getByRole("button", { name: /add service/i }).click();
  await expect(page.getByLabel(/cleanup buffer/i)).toBeVisible({ timeout: 15_000 });
});

test("booking deposits policy page saves configuration", async ({ page }) => {
  await page.goto("/booking-deposits");
  await waitForWorkspace(page);
  await expect(page.getByTestId("booking-deposits-page")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("late-cancel-fee-input").fill("500");
  await page.getByTestId("save-booking-policy").click();
  await expect(page.getByText(/deposit configuration saved/i)).toBeVisible({ timeout: 10_000 });
});

test("late cancellation applies configured fee", async ({ request }) => {
  const login = await request.post("/api/v1/auth/login", {
    data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  expect(login.ok()).toBeTruthy();

  const me = await request.get("/api/v1/me");
  const { activeOrg } = await me.json();
  const orgId = activeOrg.id as string;

  const policyRes = await request.put(`/api/v1/organizations/${orgId}/booking-policy`, {
    data: {
      deposits_enabled: false,
      deposit_type: "percent",
      deposit_amount: 25,
      refund_window_hours: 24,
      late_cancel_fee_kes: 750,
      late_cancel_hours: 72,
    },
  });
  expect(policyRes.ok()).toBeTruthy();

  const { res: bookingRes, slot } = await createPublicBooking(request);
  expect(bookingRes.ok()).toBeTruthy();
  const booking = await bookingRes.json();
  const bookingId = (booking.id ?? booking.ID) as string;
  expect(bookingId).toBeTruthy();

  const cancelRes = await request.patch(`/api/v1/organizations/${orgId}/bookings/${bookingId}/status`, {
    data: { status: "cancelled" },
  });
  expect(cancelRes.ok()).toBeTruthy();
  const body = await cancelRes.json();
  expect(body.cancellation_fee_kes).toBe(750);
  expect(body.booking?.status ?? body.booking?.Status).toBe("cancelled");
  expect(slot.bookingDate).toBeTruthy();
});
