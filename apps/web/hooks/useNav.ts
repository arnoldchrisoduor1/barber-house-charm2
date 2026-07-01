"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { useFeatureSet } from "@/hooks/useFeature";
import { usePortalView } from "@/hooks/usePortalView";
import { CLIENT_PORTAL_NAV } from "@/lib/portal-view";
import { navByMode, resolveNavMode, type NavItem } from "@/lib/nav-manifest";

export interface NavSection {
  name: string;
  items: NavItem[];
}

export function useNav() {
  const { roles } = useAuth();
  const { effectiveRoles, activePortal, portalLabel } = usePortalView();
  const { mode: categoryMode } = useBusinessCategory();
  const features = useFeatureSet();
  const { me } = useAuth();

  const navMode = useMemo(() => {
    const subscriptionType = me?.subscription?.businessType ?? me?.activeOrg?.businessType;
    if (subscriptionType) return resolveNavMode(subscriptionType);
    if (categoryMode === "mixed") return "mixed";
    return categoryMode;
  }, [me, categoryMode]);

  const manifest = navByMode[navMode] ?? navByMode.barber;

  const items = useMemo(() => {
    const navRoles = effectiveRoles.length ? effectiveRoles : roles;
    const sourceItems: NavItem[] =
      activePortal === "client"
        ? CLIENT_PORTAL_NAV.map((item) => ({ ...item }))
        : manifest.items;

    return sourceItems.filter((item) => {
      if (item.roles?.length && !item.roles.some((role) => navRoles.includes(role))) {
        return false;
      }
      if (item.requiredFeature && !features.has(item.requiredFeature)) {
        return false;
      }
      return true;
    });
  }, [manifest.items, roles, effectiveRoles, features, activePortal]);

  const sections = useMemo<NavSection[]>(() => {
    const grouped = new Map<string, NavItem[]>();
    for (const item of items) {
      const list = grouped.get(item.section) ?? [];
      list.push(item);
      grouped.set(item.section, list);
    }
    return Array.from(grouped.entries()).map(([name, sectionItems]) => ({
      name,
      items: sectionItems,
    }));
  }, [items]);

  return {
    mode: navMode,
    items,
    sections,
    portalLabel,
    activePortal,
  };
}
