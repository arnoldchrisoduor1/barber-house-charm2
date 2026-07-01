"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, api, type MeResponse } from "@/lib/api-client";
import { getDefaultRoute } from "@/lib/role-redirect";

export default function LoginPage() {
  const router = useRouter();
  const { login, verify2FA, refreshMe } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [challengeToken, setChallengeToken] = useState("");
  const [otp, setOtp] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function finishLogin() {
    await refreshMe();
    const me = await api.get<MeResponse>("/me");
    router.push(getDefaultRoute(me.roles ?? []));
  }

  async function onCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const resp = await login(String(form.get("email")), String(form.get("password")));
      if (resp.requires2FA && resp.challengeToken) {
        setChallengeToken(resp.challengeToken);
        setStep("otp");
        return;
      }
      await finishLogin();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verify2FA(challengeToken, otp);
      await finishLogin();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid verification code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <div className="mesh-ambient" aria-hidden />
      <Card className="relative z-10 w-full max-w-md glass">
        <CardHeader>
          <CardTitle>{step === "otp" ? "Verify your email" : "Sign in"}</CardTitle>
          <CardDescription>
            {step === "otp"
              ? "Enter the 6-digit code sent to your email"
              : "Access your Haus of Wellness workspace"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form className="space-y-4" onSubmit={onCredentialsSubmit} noValidate>
              <fieldset className="space-y-4" disabled={!mounted || loading}>
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
                <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground">
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </fieldset>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onOtpSubmit}>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-primary-foreground">
                {loading ? "Verifying..." : "Verify & sign in"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("credentials")}>
                Back to sign in
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/get-started" className="text-primary hover:underline">
              Get started
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
