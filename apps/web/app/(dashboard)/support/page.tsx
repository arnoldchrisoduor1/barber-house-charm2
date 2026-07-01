"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { enquiriesConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={enquiriesConfig} />;
}
