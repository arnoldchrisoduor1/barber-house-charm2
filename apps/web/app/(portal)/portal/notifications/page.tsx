"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PREFS_KEY = "haus-portal-notif-prefs";

interface NotifPrefs {
  email: boolean;
  sms: boolean;
  push: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  email: true,
  sms: true,
  push: false,
};

function readPrefs(): NotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: NotifPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

const TOGGLES: {
  key: keyof NotifPrefs;
  label: string;
  description: string;
  icon: typeof Mail;
}[] = [
  {
    key: "email",
    label: "Email notifications",
    description: "Booking confirmations, reminders, and receipts",
    icon: Mail,
  },
  {
    key: "sms",
    label: "SMS notifications",
    description: "Appointment reminders and day-of alerts",
    icon: MessageSquare,
  },
  {
    key: "push",
    label: "Push notifications",
    description: "Real-time updates in the mobile app (demo)",
    icon: Smartphone,
  },
];

export default function PortalNotificationsPage() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs());
    setHydrated(true);
  }, []);

  function toggle(key: keyof NotifPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    savePrefs(prefs);
    toast.success("Notification preferences saved");
  }

  return (
    <AppShell title="Notifications">
      <Card className="glass max-w-lg" data-testid="portal-notifications">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification preferences
          </CardTitle>
          <CardDescription>
            Choose how you&apos;d like to hear from us about bookings and offers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hydrated ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              {TOGGLES.map((item) => {
                const Icon = item.icon;
                return (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 transition hover:border-primary/30"
                  >
                    <input
                      type="checkbox"
                      checked={prefs[item.key]}
                      onChange={() => toggle(item.key)}
                      className="mt-1 h-4 w-4 rounded border-border"
                    />
                    <div className="flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <Icon className="h-4 w-4 text-primary" />
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </label>
                );
              })}
              <Button type="submit">Save preferences</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
