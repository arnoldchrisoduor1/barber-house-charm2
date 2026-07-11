"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, api } from "@/lib/api-client";
import { getDefaultRoute } from "@/lib/role-redirect";
import type { MeResponse } from "@/lib/api-client";

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { acceptInvite, refreshMe } = useAuth();
  const token = searchParams.get("token") ?? "";
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [preview, setPreview] = useState<{ organization?: string; role?: string; email?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    void api
      .get<{ organization?: string; role?: string; email?: string }>(`/auth/invite-preview?token=${encodeURIComponent(token)}`)
      .then(setPreview)
      .catch(() => setError("This invite link is invalid or has expired."));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await acceptInvite({ token, password, fullName });
      await refreshMe();
      const me = await api.get<MeResponse>("/me");
      router.push(getDefaultRoute(me.roles ?? []));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not accept invite");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Card className="glass max-w-md">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Missing invite token. Ask your business owner to resend the invite.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass max-w-md">
      <CardHeader>
        <CardTitle>Accept staff invite</CardTitle>
        <CardDescription>
          {preview?.organization
            ? `Join ${preview.organization} as ${String(preview.role ?? "staff").replace(/_/g, " ")}`
            : "Complete your account to join your team"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          {preview?.email ? (
            <p className="text-sm text-muted-foreground">
              Email: <span className="font-medium text-foreground">{preview.email}</span>
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Full name</Label>
            <Input id="invite-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-password">Password</Label>
            <Input
              id="invite-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground" disabled={loading}>
            {loading ? "Creating account…" : "Accept invite"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Already have an account? Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <div className="mesh-ambient" aria-hidden />
      <Suspense fallback={<div>Loading…</div>}>
        <AcceptInviteForm />
      </Suspense>
    </div>
  );
}
