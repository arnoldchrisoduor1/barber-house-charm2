import { expect, type APIRequestContext } from "@playwright/test";

import { DEMO_ORG_SLUG } from "../fixtures";

const SLOT_TIMES = ["09:00", "10:30", "11:00", "12:00", "14:00", "15:00", "16:00"];

type CatalogStaff = { id?: string; ID?: string };
type CatalogService = { id?: string; ID?: string; durationMinutes?: number; DurationMinutes?: number };

export async function fetchPublicCatalog(request: APIRequestContext, orgSlug = DEMO_ORG_SLUG) {
  const res = await request.get(`/api/v1/organizations/public/${orgSlug}/catalog`);
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{
    services: CatalogService[];
    staff: CatalogStaff[];
  }>;
}

/** Finds the first staff member and a non-conflicting public booking slot. */
export async function findPublicBookingSlot(
  request: APIRequestContext,
  orgSlug = DEMO_ORG_SLUG,
  durationMinutes = 30,
) {
  const catalog = await fetchPublicCatalog(request, orgSlug);
  const staffId = catalog.staff[0]?.ID ?? catalog.staff[0]?.id;
  expect(staffId).toBeTruthy();
  if (!staffId) throw new Error("No staff in public catalog");

  const day = new Date();
  for (let offset = 1; offset <= 21; offset++) {
    const slotDay = new Date(day);
    slotDay.setDate(day.getDate() + offset);
    const bookingDate = slotDay.toISOString().slice(0, 10);
    for (const startTime of SLOT_TIMES) {
      const availRes = await request.get(
        `/api/v1/organizations/public/${orgSlug}/staff-availability?booking_date=${bookingDate}&start_time=${startTime}&duration_minutes=${durationMinutes}&staff_ids=${staffId}`,
      );
      if (!availRes.ok()) continue;
      const availBody = (await availRes.json()) as { availability?: Record<string, boolean> };
      const available = availBody.availability?.[staffId];
      if (available === true) {
        return { staffId, bookingDate, startTime };
      }
    }
  }
  throw new Error("Could not find an available public booking slot");
}

export async function createPublicBooking(
  request: APIRequestContext,
  orgSlug = DEMO_ORG_SLUG,
  opts?: { fullName?: string; phone?: string },
) {
  const catalog = await fetchPublicCatalog(request, orgSlug);
  const serviceId = (catalog.services[0]?.ID ?? catalog.services[0]?.id) as string;
  const duration =
    catalog.services[0]?.durationMinutes ?? catalog.services[0]?.DurationMinutes ?? 30;
  expect(serviceId).toBeTruthy();

  const slot = await findPublicBookingSlot(request, orgSlug, duration);
  const phone = opts?.phone ?? `+25478${Date.now().toString().slice(-7)}`;
  const res = await request.post(`/api/v1/organizations/public/${orgSlug}/bookings`, {
    data: {
      staffId: slot.staffId,
      serviceIds: [serviceId],
      bookingDate: slot.bookingDate,
      startTime: slot.startTime,
      fullName: opts?.fullName ?? "API Booking Guest",
      phone,
    },
  });
  return { res, slot, serviceId };
}
