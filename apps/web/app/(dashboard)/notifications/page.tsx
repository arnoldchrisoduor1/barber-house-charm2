"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { inboxConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={inboxConfig} />;
}
