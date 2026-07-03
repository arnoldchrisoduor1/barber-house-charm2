"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { useRealtimeStore } from "@/lib/store/realtime-store";

/** Connect org-scoped WebSocket and invalidate React Query on realtime events. */
export function useOrgRealtime() {
  const { activeOrg, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const connect = useRealtimeStore((s) => s.connect);
  const disconnect = useRealtimeStore((s) => s.disconnect);

  useEffect(() => {
    const orgId = activeOrg?.id;
    if (!isAuthenticated || !orgId) {
      disconnect();
      return;
    }
    connect(orgId, queryClient);
    return () => disconnect();
  }, [activeOrg?.id, isAuthenticated, connect, disconnect, queryClient]);
}
