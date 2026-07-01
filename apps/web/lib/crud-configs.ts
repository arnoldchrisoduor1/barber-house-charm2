import type { CrudModuleConfig } from "@/components/CrudModulePage";
import { pickRowField } from "@/lib/record-fields";

const num = (v: string) => (v === "" ? 0 : Number(v));

export const staffConfig: CrudModuleConfig = {
  title: "Staff",
  resource: "staff",
  fields: [
    { name: "display_name", label: "Name", required: true },
    { name: "title", label: "Title" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone" },
    {
      name: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "ceo", label: "CEO" },
        { value: "director", label: "Director" },
        { value: "branch_manager", label: "Branch Manager" },
        { value: "senior_barber", label: "Senior Barber" },
        { value: "junior_barber", label: "Junior Barber" },
        { value: "receptionist", label: "Receptionist" },
      ],
    },
    { name: "bio", label: "Bio", type: "textarea" },
    { name: "specialties", label: "Specialties (comma-separated)" },
    { name: "commission_rate", label: "Commission %", type: "number" },
  ],
  columns: [
    { key: "display_name", header: "Name" },
    { key: "role", header: "Role" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
  ],
  mapFormToBody: (v) => ({
    display_name: v.display_name,
    title: v.title,
    email: v.email,
    phone: v.phone,
    role: v.role || "junior_barber",
    bio: v.bio,
    specialties: v.specialties ? v.specialties.split(",").map((s) => s.trim()).filter(Boolean) : [],
    commission_rate: num(v.commission_rate),
  }),
};

export const servicesConfig: CrudModuleConfig = {
  title: "Services",
  feature: "bookings",
  resource: "services",
  fields: [
    { name: "name", label: "Service name", required: true },
    { name: "category", label: "Category" },
    { name: "duration_minutes", label: "Duration (min)", type: "number" },
    { name: "price_kes", label: "Price (KES)", type: "number" },
    { name: "description", label: "Description", type: "textarea" },
  ],
  columns: [
    { key: "name", header: "Service" },
    { key: "category", header: "Category" },
    { key: "duration_minutes", header: "Duration" },
    { key: "price_kes", header: "Price (KES)" },
  ],
  mapFormToBody: (v) => ({
    name: v.name,
    category: v.category,
    duration_minutes: num(v.duration_minutes) || 30,
    price_kes: num(v.price_kes),
    description: v.description,
  }),
};

export const customersConfig: CrudModuleConfig = {
  title: "Clients",
  feature: "crm",
  resource: "customers",
  fields: [
    { name: "full_name", label: "Full name", required: true },
    { name: "phone", label: "Phone", required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "style_preferences", label: "Preferences", type: "textarea" },
    { name: "notes", label: "Notes", type: "textarea" },
    { name: "loyalty_tier", label: "Loyalty tier" },
  ],
  columns: [
    { key: "full_name", header: "Name" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    { key: "loyalty_tier", header: "Tier" },
  ],
};

export const inventoryConfig: CrudModuleConfig = {
  title: "Inventory",
  feature: "inventory_tracking",
  resource: "inventory",
  fields: [
    { name: "name", label: "Item name", required: true },
    { name: "sku", label: "SKU" },
    { name: "category", label: "Category" },
    { name: "quantity", label: "Quantity", type: "number" },
    { name: "unit", label: "Unit" },
    { name: "reorder_level", label: "Reorder level", type: "number" },
    { name: "unit_cost_kes", label: "Unit cost (KES)", type: "number" },
  ],
  columns: [
    { key: "name", header: "Item" },
    { key: "sku", header: "SKU" },
    { key: "quantity", header: "Qty" },
    { key: "reorder_level", header: "Reorder" },
  ],
  mapFormToBody: (v) => ({
    name: v.name,
    sku: v.sku,
    category: v.category,
    quantity: num(v.quantity),
    unit: v.unit,
    reorder_level: num(v.reorder_level),
    unit_cost_kes: num(v.unit_cost_kes),
  }),
};

export const retailConfig: CrudModuleConfig = {
  title: "Retail Products",
  feature: "inventory_tracking",
  resource: "retail-products",
  fields: [
    { name: "name", label: "Product name", required: true },
    { name: "category", label: "Category" },
    { name: "price_kes", label: "Price (KES)", type: "number" },
    { name: "quantity", label: "Stock", type: "number" },
    { name: "description", label: "Description", type: "textarea" },
  ],
  columns: [
    { key: "name", header: "Product" },
    { key: "category", header: "Category" },
    { key: "price_kes", header: "Price" },
    { key: "quantity", header: "Stock" },
  ],
  mapFormToBody: (v) => ({
    name: v.name,
    category: v.category,
    price_kes: num(v.price_kes),
    quantity: num(v.quantity),
    description: v.description,
  }),
};

export const suppliersConfig: CrudModuleConfig = {
  title: "Suppliers",
  feature: "inventory_tracking",
  resource: "suppliers",
  fields: [
    { name: "name", label: "Supplier name", required: true },
    { name: "contact_name", label: "Contact" },
    { name: "phone", label: "Phone" },
    { name: "email", label: "Email", type: "email" },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
  columns: [
    { key: "name", header: "Supplier" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
  ],
};

export const consumptionConfig: CrudModuleConfig = {
  title: "Consumption",
  feature: "inventory_tracking",
  resource: "consumption-logs",
  fields: [
    { name: "quantity", label: "Qty used", type: "number" },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
  columns: [
    { key: "quantity", header: "Used" },
    { key: "unit", header: "Unit" },
    { key: "notes", header: "Notes" },
  ],
  mapFormToBody: (v) => ({
    quantity: num(v.quantity) || 1,
    notes: v.notes,
  }),
};

export const promotionsConfig: CrudModuleConfig = {
  title: "Promotions",
  feature: "promotions",
  resource: "promotions",
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "promo_code", label: "Promo code", required: true },
    { name: "discount_value", label: "Discount %", type: "number" },
    { name: "description", label: "Description", type: "textarea" },
  ],
  columns: [
    { key: "promo_code", header: "Code" },
    { key: "name", header: "Name" },
    { key: "discount_value", header: "Discount %" },
  ],
  mapFormToBody: (v) => ({
    name: v.name || v.promo_code,
    promo_code: v.promo_code,
    description: v.description,
    discount_value: num(v.discount_value) || 10,
    discount_type: "percent",
  }),
};

export const referralsConfig: CrudModuleConfig = {
  title: "Referrals",
  feature: "referrals",
  resource: "referrals",
  fields: [
    { name: "referrer_customer_id", label: "Referrer customer ID", required: true },
    { name: "referral_code", label: "Referral code", required: true },
    { name: "reward_kes", label: "Reward (KES)", type: "number" },
  ],
  columns: [
    { key: "referral_code", header: "Code" },
    { key: "status", header: "Status" },
    { key: "reward_kes", header: "Reward (KES)" },
  ],
  mapFormToBody: (v) => ({
    referrer_customer_id: v.referrer_customer_id,
    referral_code: v.referral_code,
    reward_kes: num(v.reward_kes),
  }),
};

export const loyaltyRewardsConfig: CrudModuleConfig = {
  title: "Loyalty Rewards",
  feature: "loyalty",
  resource: "loyalty-rewards",
  fields: [
    { name: "name", label: "Reward name", required: true },
    { name: "points_required", label: "Points required", type: "number" },
    { name: "description", label: "Description", type: "textarea" },
  ],
  columns: [
    { key: "name", header: "Reward" },
    { key: "points_required", header: "Points" },
  ],
  mapFormToBody: (v) => ({ ...v, points_required: num(v.points_required) }),
};

export const packagesConfig: CrudModuleConfig = {
  title: "Packages",
  feature: "marketing",
  resource: "service-packages",
  fields: [
    { name: "name", label: "Package name", required: true },
    { name: "price_kes", label: "Price (KES)", type: "number" },
    { name: "sessions_included", label: "Sessions", type: "number" },
    { name: "description", label: "Description", type: "textarea" },
  ],
  columns: [
    { key: "name", header: "Package" },
    { key: "price_kes", header: "Price" },
    { key: "sessions_included", header: "Sessions" },
  ],
  mapFormToBody: (v) => ({
    name: v.name,
    price_kes: num(v.price_kes),
    sessions_included: num(v.sessions_included),
    description: v.description,
  }),
};

export const giftCardsConfig: CrudModuleConfig = {
  title: "Gift Cards",
  feature: "marketing",
  resource: "gift-cards",
  fields: [
    { name: "code", label: "Code", required: true },
    { name: "initial_balance", label: "Balance (KES)", type: "number" },
    { name: "recipient_name", label: "Recipient" },
  ],
  columns: [
    { key: "code", header: "Code" },
    { key: "initial_balance", header: "Balance" },
    { key: "recipient_name", header: "Recipient" },
  ],
  mapFormToBody: (v) => ({
    code: v.code,
    initial_balance: num(v.initial_balance),
    recipient_name: v.recipient_name,
  }),
};

export const reviewsConfig: CrudModuleConfig = {
  title: "Reviews",
  feature: "marketing",
  resource: "reviews",
  fields: [
    { name: "customer_id", label: "Customer ID", required: true },
    { name: "rating", label: "Rating (1-5)", type: "number" },
    { name: "comment", label: "Comment", type: "textarea" },
  ],
  columns: [
    { key: "rating", header: "Rating" },
    { key: "comment", header: "Comment" },
  ],
  mapFormToBody: (v) => ({
    customer_id: v.customer_id,
    rating: num(v.rating) || 5,
    comment: v.comment,
  }),
};

export const marketingCampaignsConfig: CrudModuleConfig = {
  title: "Marketing Campaigns",
  feature: "marketing",
  resource: "marketing-campaigns",
  fields: [
    { name: "name", label: "Campaign name", required: true },
    {
      name: "channel",
      label: "Channel",
      type: "select",
      options: [
        { value: "sms", label: "SMS" },
        { value: "email", label: "Email" },
        { value: "whatsapp", label: "WhatsApp" },
      ],
    },
    { name: "segment", label: "Segment" },
    { name: "message", label: "Message", type: "textarea" },
    { name: "status", label: "Status" },
  ],
  columns: [
    { key: "name", header: "Campaign" },
    { key: "channel", header: "Channel" },
    { key: "status", header: "Status" },
  ],
};

export const galleryConfig: CrudModuleConfig = {
  title: "Gallery",
  resource: "gallery",
  fields: [
    { name: "title", label: "Title", required: true },
    { name: "image_url", label: "Image URL" },
    { name: "caption", label: "Caption", type: "textarea" },
  ],
  columns: [
    { key: "title", header: "Title" },
    { key: "caption", header: "Caption" },
  ],
};

export const consentFormsConfig: CrudModuleConfig = {
  title: "Consent Forms",
  feature: "clinical",
  resource: "consent-forms",
  fields: [
    { name: "title", label: "Form title", required: true },
    { name: "body", label: "Form body", type: "textarea" },
    { name: "version", label: "Version" },
  ],
  columns: [
    { key: "title", header: "Title" },
    { key: "version", header: "Version" },
  ],
};

export const seatRentalConfig: CrudModuleConfig = {
  title: "Seat Rental",
  feature: "staff_commissions_payroll",
  resource: "seat-rentals",
  fields: [
    { name: "seat_label", label: "Seat label", required: true },
    { name: "monthly_rate_kes", label: "Monthly rent (KES)", type: "number" },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
  columns: [
    { key: "seat_label", header: "Seat" },
    { key: "monthly_rate_kes", header: "Rent (KES)" },
  ],
  mapFormToBody: (v) => ({
    seat_label: v.seat_label,
    monthly_rate_kes: num(v.monthly_rate_kes),
    notes: v.notes,
  }),
};

export const enquiriesConfig: CrudModuleConfig = {
  title: "Support Enquiries",
  resource: "enquiries",
  fields: [
    { name: "subject", label: "Subject", required: true },
    { name: "message", label: "Message", type: "textarea", required: true },
    { name: "status", label: "Status" },
  ],
  columns: [
    { key: "subject", header: "Subject" },
    { key: "status", header: "Status" },
  ],
};

export const priceLocksConfig: CrudModuleConfig = {
  title: "Price Locks",
  feature: "inventory_tracking",
  resource: "price-locks",
  fields: [
    { name: "entity_type", label: "Entity type", required: true },
    { name: "entity_id", label: "Entity ID", required: true },
    { name: "locked_price_kes", label: "Locked price (KES)", type: "number" },
    { name: "reason", label: "Reason", type: "textarea" },
    { name: "expires_at", label: "Expires at (YYYY-MM-DD)" },
  ],
  columns: [
    { key: "entity_type", header: "Type" },
    { key: "entity_id", header: "Entity" },
    { key: "locked_price_kes", header: "Price (KES)" },
    {
      key: "is_active",
      header: "Active",
      render: (r) => (r.is_active ? "Yes" : "No"),
    },
  ],
  mapFormToBody: (v) => ({
    entity_type: v.entity_type,
    entity_id: v.entity_id,
    locked_price_kes: num(v.locked_price_kes),
    reason: v.reason,
    expires_at: v.expires_at || null,
    is_active: true,
  }),
};

export const inboxConfig: CrudModuleConfig = {
  title: "Notifications",
  resource: "inbox",
  fields: [
    { name: "title", label: "Title", required: true },
    { name: "body", label: "Body", type: "textarea", required: true },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "info", label: "Info" },
        { value: "alert", label: "Alert" },
        { value: "reminder", label: "Reminder" },
      ],
    },
  ],
  columns: [
    { key: "title", header: "Title" },
    { key: "type", header: "Type" },
    { key: "is_read", header: "Read", render: (r) => (pickRowField(r, "is_read") ? "Yes" : "No") },
  ],
  mapFormToBody: (v) => ({
    title: v.title,
    body: v.body,
    type: v.type || "info",
  }),
};
