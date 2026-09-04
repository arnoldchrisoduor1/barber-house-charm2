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
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { HausSwitcher } from "@/components/HausSwitcher";
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

function SidebarInner({
  onNavigate,
  showSignOut,
}: {
  onNavigate?: () => void;
  showSignOut: boolean;
}) {
  const pathname = usePathname();
  const { label, terms } = useBusinessCategory();
  const { sections, portalLabel } = useNav();
  const { me, logout } = useAuth();

  return (
    <>
      <div className="mesh-ambient" aria-hidden />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="border-b border-sidebar-border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="label-eyebrow">Haus of Wellness</p>
              <h1 className="font-display text-xl text-gradient-gold">{label}</h1>
              <p className="mt-1 text-xs text-muted-foreground">{terms.dashboardSubtitle}</p>
              <p className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                {portalLabel} portal
              </p>
            </div>
            {onNavigate ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                onClick={onNavigate}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
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
                        onClick={onNavigate}
                        className={cn(
                          "nav-pill flex min-h-11 items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors md:min-h-0 md:py-2",
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

        {showSignOut ? (
          <div className="space-y-2 border-t border-sidebar-border p-4 lg:hidden">
            <p className="truncate text-xs text-muted-foreground">{me?.user?.email}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

export function AppShell({ children, title }: AppShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background" data-testid="app-shell">
      <aside
        className="relative hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
        data-testid="app-sidebar"
      >
        <SidebarInner showSignOut />
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" data-testid="app-mobile-nav">
          <button
            type="button"
            className="absolute inset-0 bg-black/80"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            className="relative flex h-full w-[min(16rem,85vw)] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
            data-testid="app-sidebar-mobile"
          >
            <SidebarInner showSignOut onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      ) : null}

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" data-testid="app-main">
        <header className="z-10 shrink-0 border-b border-border bg-background/80 px-3 py-3 backdrop-blur sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
                data-testid="app-mobile-nav-toggle"
              >
                <Menu className="h-5 w-5" />
              </Button>
              {title ? <h2 className="min-w-0 truncate font-heading text-lg font-semibold">{title}</h2> : null}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3 lg:ml-auto">
              <HausSwitcher />
              <BranchSwitcher />
              <PortalSwitcher />
              <ThemeToggle />
              <UserProfileMenu />
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6" data-testid="app-main-scroll">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppShell;
