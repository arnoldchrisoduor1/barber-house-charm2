"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CalendarClock,
  Users,
  Scissors,
  UserCircle,
  Building2,
  Wallet,
  DollarSign,
  BarChart3,
  ShoppingCart,
  Package,
  Settings,
  Bell,
  Circle,
  Crown,
  Star,
  Gift,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PortalSwitcher } from "@/components/PortalSwitcher";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { useNav } from "@/hooks/useNav";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Calendar,
  CalendarClock,
  Users,
  Scissors,
  UserCircle,
  Building2,
  Wallet,
  DollarSign,
  BarChart3,
  ShoppingCart,
  Package,
  Settings,
  Bell,
  Crown,
  Star,
  Gift,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle;
}

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const pathname = usePathname();
  const { label, terms } = useBusinessCategory();
  const { sections, portalLabel } = useNav();
  const { me, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background" data-testid="app-shell">
      <aside
        className="relative flex h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
        data-testid="app-sidebar"
      >
        <div className="mesh-ambient" aria-hidden />
        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <div className="border-b border-sidebar-border p-4">
            <p className="label-eyebrow">Haus of Wellness</p>
            <h1 className="font-display text-xl text-gradient-gold">{label}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{terms.dashboardSubtitle}</p>
            <p className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {portalLabel} portal
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-4">
            {sections.map((section) => (
              <div key={section.name}>
                <p className="label-eyebrow mb-2 px-2">{section.name}</p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = resolveIcon(item.icon);
                    const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
                    return (
                      <li key={`${section.name}-${item.path}-${item.label}`}>
                        <Link
                          href={item.path}
                          data-active={active}
                          className={cn(
                            "nav-pill flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-sidebar-border p-4 space-y-2 lg:hidden">
            <p className="truncate text-xs text-muted-foreground">{me?.user?.email}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" data-testid="app-main">
        <header className="z-10 shrink-0 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              {title ? <h2 className="font-heading text-lg font-semibold truncate">{title}</h2> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:ml-auto">
              <BranchSwitcher />
              <PortalSwitcher />
              <ThemeToggle />
              <UserProfileMenu />
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-6" data-testid="app-main-scroll">{children}</div>
      </main>
    </div>
  );
}

export default AppShell;
