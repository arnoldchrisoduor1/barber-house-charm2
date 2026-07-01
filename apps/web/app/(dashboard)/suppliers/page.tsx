"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { suppliersConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={suppliersConfig} />;
}
