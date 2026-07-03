"use client";

import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useCurrentStaffId } from "@/hooks/useCurrentStaffId";
import { usePortalView } from "@/hooks/usePortalView";

const BARBER_SELF_ROLES = new Set(["senior_barber", "junior_barber"]);

/** True when nav is scoped to a single barber (my bookings / my schedule / my earnings). */
export function useStaffScope() {
  const { roles } = useAuth();
  const { effectiveRoles } = usePortalView();
  const staffId = useCurrentStaffId();

  const navRoles = effectiveRoles.length ? effectiveRoles : roles;
  const isStaffScoped = useMemo(
    () => navRoles.some((role) => BARBER_SELF_ROLES.has(role)),
    [navRoles],
  );

  return { staffId, isStaffScoped };
}
