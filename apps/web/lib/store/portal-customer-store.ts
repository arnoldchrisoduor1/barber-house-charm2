"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PortalCustomerState {
  phone: string | null;
  fullName: string | null;
  setContact: (phone: string, fullName: string) => void;
}

export const usePortalCustomerStore = create<PortalCustomerState>()(
  persist(
    (set) => ({
      phone: null,
      fullName: null,
      setContact: (phone, fullName) => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("haus-portal-phone", phone);
          sessionStorage.setItem("haus-portal-name", fullName);
        }
        set({ phone, fullName });
      },
    }),
    { name: "haus-portal-customer" },
  ),
);

export function readPortalCustomerPhone(): string | null {
  if (typeof window === "undefined") return null;
  return (
    usePortalCustomerStore.getState().phone ??
    sessionStorage.getItem("haus-portal-phone")
  );
}
