"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRoute } from "@/lib/role-redirect";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/features", label: "Features" },
  { href: "/admin/payouts", label: "Payouts" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, roles, logout } = useAuth();

  const isPlatform = roles.some(
    (role) => role === "platform_admin" || role === "platform_support",
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isPlatform) {
      router.replace(getDefaultRoute(roles));
    }
  }, [isLoading, isAuthenticated, isPlatform, roles, router]);

  if (isLoading || !isAuthenticated || !isPlatform) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading admin console…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-6 md:py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3 md:gap-6">
            <p className="font-display text-lg text-gradient-gold">Platform Admin</p>
            <nav className="flex w-full flex-wrap gap-1 sm:w-auto">
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm transition-colors md:min-h-0 md:py-1.5",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => logout()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
    </div>
  );
}
