"use client";

import { FormEvent, useEffect, useState } from "react";
import { User } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { readPortalCustomerPhone, usePortalCustomerStore } from "@/lib/store/portal-customer-store";

export default function PortalProfilePage() {
  const { me } = useAuth();
  const storePhone = usePortalCustomerStore((s) => s.phone);
  const storeName = usePortalCustomerStore((s) => s.fullName);
  const setContact = usePortalCustomerStore((s) => s.setContact);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailReminders, setEmailReminders] = useState(true);
  const [smsReminders, setSmsReminders] = useState(true);

  useEffect(() => {
    setFullName(storeName ?? me?.user?.fullName ?? "");
    setPhone(storePhone ?? readPortalCustomerPhone() ?? "");
  }, [storeName, storePhone, me]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !fullName.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setContact(phone.trim(), fullName.trim());
    toast.success("Profile saved");
  }

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-lg space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Contact details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit} data-testid="portal-profile-form">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2547XXXXXXXX"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Used to match your bookings and loyalty account.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Account email</Label>
                <Input id="profile-email" value={me?.user?.email ?? ""} disabled />
              </div>
              <Button type="submit">Save profile</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Notification preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={emailReminders}
                onChange={(e) => setEmailReminders(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Email appointment reminders
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={smsReminders}
                onChange={(e) => setSmsReminders(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              SMS appointment reminders
            </label>
            <p className="text-xs text-muted-foreground">
              Preferences are stored locally until connected to your org notification settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
