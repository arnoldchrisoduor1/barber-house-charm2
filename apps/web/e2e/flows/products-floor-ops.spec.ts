import { test, expect } from "@playwright/test";

import { openProductsWorkspace, PRODUCTS_ORG_SLUG } from "../helpers/products-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Products floor ops (Phase 4)", () => {
  test("products dashboard KPIs render", async ({ page, context }) => {
    await openProductsWorkspace(page, context);
    await expect(page.getByTestId("products-dashboard")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("products-stat-pending")).toBeVisible();
    await expect(page.getByTestId("products-stat-low-stock")).toBeVisible();
  });

  test("storefront checkout → order queue → status advance → stock decrement", async ({ page, context }) => {
    test.setTimeout(120_000);
    const org = await openProductsWorkspace(page, context);

    const catalog = await context.request.get(`/api/v1/organizations/public/${PRODUCTS_ORG_SLUG}/shop/catalog`);
    expect(catalog.ok()).toBeTruthy();
    const catBody = (await catalog.json()) as {
      data?: Array<{ id?: string; ID?: string; quantity?: number; Quantity?: number; name?: string }>;
    };
    const product = catBody.data?.[0];
    const productId = String(product?.id ?? product?.ID ?? "");
    expect(productId).toBeTruthy();
    const qtyBefore = Number(product?.quantity ?? product?.Quantity ?? 0);
    expect(qtyBefore).toBeGreaterThan(0);

    const created = await context.request.post(`/api/v1/organizations/public/${PRODUCTS_ORG_SLUG}/shop/checkout`, {
      data: {
        customer_name: "E2E Shopper",
        customer_phone: "+254711000999",
        fulfillment_type: "pickup",
        payment_method: "pay_on_pickup",
        lines: [{ product_id: productId, quantity: 1 }],
      },
    });
    expect(created.status()).toBe(201);
    const order = (await created.json()) as {
      id?: string;
      ID?: string;
      status?: string;
      order_number?: string;
      stock_decremented?: boolean;
    };
    const orderId = String(order.id ?? order.ID);
    expect(order.status).toBe("pending");
    expect(order.stock_decremented).toBeFalsy();

    await page.goto("/shop-orders");
    await waitForWorkspace(page);
    await expect(page.getByTestId("shop-orders-page")).toBeVisible();
    await expect(page.getByTestId(`shop-order-${orderId}`)).toBeVisible();
    await expect(page.getByTestId(`shop-order-status-${orderId}`)).toContainText(/pending/i);

    const a1 = await context.request.post(`/api/v1/organizations/${org.id}/shop-orders/${orderId}/advance`, {
      data: { status: "ready" },
    });
    expect(a1.ok()).toBeTruthy();
    expect(((await a1.json()) as { status?: string }).status).toBe("ready");
    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId(`shop-order-status-${orderId}`)).toContainText(/ready/i);

    // Stock still unchanged before fulfill
    const midCatalog = await context.request.get(`/api/v1/organizations/public/${PRODUCTS_ORG_SLUG}/shop/catalog`);
    const midProd = ((await midCatalog.json()) as { data?: Array<{ id?: string; ID?: string; quantity?: number; Quantity?: number }> }).data?.find(
      (p) => String(p.id ?? p.ID) === productId,
    );
    expect(Number(midProd?.quantity ?? midProd?.Quantity)).toBe(qtyBefore);

    const a2 = await context.request.post(`/api/v1/organizations/${org.id}/shop-orders/${orderId}/advance`, {
      data: { status: "fulfilled" },
    });
    expect(a2.ok()).toBeTruthy();
    const fulfilled = (await a2.json()) as { status?: string; stock_decremented?: boolean };
    expect(fulfilled.status).toBe("fulfilled");
    expect(fulfilled.stock_decremented).toBeTruthy();

    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId(`shop-order-status-${orderId}`)).toContainText(/fulfilled/i);

    const afterCatalog = await context.request.get(`/api/v1/organizations/public/${PRODUCTS_ORG_SLUG}/shop/catalog`);
    const afterProd = ((await afterCatalog.json()) as { data?: Array<{ id?: string; ID?: string; quantity?: number; Quantity?: number }> }).data?.find(
      (p) => String(p.id ?? p.ID) === productId,
    );
    expect(Number(afterProd?.quantity ?? afterProd?.Quantity)).toBe(qtyBefore - 1);

    // UI advance path: create another pending and click Mark ready
    const created2 = await context.request.post(`/api/v1/organizations/${org.id}/shop-orders`, {
      data: {
        customer_name: "UI Advance Shopper",
        customer_phone: "+254711000998",
        fulfillment_type: "pickup",
        payment_method: "pay_on_pickup",
        lines: [{ product_id: productId, quantity: 1 }],
      },
    });
    expect(created2.status()).toBe(201);
    const order2 = (await created2.json()) as { id?: string; ID?: string };
    const order2Id = String(order2.id ?? order2.ID);
    await page.reload();
    await waitForWorkspace(page);
    await page.getByTestId(`shop-order-advance-${order2Id}`).click();
    await expect(page.getByTestId(`shop-order-status-${order2Id}`)).toContainText(/ready/i, { timeout: 15_000 });
  });

  test("public storefront page loads catalog", async ({ page }) => {
    await page.goto(`/shop/${PRODUCTS_ORG_SLUG}`);
    await expect(page.getByTestId("public-shop-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("shop-cart")).toBeVisible();
  });

  test("bundles & kits CRUD update/delete", async ({ page, context }) => {
    const org = await openProductsWorkspace(page, context);
    const name = `E2E Kit ${Date.now()}`;
    const created = await context.request.post(`/api/v1/organizations/${org.id}/service-packages`, {
      data: {
        name,
        package_type: "kit",
        price_kes: 1999,
        total_sessions: 1,
        valid_days: 365,
        description: "E2E kit contents",
        is_active: true,
      },
    });
    expect(created.status()).toBeGreaterThanOrEqual(200);
    expect(created.status()).toBeLessThan(300);
    const row = (await created.json()) as { id?: string; ID?: string };
    const id = String(row.id ?? row.ID);
    expect(id).toBeTruthy();

    const updated = await context.request.put(`/api/v1/organizations/${org.id}/service-packages/${id}`, {
      data: {
        name: `${name} Updated`,
        package_type: "kit",
        price_kes: 2499,
        total_sessions: 1,
        valid_days: 365,
        description: "Updated kit",
        is_active: true,
      },
    });
    expect(updated.ok()).toBeTruthy();

    await page.goto("/packages");
    await waitForWorkspace(page);
    await expect(page.getByText(`${name} Updated`).first()).toBeVisible({ timeout: 20_000 });

    const del = await context.request.delete(`/api/v1/organizations/${org.id}/service-packages/${id}`);
    expect([200, 204]).toContain(del.status());
    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByText(`${name} Updated`)).toHaveCount(0);
  });

  test("catalogue nav includes stock take and purchase orders", async ({ page, context }) => {
    await openProductsWorkspace(page, context);
    const sidebar = page.getByTestId("app-sidebar");
    await expect(sidebar.getByRole("link", { name: /Stock Take/i }).first()).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Purchase Orders/i }).first()).toBeVisible();
  });
});
