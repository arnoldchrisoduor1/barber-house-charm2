"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
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
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { useNav } from "@/hooks/useNav";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Calendar,
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
  const { sections } = useNav();
  const { me, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mesh-ambient" aria-hidden />
        <div className="relative z-10 flex flex-col h-full">
          <div className="border-b border-sidebar-border p-4">
            <p className="label-eyebrow">Haus of Wellness</p>
            <h1 className="font-display text-xl text-gradient-gold">{label}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{terms.dashboardSubtitle}</p>
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

          <div className="border-t border-sidebar-border p-4 space-y-2">
            <p className="truncate text-xs text-muted-foreground">{me?.user?.email}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="relative flex-1 overflow-auto">
        {title ? (
          <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
            <h2 className="font-heading text-lg font-semibold">{title}</h2>
          </header>
        ) : null}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export default AppShell;
