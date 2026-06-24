"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useFeature } from "@/hooks/useFeature";
import { useAuth } from "@/hooks/useAuth";

interface FeatureProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Feature({ flag, children, fallback = null }: FeatureProps) {
  const enabled = useFeature(flag);
  if (enabled) return <>{children}</>;
  return <>{fallback}</>;
}

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const enabled = useFeature(feature);
  const { me } = useAuth();
  const plan = me?.subscription?.plan ?? "starter";

  if (enabled) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-foreground">Feature Locked</h2>
      <p className="max-w-md text-muted-foreground">
        This feature is not available on your current{" "}
        <span className="font-semibold capitalize text-foreground">{plan}</span> plan.
      </p>
      <Button asChild className="bg-gradient-gold text-primary-foreground font-semibold shadow-gold hover:opacity-90">
        <Link href="/select-plan">Upgrade Plan</Link>
      </Button>
    </div>
  );
}

export default Feature;
