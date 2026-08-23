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
  const rentalTitle =
    terms.stationSingular === "Treatment Room"
      ? "Room Rental"
      : terms.stationSingular === "Station"
        ? "Station Rental"
        : `${terms.stationSingular} Rental`;
  return {
    title: rentalTitle,
    feature: "staff_commissions_payroll",
    resource: "seat-rentals",
    fields: [
      { name: "seat_label", label: `${terms.stationSingular} label`, required: true },
      { name: "staff_id", label: `Assigned ${terms.staffSingular.toLowerCase()}` },
      { name: "monthly_rate_kes", label: "Monthly rent (KES)", type: "number" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    columns: [
      { key: "seat_label", header: terms.stationSingular },
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

export const NAIL_BAR_SERVICE_CATEGORIES = [
  "manicure",
  "pedicure",
  "gel_nails",
  "acrylic_nails",
  "nail_art",
  "dip_powder",
  "nail_repair",
  "nail_extensions",
  "shellac",
  "paraffin_wax",
] as const;

export const CLINIC_SERVICE_CATEGORIES = [
  "botox",
  "fillers",
  "chemical_peel",
  "microneedling",
  "laser",
  "skin_consultation",
  "prp",
  "thread_lift",
  "body_contouring",
  "iv_drip",
  "led_therapy",
  "hydrafacial",
] as const;

export const MOBILE_SERVICE_CATEGORIES = [
  "home_haircut",
  "home_styling",
  "home_makeup",
  "event_styling",
  "mobile_massage",
  "mobile_nails",
  "bridal_package",
  "group_booking",
] as const;

export const THERAPY_SERVICE_CATEGORIES = [
  "physiotherapy",
  "counselling",
  "occupational_therapy",
  "cbt",
  "sports_therapy",
  "rehabilitation",
  "pain_management",
  "stress_management",
  "mental_health",
  "couples_therapy",
  "child_therapy",
] as const;

export const SOLO_SERVICE_CATEGORIES = ["consultation", "service", "premium"] as const;

const MODE_SERVICE_CATEGORIES: Partial<Record<string, readonly string[]>> = {
  beauty: BEAUTY_SERVICE_CATEGORIES,
  spa: SPA_SERVICE_CATEGORIES,
  nail_bar: NAIL_BAR_SERVICE_CATEGORIES,
  clinic: CLINIC_SERVICE_CATEGORIES,
  mobile: MOBILE_SERVICE_CATEGORIES,
  therapy: THERAPY_SERVICE_CATEGORIES,
  solo_pro: SOLO_SERVICE_CATEGORIES,
};

function formatCategoryLabel(c: string) {
  return c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function buildServicesConfig(mode: string, terms: BusinessTerms): CrudModuleConfig {
  const isBeauty = mode === "beauty";
  const categories = MODE_SERVICE_CATEGORIES[mode];
  const categoryField = categories
    ? {
        name: "category",
        label: "Category",
        type: "select" as const,
        options: categories.map((c) => ({ value: c, label: formatCategoryLabel(c) })),
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

/** Phase 2 — clinical consent form type catalogs (UI primary source of truth also in consent-forms page). */
export const CLINIC_CONSENT_FORM_TYPES = [
  { value: "botox_liability", label: "Botox liability" },
  { value: "fillers_liability", label: "Fillers liability" },
  { value: "laser_liability", label: "Laser liability" },
  { value: "peel_liability", label: "Chemical peel liability" },
  { value: "general", label: "General treatment consent" },
] as const;

export const THERAPY_CONSENT_FORM_TYPES = [
  { value: "intake", label: "Intake consent" },
  { value: "medical", label: "Medical disclosure" },
  { value: "counselling", label: "Counselling agreement" },
  { value: "general", label: "General therapy consent" },
] as const;

export const NAILS_CONSENT_FORM_TYPES = [
  { value: "gel_allergy", label: "Gel allergy declaration" },
  { value: "acrylic_allergy", label: "Acrylic allergy declaration" },
  { value: "chemical_allergy", label: "Chemical allergy declaration" },
  { value: "general", label: "General nail consent" },
] as const;
