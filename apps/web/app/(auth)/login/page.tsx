"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, api, type MeResponse } from "@/lib/api-client";
import { getDefaultRoute } from "@/lib/role-redirect";

export default function LoginPage() {
  const router = useRouter();
  const { login, refreshMe } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      await refreshMe();
      const me = await api.get<MeResponse>("/me");
      router.push(getDefaultRoute(me.roles ?? []));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <div className="mesh-ambient" aria-hidden />
      <Card className="relative z-10 w-full max-w-md glass">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your Haus of Wellness workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">Email</span>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">Password</span>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-primary-foreground">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
