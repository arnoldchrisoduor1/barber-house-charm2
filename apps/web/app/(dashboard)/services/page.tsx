"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { servicesConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={servicesConfig} />;
}
