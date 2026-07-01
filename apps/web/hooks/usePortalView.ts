"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { useAuth } from "@/hooks/useAuth";
import {
  availablePortals,
  canSwitchPortals,
  getEffectiveRoles,
  inferPortalFromPath,
  PORTAL_HOME,
  PORTAL_LABELS,
  type PortalView,
} from "@/lib/portal-view";

interface PortalViewState {
  activePortal: PortalView;
  setActivePortal: (portal: PortalView) => void;
}

export const usePortalViewStore = create<PortalViewState>()(
  persist(
    (set) => ({
      activePortal: "business",
      setActivePortal: (activePortal) => set({ activePortal }),
    }),
    { name: "haus-portal-view" },
  ),
);

export function usePortalView() {
  const router = useRouter();
  const pathname = usePathname();
  const { roles } = useAuth();
  const activePortal = usePortalViewStore((s) => s.activePortal);
  const setActivePortal = usePortalViewStore((s) => s.setActivePortal);
  const explicitSwitchRef = useRef(false);

  const portals = useMemo(() => availablePortals(roles), [roles]);
  const switchable = canSwitchPortals(roles);

  useEffect(() => {
    if (explicitSwitchRef.current) {
      const target = PORTAL_HOME[activePortal];
      if (pathname === target || pathname.startsWith(`${target}/`)) {
        explicitSwitchRef.current = false;
      }
      return;
    }
    // Executives switch portals explicitly via the tab bar; path inference would
    // fight navigation (e.g. /portal → /dashboard while switching to staff preview).
    if (switchable) return;
    const inferred = inferPortalFromPath(pathname);
    if (inferred) {
      setActivePortal(inferred);
    }
  }, [pathname, activePortal, setActivePortal, switchable]);

  useEffect(() => {
    if (!portals.includes(activePortal)) {
      setActivePortal(portals[0] ?? "business");
    }
  }, [activePortal, portals, setActivePortal]);

  const effectiveRoles = useMemo(
    () => getEffectiveRoles(roles, activePortal),
    [roles, activePortal],
  );

  const switchPortal = useCallback(
    (portal: PortalView) => {
      if (!portals.includes(portal)) return;
      explicitSwitchRef.current = true;
      setActivePortal(portal);
      router.push(PORTAL_HOME[portal]);
    },
    [portals, router, setActivePortal],
  );

  return {
    activePortal,
    portalLabel: PORTAL_LABELS[activePortal],
    portals,
    switchable,
    effectiveRoles,
    switchPortal,
  };
}
