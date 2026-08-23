#!/usr/bin/env node
/**
 * Phase 0 nav gate hardening for six mode manifests.
 * Adds requiredFeature per path (spa/beauty reference), removes payments-demo,
 * removes field-operations from nail/clinic/therapy.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../packages/contracts/domain/nav");
const modes = ["nail_bar", "clinic", "mobile", "therapy", "solo_pro", "products"];

const PATH_FEATURES = {
  "/branches": "multi_branch",
  "/qr-attendance": "qr_clock",
  "/qr-clock": "qr_clock",
  "/scorecards": "advanced_analytics",
  "/call-centre": "advanced_analytics",
  "/revenue-forecast": "advanced_analytics",
  "/queue": "queue",
  "/waitlist": "bookings",
  "/pos": "pos_payments",
  "/pos/tabs": "pos_payments",
  "/reviews": "customer_reviews",
  "/my-earnings": "staff_commissions_payroll",
  "/loyalty": "loyalty",
  "/packages": "marketing",
  "/gift-cards": "marketing",
  "/gallery": "marketing",
  "/consent-forms": "clinical",
  "/patient-intake": "clinical",
  "/aftercare": "clinical",
  "/tips": "tips_management",
  "/retail-products": "inventory_tracking",
  "/inventory": "inventory_tracking",
  "/consumption": "inventory_tracking",
  "/suppliers": "inventory_tracking",
  "/inventory/stock-take": "inventory_tracking",
  "/inventory/purchase-orders": "inventory_tracking",
  "/session-notes": "therapy_notes",
  "/progress-tracking": "therapy_notes",
  "/coverage-zones": "coverage_zones",
  "/field-operations": "coverage_zones",
  "/shop-orders": "shop_orders",
  "/seat-rental": "staff_commissions_payroll",
  "/commissions": "staff_commissions_payroll",
  "/payroll": "staff_commissions_payroll",
  "/whatsapp": "sms_reminders",
  "/referrals": "promotions_referrals",
  "/promotions": "promotions",
  "/marketing": "marketing",
  "/branding": "custom_branding",
  "/reconciliation": "pos_payments",
  "/price-lock": "pos_payments",
  "/booking-deposits": "booking_deposits",
  "/time-off": "staff_time_off",
  "/onboarding-checklist": "staff_onboarding",
  "/shift-swap": "staff_shift_swap",
  "/clients/merge": "crm",
  "/client-tags": "crm",
  "/client-photos": "crm",
  "/client-ownership": "crm",
  "/client-consultations": "consultation_history",
  "/client-patch-tests": "clinical",
  "/resources": "resource_booking",
};

const REMOVE_PATHS = new Set(["/payments-demo"]);
const REMOVE_FIELD_OPS = new Set(["nail_bar", "clinic", "therapy"]);

for (const mode of modes) {
  const file = join(root, `${mode}.json`);
  const nav = JSON.parse(readFileSync(file, "utf8"));
  nav.items = nav.items
    .filter((item) => {
      if (REMOVE_PATHS.has(item.path)) return false;
      if (REMOVE_FIELD_OPS.has(mode) && item.path === "/field-operations") return false;
      return true;
    })
    .map((item) => {
      const feat = PATH_FEATURES[item.path];
      if (!feat) return item;
      if (mode === "solo_pro" && item.path === "/my-earnings") {
        const { requiredFeature, ...rest } = item;
        return rest;
      }
      return { ...item, requiredFeature: feat };
    });
  writeFileSync(file, `${JSON.stringify(nav, null, 2)}\n`);
  console.log(`hardened ${mode}.json (${nav.items.length} items)`);
}
