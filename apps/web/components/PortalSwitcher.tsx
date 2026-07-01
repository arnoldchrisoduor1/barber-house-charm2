"use client";

import { Briefcase, Scissors, UserCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePortalView } from "@/hooks/usePortalView";
import { PORTAL_LABELS, type PortalView } from "@/lib/portal-view";

const PORTAL_ICONS: Record<PortalView, typeof Briefcase> = {
  business: Briefcase,
  staff: Scissors,
  client: UserCircle,
};

export function PortalSwitcher() {
  const { activePortal, portals, switchable, switchPortal } = usePortalView();

  if (!switchable || portals.length <= 1) return null;

  return (
    <div
      className="inline-flex items-center rounded-full border border-border bg-card p-1 gap-0.5"
      role="tablist"
      aria-label="Switch portal"
    >
      {portals.map((portal) => {
        const Icon = PORTAL_ICONS[portal];
        const selected = activePortal === portal;
        return (
          <button
            key={portal}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => switchPortal(portal)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{PORTAL_LABELS[portal]}</span>
          </button>
        );
      })}
    </div>
  );
}
