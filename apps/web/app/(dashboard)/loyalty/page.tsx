"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { loyaltyRewardsConfig } from "@/lib/crud-configs";

export default function Page() {
  const { mode } = useBusinessCategory();
  const title = mode === "therapy" ? "Client Retention" : loyaltyRewardsConfig.title;
  return <CrudModulePage config={{ ...loyaltyRewardsConfig, title }} />;
}
