"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useFeature(featureKey: string): boolean {
  const { features } = useAuth();
  return useMemo(() => features.includes(featureKey), [features, featureKey]);
}

export function useFeatureSet(): Set<string> {
  const { features } = useAuth();
  return useMemo(() => new Set(features), [features]);
}
