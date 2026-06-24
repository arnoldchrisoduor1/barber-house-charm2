"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, apiClient } from "@/lib/api-client";

interface BookPageProps {
  params: { orgSlug: string };
}

export default function PublicBookPage({ params }: BookPageProps) {
  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await apiClient(`/organizations/public/${params.orgSlug}/bookings`, {
        method: "POST",
        body: {
          bookingDate,
          startTime,
          phone,
        },
      });
      setSuccess(true);
      setBookingDate("");
      setStartTime("");
      setPhone("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(null);
      } else {
        setError(err instanceof ApiError ? err.message : "Booking request failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen p-6">
      <div className="mesh-aurora" aria-hidden />
      <div className="relative z-10 mx-auto max-w-lg pt-16">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Book an appointment</CardTitle>
            <CardDescription>
              Public booking for{" "}
              <span className="font-mono-ui text-foreground">{params.orgSlug}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Date</span>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Time</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Phone</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+254…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>

              <div
                className="flex h-16 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-xs text-muted-foreground"
                aria-label="Cloudflare Turnstile placeholder"
              >
                Turnstile verification (placeholder)
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {success ? (
                <p className="text-sm text-primary">Booking request submitted successfully.</p>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-gold text-primary-foreground"
              >
                {loading ? "Submitting…" : "Request booking"}
              </Button>
            </form>
            <p className="mt-4 text-xs text-muted-foreground">
              Requires signed org token, Turnstile, and rate limiting on the backend when the public
              endpoint is live.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
