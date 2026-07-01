"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { staffConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={staffConfig} />;
}
