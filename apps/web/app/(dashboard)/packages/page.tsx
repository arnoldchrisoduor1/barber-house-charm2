"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { packagesConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={packagesConfig} />;
}
