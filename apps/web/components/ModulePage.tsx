"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import { FeatureGate } from "@/components/Feature";

interface ModulePageProps {
  title: string;
  feature?: string;
  description?: string;
  children: ReactNode;
}

export function ModulePage({ title, feature, description, children }: ModulePageProps) {
  const body = (
    <>
      {description ? <p className="mb-6 text-sm text-muted-foreground">{description}</p> : null}
      {children}
    </>
  );

  return (
    <AppShell title={title}>
      {feature ? <FeatureGate feature={feature}>{body}</FeatureGate> : body}
    </AppShell>
  );
}

export default ModulePage;
