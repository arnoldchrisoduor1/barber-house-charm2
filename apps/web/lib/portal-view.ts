export type PortalView = "business" | "staff" | "client";

export const PORTAL_LABELS: Record<PortalView, string> = {
  business: "Business Owner",
  staff: "Staff",
  client: "Client",
};

export const PORTAL_DESCRIPTIONS: Record<PortalView, string> = {
  business: "Executive dashboard & operations",
  staff: "Day-to-day staff workspace",
  client: "Customer booking & loyalty portal",
};

export const PORTAL_HOME: Record<PortalView, string> = {
  business: "/dashboard",
  staff: "/dashboard",
  client: "/portal",
};

export const EXECUTIVE_ROLES = new Set(["ceo", "director"]);

const STAFF_PREVIEW_ROLE = "senior_barber";

export function canSwitchPortals(roles: string[]): boolean {
  return roles.some((role) => EXECUTIVE_ROLES.has(role));
}

export function availablePortals(roles: string[]): PortalView[] {
  if (canSwitchPortals(roles)) {
    return ["business", "staff", "client"];
  }
  if (roles.some((role) => role === "customer" || role === "client")) {
    return ["client"];
  }
  if (
    roles.some((role) =>
      ["senior_barber", "junior_barber", "receptionist", "branch_manager"].includes(role),
    )
  ) {
    return ["staff"];
  }
  return ["business"];
}

export function inferPortalFromPath(pathname: string): PortalView | null {
  if (pathname.startsWith("/portal")) return "client";
  if (pathname.startsWith("/admin")) return null;
  return null;
}

export function getEffectiveRoles(actualRoles: string[], portalView: PortalView): string[] {
  if (!canSwitchPortals(actualRoles)) return actualRoles;

  switch (portalView) {
    case "staff":
      return [STAFF_PREVIEW_ROLE];
    case "client":
      return ["customer"];
    default:
      return actualRoles;
  }
}

export const CLIENT_PORTAL_NAV = [
  { icon: "LayoutDashboard", label: "Home", path: "/portal", section: "My Portal" },
  { icon: "Calendar", label: "Book appointment", path: "/portal/book", section: "My Portal" },
  { icon: "Calendar", label: "My bookings", path: "/portal/bookings", section: "My Portal" },
  { icon: "CalendarClock", label: "Reschedule", path: "/portal/reschedule", section: "My Portal" },
  { icon: "Wallet", label: "Wallet", path: "/portal/wallet", section: "My Portal" },
  { icon: "Bell", label: "Notifications", path: "/portal/notifications", section: "My Portal" },
  { icon: "Crown", label: "Loyalty", path: "/portal/loyalty", section: "My Portal", requiredFeature: "loyalty" },
  { icon: "Star", label: "Reviews", path: "/portal/reviews", section: "My Portal", requiredFeature: "customer_reviews" },
  { icon: "Gift", label: "Referrals", path: "/portal/referrals", section: "My Portal", requiredFeature: "referrals" },
  { icon: "UserCircle", label: "Profile", path: "/portal/profile", section: "My Portal" },
] as const;
