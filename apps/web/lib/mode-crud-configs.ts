import type { BusinessTerms } from "@/hooks/useBusinessCategory";
import type { CrudModuleConfig } from "@/components/CrudModulePage";

export function buildStaffConfig(terms: BusinessTerms): CrudModuleConfig {
  return {
    title: terms.staffPageTitle,
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
          { value: "senior_barber", label: terms.seniorStaff },
          { value: "junior_barber", label: terms.juniorStaff },
          { value: "receptionist", label: "Receptionist" },
        ],
      },
      { name: "bio", label: "Bio", type: "textarea" },
      { name: "specialties", label: "Specialties (comma-separated)", placeholder: terms.specialtiesPlaceholder },
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
      commission_rate: v.commission_rate === "" ? 0 : Number(v.commission_rate),
    }),
  };
}

export function buildSeatRentalConfig(terms: BusinessTerms): CrudModuleConfig {
  return {
    title: "Seat Rental",
    feature: "staff_commissions_payroll",
    resource: "seat-rentals",
    fields: [
      { name: "seat_label", label: "Seat label", required: true },
      { name: "staff_id", label: `Assigned ${terms.staffSingular.toLowerCase()}` },
      { name: "monthly_rate_kes", label: "Monthly rent (KES)", type: "number" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    columns: [
      { key: "seat_label", header: "Seat" },
      { key: "staff_id", header: terms.staffSingular },
      { key: "monthly_rate_kes", header: "Rent (KES)" },
    ],
    mapFormToBody: (v) => ({
      seat_label: v.seat_label,
      staff_id: v.staff_id || null,
      monthly_rate_kes: v.monthly_rate_kes === "" ? 0 : Number(v.monthly_rate_kes),
      notes: v.notes,
    }),
  };
}

export const BEAUTY_SERVICE_CATEGORIES = [
  "braids",
  "weaves",
  "nails",
  "makeup",
  "treatment",
  "colour",
  "facial",
  "waxing",
  "lashes",
  "skincare",
  "hair_treatment",
] as const;

export const SPA_SERVICE_CATEGORIES = [
  "swedish",
  "deep_tissue",
  "hot_stone",
  "aromatherapy",
  "massage",
  "body_treatment",
  "hydrotherapy",
  "reflexology",
  "sauna",
  "steam",
  "detox",
  "meditation",
  "yoga",
  "couples_package",
  "prenatal",
] as const;

export function buildServicesConfig(mode: string, terms: BusinessTerms): CrudModuleConfig {
  const isBeauty = mode === "beauty";
  const isSpa = mode === "spa";
  const categoryField =
    isBeauty || isSpa
      ? {
          name: "category",
          label: "Category",
          type: "select" as const,
          options: (isBeauty ? BEAUTY_SERVICE_CATEGORIES : SPA_SERVICE_CATEGORIES).map((c) => ({
            value: c,
            label: c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
          })),
        }
      : { name: "category", label: "Category" };

  return {
    title: terms.servicesPageTitle,
    feature: "bookings",
    resource: "services",
    fields: [
      { name: "name", label: "Service name", required: true },
      categoryField,
      { name: "duration_minutes", label: "Duration (min)", type: "number" },
      { name: "prep_minutes", label: "Prep buffer (min)", type: "number" },
      { name: "buffer_minutes", label: "Cleanup buffer (min)", type: "number" },
      ...(isBeauty
        ? [{ name: "requires_patch_test", label: "Requires patch test", type: "checkbox" as const, placeholder: "Chemical/colour services" }]
        : []),
      { name: "price_kes", label: "Price (KES)", type: "number" },
      { name: "description", label: "Description", type: "textarea" },
    ],
    columns: [
      { key: "name", header: "Name" },
      { key: "category", header: "Category" },
      { key: "duration_minutes", header: "Duration" },
      { key: "price_kes", header: "Price" },
    ],
    mapFormToBody: (v) => ({
      name: v.name,
      category: v.category,
      duration_minutes: v.duration_minutes === "" ? 30 : Number(v.duration_minutes),
      prep_minutes: v.prep_minutes === "" ? 0 : Number(v.prep_minutes),
      buffer_minutes: v.buffer_minutes === "" ? 0 : Number(v.buffer_minutes),
      price_kes: v.price_kes === "" ? 0 : Number(v.price_kes),
      description: v.description,
      ...(isBeauty ? { requires_patch_test: v.requires_patch_test === "true" } : {}),
    }),
  };
}

export function buildCustomersConfig(terms: BusinessTerms): CrudModuleConfig {
  return {
    title: terms.clientPlural,
    feature: "crm",
    resource: "customers",
    fields: [
      { name: "full_name", label: "Full name", required: true },
      { name: "phone", label: "Phone", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "style_preferences", label: "Preferences", type: "textarea", placeholder: terms.preferencesPlaceholder },
      { name: "has_allergies", label: "Has known allergies", type: "checkbox" },
      { name: "allergy_notes", label: "Allergy notes", type: "textarea" },
      { name: "notes", label: "Notes", type: "textarea" },
      { name: "loyalty_tier", label: "Loyalty tier" },
    ],
    columns: [
      { key: "full_name", header: "Name" },
      { key: "phone", header: "Phone" },
      { key: "email", header: "Email" },
      { key: "loyalty_tier", header: "Tier" },
    ],
    mapFormToBody: (v) => ({
      full_name: v.full_name,
      phone: v.phone,
      email: v.email,
      style_preferences: v.style_preferences,
      has_allergies: v.has_allergies === "true",
      allergy_notes: v.allergy_notes,
      notes: v.notes,
      loyalty_tier: v.loyalty_tier,
    }),
  };
}
