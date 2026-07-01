"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { referralsConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={referralsConfig} />;
}
