"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { promotionsConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={promotionsConfig} />;
}
