"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { marketingCampaignsConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={marketingCampaignsConfig} />;
}
