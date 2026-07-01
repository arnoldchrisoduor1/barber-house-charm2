"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

const NAV = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#get-started" },
  { label: "Pricing", href: "#pricing" },
];

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-xl text-gradient-gold">
          Haus of Wellness
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-sm text-muted-foreground hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-gold text-primary-foreground">
            <Link href="/get-started">Get started</Link>
          </Button>
        </div>
        <button type="button" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-border px-4 py-4 md:hidden">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="block py-2 text-sm" onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <div className="mt-4 flex gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="flex-1 bg-gradient-gold text-primary-foreground">
              <Link href="/get-started">Get started</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
