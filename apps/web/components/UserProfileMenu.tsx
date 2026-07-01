"use client";

import { ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePortalView } from "@/hooks/usePortalView";
import { cn } from "@/lib/utils";
import { PORTAL_DESCRIPTIONS } from "@/lib/portal-view";

function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return (email[0] ?? "U").toUpperCase();
}

export function UserProfileMenu() {
  const { me, logout, roles } = useAuth();
  const { activePortal, portalLabel } = usePortalView();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const name = me?.user?.fullName?.trim() || me?.user?.email || "User";
  const email = me?.user?.email ?? "";
  const roleLabel = roles[0]?.replace(/_/g, " ") ?? "member";

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2 transition-colors hover:bg-muted/60 sm:pr-3",
          open && "ring-2 ring-primary/30",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-aurora text-xs font-bold text-foreground">
          {initials(name, email)}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[140px] truncate text-sm font-medium leading-tight">{name}</span>
          <span className="block max-w-[140px] truncate text-[10px] capitalize text-muted-foreground">
            {portalLabel} portal
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-border bg-popover p-3 shadow-lg"
        >
          <div className="border-b border-border pb-3">
            <p className="font-medium text-foreground">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {portalLabel} portal
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                {roleLabel}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{PORTAL_DESCRIPTIONS[activePortal]}</p>
          </div>

          <div className="flex flex-col gap-1 pt-2">
            <Button variant="ghost" className="justify-start" asChild onClick={() => setOpen(false)}>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Account settings
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-destructive hover:text-destructive"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
