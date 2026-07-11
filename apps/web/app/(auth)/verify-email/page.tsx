"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { getDefaultRoute } from "@/lib/role-redirect";
import { api, type MeResponse } from "@/lib/api-client";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyEmail, refreshMe } = useAuth();
  const token = searchParams.get("token") ?? "";
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        await verifyEmail(token);
        await refreshMe();
        const me = await api.get<MeResponse>("/me");
        router.replace(getDefaultRoute(me.roles ?? []));
      } catch {
        setError("This verification link is invalid or has expired.");
        router.replace("/login?verified=0");
      }
    })();
  }, [token, verifyEmail, refreshMe, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">
        {error ?? "Verifying your email…"}
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
