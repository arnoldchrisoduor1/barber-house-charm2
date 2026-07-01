"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { loyaltyRewardsConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={loyaltyRewardsConfig} />;
}
