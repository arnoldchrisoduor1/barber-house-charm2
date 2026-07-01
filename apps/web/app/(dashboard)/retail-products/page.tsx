"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { retailConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={retailConfig} />;
}
