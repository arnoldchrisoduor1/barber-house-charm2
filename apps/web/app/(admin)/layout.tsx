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
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <p className="font-display text-lg text-gradient-gold">Platform Admin</p>
            <nav className="flex flex-wrap gap-1">
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
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
          <Button variant="outline" size="sm" onClick={() => logout()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
