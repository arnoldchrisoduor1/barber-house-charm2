"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { customersConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={customersConfig} />;
}
