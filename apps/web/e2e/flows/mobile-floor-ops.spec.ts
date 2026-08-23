import { test, expect } from "@playwright/test";

import { openMobileWorkspace } from "../helpers/mobile-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Mobile floor ops (Phase 3)", () => {
  test("specialty-resolved terms + dispatch dashboard", async ({ page, context }) => {
    const org = await openMobileWorkspace(page, context);
    const me = await context.request.get("/api/v1/me");
    expect(me.ok()).toBeTruthy();
    const meBody = (await me.json()) as {
      activeOrg?: {
        specialty?: string;
        termsMode?: string;
        effectiveCategories?: string[];
        businessType?: string;
      };
      features?: string[];
    };
    expect(meBody.activeOrg?.businessType).toBe("mobile");
    expect(meBody.activeOrg?.specialty).toBe("barber");
    expect(meBody.activeOrg?.termsMode).toBe("barber");
    expect(meBody.activeOrg?.effectiveCategories).toEqual(["mobile", "barber"]);
    expect(meBody.features ?? []).toContain("coverage_zones");

    await expect(page.getByTestId("mobile-dispatch-dashboard")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("html")).toHaveClass(/theme-mobile/);
    // Specialty terms (barber) overlay — appointments language from barber terms
    await expect(page.getByText(/appointments/i).first()).toBeVisible();
    await expect(page.getByText(/Haus of Mobile/i).first()).toBeVisible();
    expect(org.id).toBeTruthy();
  });

  test("coverage zones CRUD", async ({ page, context }) => {
    const org = await openMobileWorkspace(page, context);
    const name = `E2E Zone ${Date.now()}`;
    const created = await context.request.post(`/api/v1/organizations/${org.id}/coverage-zones`, {
      data: { name, city: "Nairobi", radius_km: 5, surcharge_kes: 400, is_active: true },
    });
    expect(created.status()).toBe(201);
    const row = (await created.json()) as { id?: string; ID?: string };
    const id = String(row.id ?? row.ID);
    expect(id).toBeTruthy();

    await page.goto("/coverage-zones");
    await waitForWorkspace(page);
    await expect(page.getByTestId("coverage-zones-page")).toBeVisible();
    await expect(page.getByTestId(`coverage-zone-${id}`)).toBeVisible();
    await expect(page.getByText(name).first()).toBeVisible();

    const updatedName = `${name} Updated`;
    const updated = await context.request.put(`/api/v1/organizations/${org.id}/coverage-zones/${id}`, {
      data: { name: updatedName, city: "Kiambu", radius_km: 9, surcharge_kes: 750, is_active: true },
    });
    expect(updated.ok()).toBeTruthy();
    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByText(updatedName).first()).toBeVisible();
    await expect(page.getByText(/Kiambu/i).first()).toBeVisible();

    const del = await context.request.delete(`/api/v1/organizations/${org.id}/coverage-zones/${id}`);
    expect(del.status()).toBe(204);
    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId(`coverage-zone-${id}`)).toHaveCount(0);
  });

  test("field job status advance en_route → on_site → done", async ({ page, context }) => {
    const org = await openMobileWorkspace(page, context);

    const staffRes = await context.request.get(`/api/v1/organizations/${org.id}/staff`);
    expect(staffRes.ok()).toBeTruthy();
    const staffBody = (await staffRes.json()) as { data?: Array<{ id?: string; ID?: string }> };
    const staffId = staffBody.data?.[0]?.id ?? staffBody.data?.[0]?.ID;
    expect(staffId).toBeTruthy();

    const bookingsRes = await context.request.get(`/api/v1/organizations/${org.id}/bookings`);
    expect(bookingsRes.ok()).toBeTruthy();
    const bookingsBody = (await bookingsRes.json()) as { data?: Array<{ id?: string; ID?: string }> };
    const bookingId = bookingsBody.data?.[0]?.id ?? bookingsBody.data?.[0]?.ID;

    const created = await context.request.post(`/api/v1/organizations/${org.id}/field-jobs`, {
      data: {
        staff_id: staffId,
        booking_id: bookingId || undefined,
        visit_address: "99 E2E Lane, Westlands",
        notes: "Floor-ops advance path",
        status: "assigned",
      },
    });
    expect(created.status()).toBe(201);
    const job = (await created.json()) as { id?: string; ID?: string; status?: string };
    const jobId = String(job.id ?? job.ID);
    expect(jobId).toBeTruthy();

    await page.goto("/field-operations");
    await waitForWorkspace(page);
    await expect(page.getByTestId("field-ops-page")).toBeVisible();
    await expect(page.getByTestId(`field-job-${jobId}`)).toBeVisible();
    await expect(page.getByTestId(`field-job-status-${jobId}`)).toContainText(/assigned/i);

    const a1 = await context.request.post(`/api/v1/organizations/${org.id}/field-jobs/${jobId}/advance`, {
      data: { status: "en_route" },
    });
    expect(a1.ok()).toBeTruthy();
    const s1 = (await a1.json()) as { status?: string };
    expect(s1.status).toBe("en_route");

    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId(`field-job-status-${jobId}`)).toContainText(/en route/i);

    const a2 = await context.request.post(`/api/v1/organizations/${org.id}/field-jobs/${jobId}/advance`, {
      data: { status: "on_site" },
    });
    expect(a2.ok()).toBeTruthy();
    expect(((await a2.json()) as { status?: string }).status).toBe("on_site");

    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId(`field-job-status-${jobId}`)).toContainText(/on site/i);

    const a3 = await context.request.post(`/api/v1/organizations/${org.id}/field-jobs/${jobId}/advance`, {
      data: { status: "done" },
    });
    expect(a3.ok()).toBeTruthy();
    expect(((await a3.json()) as { status?: string }).status).toBe("done");

    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId(`field-job-status-${jobId}`)).toContainText(/done/i);

    // Also exercise UI advance button on a fresh assigned job
    const created2 = await context.request.post(`/api/v1/organizations/${org.id}/field-jobs`, {
      data: {
        staff_id: staffId,
        visit_address: "UI Advance Road",
        status: "assigned",
      },
    });
    expect(created2.status()).toBe(201);
    const job2 = (await created2.json()) as { id?: string; ID?: string };
    const job2Id = String(job2.id ?? job2.ID);

    await page.reload();
    await waitForWorkspace(page);
    await page.getByTestId(`field-job-advance-${job2Id}`).click();
    await expect(page.getByTestId(`field-job-status-${job2Id}`)).toContainText(/en route/i, { timeout: 15_000 });

    await context.request.delete(`/api/v1/organizations/${org.id}/field-jobs/${jobId}`);
    await context.request.delete(`/api/v1/organizations/${org.id}/field-jobs/${job2Id}`);
  });
});
