"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useOrgRealtime } from "@/hooks/useOrgRealtime";

function PortalRealtimeProvider({ children }: { children: ReactNode }) {
  useOrgRealtime();
  return <>{children}</>;
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, activeOrg } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!activeOrg?.id) {
      router.replace("/home");
    }
  }, [isLoading, isAuthenticated, activeOrg?.id, router]);

  if (isLoading || !isAuthenticated || !activeOrg?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading portal…</p>
      </div>
    );
  }

  return (
    <PortalRealtimeProvider>{children}</PortalRealtimeProvider>
  );
}
