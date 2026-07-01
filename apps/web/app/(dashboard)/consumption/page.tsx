"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { consumptionConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={consumptionConfig} />;
}
