"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await register({
        email: String(form.get("email")),
        password: String(form.get("password")),
        fullName: String(form.get("fullName")),
        organizationName: String(form.get("organizationName")),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <div className="mesh-ambient" aria-hidden />
      <Card className="relative z-10 w-full max-w-md glass">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Start your organization on Haus of Wellness</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">Full name</span>
              <input
                name="fullName"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">Organization name</span>
              <input
                name="organizationName"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
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
                minLength={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-primary-foreground">
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
