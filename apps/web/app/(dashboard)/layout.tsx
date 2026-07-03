"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useOrgRealtime } from "@/hooks/useOrgRealtime";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, roles } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useOrgRealtime();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    const isClient = roles.some((role) => role === "customer" || role === "client");
    if (pathname === "/dashboard" && isClient) {
      router.replace("/portal");
    }
  }, [isLoading, isAuthenticated, roles, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      </div>
    );
  }

  return <>{children}</>;
}
