"use client";

import type { QueryClient } from "@tanstack/react-query";
import { create } from "zustand";

import { api } from "@/lib/api-client";

type RealtimeEvent = { type: string; [key: string]: unknown };

interface RealtimeState {
  connected: boolean;
  orgId: string | null;
  connect: (orgId: string, queryClient: QueryClient) => void;
  disconnect: () => void;
}

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let activeQueryClient: QueryClient | null = null;
let activeOrgId: string | null = null;

const INVALIDATE_EVENTS = new Set(["booking.created", "queue.updated", "payment.completed", "chat.message"]);

function wsBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}`;
}

function invalidateForEvent(queryClient: QueryClient, orgId: string, eventType: string) {
  if (eventType === "booking.created" || eventType === "queue.updated") {
    queryClient.invalidateQueries({ queryKey: ["org", orgId, "bookings"] });
    queryClient.invalidateQueries({ queryKey: ["org", orgId, "waitlist"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }
  if (eventType === "payment.completed") {
    queryClient.invalidateQueries({ queryKey: ["org", orgId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }
  if (eventType === "chat.message") {
    queryClient.invalidateQueries({ queryKey: ["org", orgId, "staff-chat"] });
  }
}

async function openConnection(orgId: string, queryClient: QueryClient) {
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }

  try {
    const tokenResp = await api.post<{ token: string }>("/realtime/token", { channels: [] });
    const url = `${wsBaseUrl()}/api/v1/realtime/ws?token=${encodeURIComponent(tokenResp.token)}`;
    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
      useRealtimeStore.setState({ connected: true, orgId });
    };

    socket.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as RealtimeEvent;
        if (payload.type && INVALIDATE_EVENTS.has(payload.type)) {
          invalidateForEvent(queryClient, orgId, payload.type);
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    socket.onclose = () => {
      useRealtimeStore.setState({ connected: false });
      ws = null;
      if (activeOrgId === orgId && activeQueryClient) {
        reconnectTimer = setTimeout(() => {
          if (activeOrgId === orgId && activeQueryClient) {
            void openConnection(orgId, activeQueryClient);
          }
        }, 5000);
      }
    };

    socket.onerror = () => {
      socket.close();
    };
  } catch {
    useRealtimeStore.setState({ connected: false });
    if (activeOrgId === orgId && activeQueryClient) {
      reconnectTimer = setTimeout(() => {
        void openConnection(orgId, activeQueryClient!);
      }, 10000);
    }
  }
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connected: false,
  orgId: null,
  connect: (orgId, queryClient) => {
    if (activeOrgId === orgId && ws?.readyState === WebSocket.OPEN) return;
    activeOrgId = orgId;
    activeQueryClient = queryClient;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    void openConnection(orgId, queryClient);
    set({ orgId });
  },
  disconnect: () => {
    activeOrgId = null;
    activeQueryClient = null;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    set({ connected: false, orgId: null });
  },
}));
