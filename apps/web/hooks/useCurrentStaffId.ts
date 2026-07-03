"use client";

import { useAuth } from "@/hooks/useAuth";

/** Resolved staff profile id for the signed-in user in the active org. */
export function useCurrentStaffId(): string | null {
  const { me } = useAuth();
  const staffId = (me as { staffId?: string | null } | undefined)?.staffId;
  return staffId ?? null;
}
