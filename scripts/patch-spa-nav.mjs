import fs from "node:fs";

const path = "packages/contracts/domain/nav/spa.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));

data.items = data.items.filter((i) => !["/payments-demo", "/field-operations"].includes(i.path));

const gateMap = {
  "/loyalty": "loyalty",
  "/packages": "marketing",
  "/gift-cards": "marketing",
  "/marketing": "marketing",
  "/promotions": "promotions",
  "/referrals": "referrals",
  "/whatsapp": "sms_reminders",
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
  "/inventory": "inventory_tracking",
  "/consumption": "inventory_tracking",
  "/suppliers": "inventory_tracking",
  "/reconciliation": "inventory_tracking",
  "/payroll": "payroll",
  "/resources": "resource_booking",
  "/session-notes": "therapy_notes",
  "/progress-tracking": "therapy_notes",
  "/aftercare": "clinical",
  "/waitlist": "bookings",
};

for (const item of data.items) {
  if (item.path === "/seat-rental") item.requiredFeature = "staff_commissions_payroll";
  if (gateMap[item.path]) item.requiredFeature = gateMap[item.path];
}

const newItems = [
  { icon: "Wallet", label: "Booking Deposits", path: "/booking-deposits", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "booking_deposits" },
  { icon: "CalendarX", label: "Therapist Time Off", path: "/time-off", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "staff_time_off" },
  { icon: "Rocket", label: "Onboarding Checklist", path: "/onboarding-checklist", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "staff_onboarding" },
  { icon: "ArrowLeftRight", label: "Shift Swap", path: "/shift-swap", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "staff_shift_swap" },
  { icon: "Merge", label: "Merge Guests", path: "/clients/merge", section: "Executive", roles: ["ceo", "director"], requiredFeature: "crm" },
  { icon: "Tag", label: "Guest Tags", path: "/client-tags", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "crm" },
  { icon: "Camera", label: "Guest Photos", path: "/client-photos", section: "Executive", roles: ["ceo", "director", "branch_manager"], requiredFeature: "crm" },
  { icon: "UserCheck", label: "Guest Ownership", path: "/client-ownership", section: "Executive", roles: ["ceo", "director"], requiredFeature: "crm" },
  { icon: "Banknote", label: "Payroll", path: "/payroll", section: "Executive", roles: ["ceo", "director"], requiredFeature: "payroll" },
  { icon: "Phone", label: "Walk-in Queue", path: "/queue", section: "Spa Floor", roles: ["branch_manager"], requiredFeature: "queue" },
  { icon: "ClipboardList", label: "Waitlist", path: "/waitlist", section: "Spa Floor", roles: ["branch_manager"], requiredFeature: "bookings" },
  { icon: "ShoppingCart", label: "POS", path: "/pos", section: "Spa Floor", roles: ["branch_manager"], requiredFeature: "pos_payments" },
  { icon: "DollarSign", label: "Finance", path: "/finance", section: "Spa Floor", roles: ["branch_manager"] },
  { icon: "Users", label: "Therapists", path: "/staff", section: "Spa Floor", roles: ["branch_manager"] },
  { icon: "Phone", label: "Walk-in Queue", path: "/queue", section: "Front Desk", roles: ["receptionist"], requiredFeature: "queue" },
  { icon: "ClipboardList", label: "Waitlist", path: "/waitlist", section: "Front Desk", roles: ["receptionist"], requiredFeature: "bookings" },
  { icon: "QrCode", label: "QR Clock", path: "/qr-clock", section: "Front Desk", roles: ["receptionist"], requiredFeature: "qr_clock" },
  { icon: "Receipt", label: "Open Tabs", path: "/pos/tabs", section: "Front Desk", roles: ["receptionist"], requiredFeature: "pos_payments" },
  { icon: "QrCode", label: "QR Clock", path: "/qr-clock", section: "My Room", roles: ["senior_barber", "junior_barber"], requiredFeature: "qr_clock" },
  { icon: "CalendarX", label: "Time Off", path: "/time-off", section: "My Room", roles: ["senior_barber", "junior_barber"], requiredFeature: "staff_time_off" },
  { icon: "Camera", label: "Ambience Gallery", path: "/gallery", section: "My Room", roles: ["senior_barber", "junior_barber"] },
  { icon: "FileText", label: "Session Notes", path: "/session-notes", section: "My Room", roles: ["senior_barber", "junior_barber"], requiredFeature: "therapy_notes" },
  { icon: "TrendingUp", label: "Progress Tracking", path: "/progress-tracking", section: "My Room", roles: ["senior_barber", "junior_barber"], requiredFeature: "therapy_notes" },
  { icon: "Package", label: "Inventory", path: "/inventory", section: "Sales", roles: ["ceo", "director"], requiredFeature: "inventory_tracking" },
  { icon: "FlaskConical", label: "Consumption", path: "/consumption", section: "Sales", roles: ["ceo", "director"], requiredFeature: "inventory_tracking" },
  { icon: "Truck", label: "Suppliers", path: "/suppliers", section: "Sales", roles: ["ceo", "director"], requiredFeature: "inventory_tracking" },
  { icon: "ClipboardList", label: "Stock Take", path: "/inventory/stock-take", section: "Sales", roles: ["ceo", "director"], requiredFeature: "inventory_tracking" },
  { icon: "Truck", label: "Purchase Orders", path: "/inventory/purchase-orders", section: "Sales", roles: ["ceo", "director"], requiredFeature: "inventory_tracking" },
  { icon: "Scale", label: "Reconciliation", path: "/reconciliation", section: "Sales", roles: ["ceo", "director"], requiredFeature: "inventory_tracking" },
  { icon: "Megaphone", label: "Marketing", path: "/marketing", section: "Guest Experience", roles: ["ceo", "director", "branch_manager"], requiredFeature: "marketing" },
  { icon: "Tag", label: "Promotions", path: "/promotions", section: "Guest Experience", roles: ["ceo", "director", "branch_manager"], requiredFeature: "promotions" },
  { icon: "Users", label: "Referrals", path: "/referrals", section: "Guest Experience", roles: ["ceo", "director", "branch_manager"], requiredFeature: "referrals" },
  { icon: "MessageCircle", label: "WhatsApp", path: "/whatsapp", section: "Guest Experience", roles: ["ceo", "director", "branch_manager"], requiredFeature: "sms_reminders" },
  { icon: "Heart", label: "Aftercare", path: "/aftercare", section: "Guest Experience", roles: ["ceo", "director", "branch_manager"], requiredFeature: "clinical" },
  { icon: "Armchair", label: "Treatment Rooms", path: "/resources", section: "Operations", roles: ["ceo", "director", "branch_manager"], requiredFeature: "resource_booking" },
  { icon: "FileText", label: "Session Notes", path: "/session-notes", section: "Treatments", roles: ["ceo", "director"], requiredFeature: "therapy_notes" },
  { icon: "TrendingUp", label: "Progress Tracking", path: "/progress-tracking", section: "Treatments", roles: ["ceo", "director"], requiredFeature: "therapy_notes" },
];

for (const ni of newItems) {
  const exists = data.items.some(
    (i) => i.path === ni.path && i.section === ni.section && JSON.stringify(i.roles ?? []) === JSON.stringify(ni.roles ?? []),
  );
  if (!exists) data.items.push(ni);
}

fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
console.log(`spa.json updated: ${data.items.length} items`);
