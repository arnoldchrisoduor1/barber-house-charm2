export type CrudFieldInput = {
  label: string;
  value: string;
  type?: "text" | "select";
  selectOption?: string;
};

export type CrudModuleTestDef = {
  path: string;
  prefix: string;
  createFields: (unique: string) => CrudFieldInput[];
  editFields?: (unique: string) => CrudFieldInput[];
  rowMatch: (unique: string) => string | RegExp;
};

export const CRUD_MANIFEST: CrudModuleTestDef[] = [
  {
    path: "/staff",
    prefix: "Staff",
    createFields: (u) => [{ label: "Name", value: u }],
    editFields: (u) => [{ label: "Title", value: `${u} Updated` }],
    rowMatch: (u) => u,
  },
  {
    path: "/clients",
    prefix: "Client",
    createFields: (u) => [
      { label: "Full name", value: u },
      { label: "Phone", value: "+254700111222" },
    ],
    editFields: (u) => [{ label: "Loyalty tier", value: "gold" }],
    rowMatch: (u) => u,
  },
  {
    path: "/services",
    prefix: "Service",
    createFields: (u) => [{ label: "Service name", value: u }],
    editFields: (u) => [{ label: "Duration (min)", value: "45" }],
    rowMatch: (u) => u,
  },
  {
    path: "/inventory",
    prefix: "Item",
    createFields: (u) => [{ label: "Item name", value: u }],
    editFields: (u) => [{ label: "Quantity", value: "10" }],
    rowMatch: (u) => u,
  },
  {
    path: "/retail-products",
    prefix: "Product",
    createFields: (u) => [{ label: "Product name", value: u }],
    editFields: (u) => [{ label: "Price (KES)", value: "2500" }],
    rowMatch: (u) => u,
  },
  {
    path: "/suppliers",
    prefix: "Supplier",
    createFields: (u) => [{ label: "Supplier name", value: u }],
    editFields: (u) => [{ label: "Phone", value: "+254711222333" }],
    rowMatch: (u) => u,
  },
  {
    path: "/consumption",
    prefix: "Consumption",
    createFields: (u) => [
      { label: "Qty used", value: "2" },
      { label: "Notes", value: u },
    ],
    rowMatch: (u) => u,
  },
  {
    path: "/price-lock",
    prefix: "PriceLock",
    createFields: (u) => [
      { label: "Entity type", value: "service" },
      { label: "Entity ID", value: "00000000-0000-4000-8000-000000000001" },
      { label: "Locked price (KES)", value: "1500" },
      { label: "Reason", value: u },
    ],
    rowMatch: () => /service/,
  },
  {
    path: "/promotions",
    prefix: "Promo",
    createFields: (u) => {
      const code = u.replace(/\s/g, "").slice(0, 12).toUpperCase();
      return [
        { label: "Name", value: u },
        { label: "Promo code", value: code },
      ];
    },
    editFields: () => [{ label: "Discount %", value: "15" }],
    rowMatch: (u) => u.replace(/\s/g, "").slice(0, 12).toUpperCase(),
  },
  {
    path: "/referrals",
    prefix: "Referral",
    createFields: (u) => [
      { label: "Referrer customer ID", value: "placeholder" },
      { label: "Referral code", value: u.replace(/\s/g, "").slice(0, 10).toUpperCase() },
    ],
    rowMatch: (u) => u.replace(/\s/g, "").slice(0, 10).toUpperCase(),
  },
  {
    path: "/loyalty",
    prefix: "Reward",
    createFields: (u) => [
      { label: "Reward name", value: u },
      { label: "Points required", value: "100" },
    ],
    rowMatch: (u) => u,
  },
  {
    path: "/packages",
    prefix: "Package",
    createFields: (u) => [
      { label: "Package name", value: u },
      { label: "Price (KES)", value: "5000" },
    ],
    rowMatch: (u) => u,
  },
  {
    path: "/gift-cards",
    prefix: "Gift",
    createFields: (u) => [
      { label: "Code", value: u.replace(/[^A-Z0-9]/gi, "").slice(0, 24).toUpperCase() },
      { label: "Balance (KES)", value: "1000" },
    ],
    rowMatch: (u) => u.replace(/[^A-Z0-9]/gi, "").slice(0, 24).toUpperCase(),
  },
  {
    path: "/reviews",
    prefix: "Review",
    createFields: (u) => [
      { label: "Customer ID", value: "placeholder" },
      { label: "Rating (1-5)", value: "5" },
      { label: "Comment", value: u },
    ],
    rowMatch: (u) => u,
  },
  {
    path: "/marketing",
    prefix: "Campaign",
    createFields: (u) => [{ label: "Campaign name", value: u }],
    editFields: () => [{ label: "Status", value: "draft" }],
    rowMatch: (u) => u,
  },
  {
    path: "/gallery",
    prefix: "Gallery",
    createFields: (u) => [{ label: "Title", value: u }],
    editFields: (u) => [{ label: "Caption", value: `${u} caption` }],
    rowMatch: (u) => u,
  },
  {
    path: "/consent-forms",
    prefix: "Consent",
    createFields: (u) => [{ label: "Form title", value: u }],
    editFields: () => [{ label: "Version", value: "1.1" }],
    rowMatch: (u) => u,
  },
  {
    path: "/seat-rental",
    prefix: "Seat",
    createFields: (u) => [
      { label: "Seat label", value: u },
      { label: "Monthly rent (KES)", value: "15000" },
    ],
    rowMatch: (u) => u,
  },
  {
    path: "/support",
    prefix: "Enquiry",
    createFields: (u) => [
      { label: "Subject", value: u },
      { label: "Message", value: `${u} message body` },
    ],
    rowMatch: (u) => u,
  },
  {
    path: "/notifications",
    prefix: "Notice",
    createFields: (u) => [
      { label: "Title", value: u },
      { label: "Body", value: `${u} body` },
    ],
    rowMatch: (u) => u,
  },
];
