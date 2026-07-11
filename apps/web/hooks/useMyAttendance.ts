"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";

export type MyAttendance = {
  staff_id: string;
  display_name: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
};

export function useMyAttendance(date?: string) {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const day = date ?? new Date().toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["qr-my-attendance", orgId, day],
    enabled: Boolean(orgId),
    queryFn: () =>
      api.get<MyAttendance>(`/organizations/${orgId}/qr/my-attendance`, { params: { date: day } }),
    retry: false,
  });
}
