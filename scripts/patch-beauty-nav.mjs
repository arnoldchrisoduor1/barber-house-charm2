import fs from "node:fs";

const path = "packages/contracts/domain/nav/beauty.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));

data.items = data.items.filter((i) => !["/payments-demo", "/field-operations"].includes(i.path));

const gateMap = {
  "/loyalty": "loyalty",
  "/packages": "marketing",
  "/gift-cards": "marketing",
  "/marketing": "marketing",
  "/tips": "tips_management",
  "/qr-attendance": "qr_clock",
  "/qr-clock": "qr_clock",
  "/reviews": "customer_reviews",
  "/my-earnings": "staff_commissions_payroll",
  "/scorecards": "advanced_analytics",
  "/call-centre": "advanced_analytics",
  "/revenue-forecast": "advanced_analytics",
  "/retail-products": "inventory_tracking",
  "/branches": "multi_branch",
  "/consent-forms": "clinical",
};

for (const item of data.items) {
  if (item.path === "/seat-rental") item.requiredFeature = "staff_commissions_payroll";
  if (gateMap[item.path]) item.requiredFeature = gateMap[item.path];
}

const newItems = [
  { icon: "Wallet", label: "Booking Deposits", path: "/booking-deposits", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "booking_deposits" },
  { icon: "CalendarX", label: "Stylist Time Off", path: "/time-off", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "staff_time_off" },
  { icon: "Rocket", label: "Onboarding Checklist", path: "/onboarding-checklist", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "staff_onboarding" },
  { icon: "ArrowLeftRight", label: "Shift Swap", path: "/shift-swap", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "staff_shift_swap" },
  { icon: "Merge", label: "Merge Clients", path: "/clients/merge", section: "Executive", roles: ["ceo", "director"], requiredFeature: "crm" },
  { icon: "Tag", label: "Client Tags", path: "/client-tags", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "crm" },
  { icon: "Camera", label: "Client Photos", path: "/client-photos", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "crm" },
  { icon: "Phone", label: "Walk-in Queue", path: "/queue", section: "Salon Floor", roles: ["branch_manager"], requiredFeature: "queue" },
  { icon: "ClipboardList", label: "Queue Manager", path: "/queue", section: "Reception", roles: ["receptionist"], requiredFeature: "queue" },
  { icon: "Receipt", label: "Open Tabs", path: "/pos/tabs", section: "Sales", roles: ["ceo", "director", "branch_manager", "receptionist"], requiredFeature: "pos_payments" },
  { icon: "ClipboardList", label: "Stock Take", path: "/inventory/stock-take", section: "Sales", roles: ["ceo", "director"], requiredFeature: "inventory_tracking" },
  { icon: "Truck", label: "Purchase Orders", path: "/inventory/purchase-orders", section: "Sales", roles: ["ceo", "director"], requiredFeature: "inventory_tracking" },
  { icon: "Camera", label: "Before & After Gallery", path: "/gallery", section: "My Station", roles: ["senior_barber", "junior_barber"] },
  { icon: "FileCheck", label: "Patch Tests", path: "/client-patch-tests", section: "Services", roles: ["ceo", "director", "branch_manager"], requiredFeature: "clinical" },
  { icon: "ClipboardList", label: "Consultation Notes", path: "/client-consultations", section: "Services", roles: ["ceo", "director", "branch_manager", "senior_barber"], requiredFeature: "consultation_history" },
];

for (const ni of newItems) {
  const exists = data.items.some(
    (i) => i.path === ni.path && i.section === ni.section && JSON.stringify(i.roles ?? []) === JSON.stringify(ni.roles ?? []),
  );
  if (!exists) data.items.push(ni);
}

fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
console.log(`beauty.json updated: ${data.items.length} items`);
