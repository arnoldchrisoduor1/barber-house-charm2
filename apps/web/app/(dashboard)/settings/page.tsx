"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ModulePage } from "@/components/ModulePage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { api, apiClient } from "@/lib/api-client";

type Tab = "profile" | "password" | "security" | "theme" | "notifications";

type NotificationSettings = {
  email_reminders?: boolean;
  sms_reminders?: boolean;
  whatsapp_reminders?: boolean;
  marketing_emails?: boolean;
  booking_confirmations?: boolean;
  emailReminders?: boolean;
  smsReminders?: boolean;
  whatsappReminders?: boolean;
  marketingEmails?: boolean;
  bookingConfirmations?: boolean;
};

function pickBool(data: NotificationSettings, snake: keyof NotificationSettings, camel: keyof NotificationSettings) {
  const v = data[snake] ?? data[camel];
  return Boolean(v);
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const { me, activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();

  const [otp, setOtp] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [setupSent, setSetupSent] = useState(false);

  const [emailReminders, setEmailReminders] = useState(true);
  const [smsReminders, setSmsReminders] = useState(true);
  const [whatsappReminders, setWhatsappReminders] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [bookingConfirmations, setBookingConfirmations] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: twoFAStatus } = useQuery({
    queryKey: ["2fa-status"],
    queryFn: () => api.get<{ enabled: boolean }>("/auth/2fa/status"),
  });

  useEffect(() => {
    if (twoFAStatus) setTwoFAEnabled(twoFAStatus.enabled);
  }, [twoFAStatus]);

  const { data: notifSettings, isLoading: notifLoading } = useQuery({
    queryKey: ["org", orgId, "notification-settings"],
    enabled: Boolean(orgId),
    queryFn: () => apiClient<NotificationSettings>(`/organizations/${orgId}/notification-settings`),
  });

  useEffect(() => {
    if (!notifSettings) return;
    setEmailReminders(pickBool(notifSettings, "email_reminders", "emailReminders"));
    setSmsReminders(pickBool(notifSettings, "sms_reminders", "smsReminders"));
    setWhatsappReminders(pickBool(notifSettings, "whatsapp_reminders", "whatsappReminders"));
    setMarketingEmails(pickBool(notifSettings, "marketing_emails", "marketingEmails"));
    setBookingConfirmations(
      pickBool(notifSettings, "booking_confirmations", "bookingConfirmations"),
    );
  }, [notifSettings]);

  const setup2FA = useMutation({
    mutationFn: () => api.post("/auth/2fa/setup"),
    onSuccess: () => {
      setSetupSent(true);
      toast.success("Verification code sent");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Setup failed"),
  });

  const verify2FA = useMutation({
    mutationFn: () => api.post("/auth/2fa/verify", { otp }),
    onSuccess: () => {
      setTwoFAEnabled(true);
      setSetupSent(false);
      setOtp("");
      qc.invalidateQueries({ queryKey: ["2fa-status"] });
      toast.success("Two-factor authentication enabled");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Verification failed"),
  });

  const disable2FA = useMutation({
    mutationFn: () => api.post("/auth/2fa/disable", { otp }),
    onSuccess: () => {
      setTwoFAEnabled(false);
      setOtp("");
      qc.invalidateQueries({ queryKey: ["2fa-status"] });
      toast.success("Two-factor authentication disabled");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Disable failed"),
  });

  const saveNotifications = useMutation({
    mutationFn: () =>
      apiClient(`/organizations/${orgId}/notification-settings`, {
        method: "PUT",
        body: JSON.stringify({
          email_reminders: emailReminders,
          sms_reminders: smsReminders,
          whatsapp_reminders: whatsappReminders,
          marketing_emails: marketingEmails,
          booking_confirmations: bookingConfirmations,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "notification-settings"] });
      toast.success("Notification settings saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Password change failed"),
  });

  function onNotifSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    saveNotifications.mutate();
  }

  function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    changePassword.mutate();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "password", label: "Password" },
    { id: "security", label: "Security" },
    { id: "theme", label: "Theme" },
    { id: "notifications", label: "Notifications" },
  ];

  return (
    <ModulePage title="Settings" description="Manage your account and organization preferences.">
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            type="button"
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "profile" ? (
        <Card className="glass max-w-lg">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{me?.user?.fullName ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{me?.user?.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Organization</p>
              <p className="font-medium">{activeOrg?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Plan</p>
              <p className="font-medium capitalize">{me?.subscription?.plan ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "password" ? (
        <Card className="glass max-w-lg">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onPasswordSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={changePassword.isPending}>
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {tab === "security" ? (
        <Card className="glass max-w-lg">
          <CardHeader>
            <CardTitle>Two-factor authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {twoFAEnabled
                ? "Two-factor authentication is enabled on your account."
                : "Add an extra layer of security with email OTP verification."}
            </p>
            {!twoFAEnabled ? (
              <>
                {!setupSent ? (
                  <Button
                    type="button"
                    onClick={() => setup2FA.mutate()}
                    disabled={setup2FA.isPending || setupSent}
                    data-testid="enable-2fa-btn"
                  >
                    Enable 2FA
                  </Button>
                ) : (
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      verify2FA.mutate();
                    }}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="otp-verify">Verification code</Label>
                      <Input
                        id="otp-verify"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter OTP"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={verify2FA.isPending}>
                      Verify and enable
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  disable2FA.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="otp-disable">Verification code</Label>
                  <Input
                    id="otp-disable"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP to disable"
                    required
                  />
                </div>
                <Button type="submit" variant="destructive" disabled={disable2FA.isPending}>
                  Disable 2FA
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "theme" ? (
        <Card className="glass max-w-lg">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Toggle light / dark mode</p>
            <ThemeToggle />
          </CardContent>
        </Card>
      ) : null}

      {tab === "notifications" ? (
        <Card className="glass max-w-lg">
          <CardHeader>
            <CardTitle>Notification preferences</CardTitle>
          </CardHeader>
          <CardContent>
            {notifLoading ? <p className="text-muted-foreground">Loading…</p> : null}
            <form className="space-y-4" onSubmit={onNotifSubmit}>
              {[
                { id: "email", label: "Email reminders", checked: emailReminders, set: setEmailReminders },
                { id: "sms", label: "SMS reminders", checked: smsReminders, set: setSmsReminders },
                {
                  id: "whatsapp",
                  label: "WhatsApp reminders",
                  checked: whatsappReminders,
                  set: setWhatsappReminders,
                },
                {
                  id: "marketing",
                  label: "Marketing emails",
                  checked: marketingEmails,
                  set: setMarketingEmails,
                },
                {
                  id: "booking",
                  label: "Booking confirmations",
                  checked: bookingConfirmations,
                  set: setBookingConfirmations,
                },
              ].map((item) => (
                <label key={item.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.set(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  {item.label}
                </label>
              ))}
              <Button type="submit" disabled={!orgId || saveNotifications.isPending}>
                Save preferences
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </ModulePage>
  );
}
