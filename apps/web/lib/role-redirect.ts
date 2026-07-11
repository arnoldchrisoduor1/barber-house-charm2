const PORTAL_ROLES = new Set(["customer", "client"]);
const STAFF_ROLES = new Set([
  "ceo",
  "director",
  "branch_manager",
  "senior",
  "junior",
  "receptionist",
  "senior_barber",
  "junior_barber",
]);
const PLATFORM_ROLES = new Set(["platform_admin", "platform_support"]);

/** Resolve the default landing route from a user's role set. */
export function getDefaultRoute(roles: string[]): string {
  if (roles.some((role) => PLATFORM_ROLES.has(role))) return "/admin";
  if (roles.some((role) => PORTAL_ROLES.has(role))) return "/home";
  if (roles.some((role) => STAFF_ROLES.has(role))) return "/dashboard";
  return "/dashboard";
}
