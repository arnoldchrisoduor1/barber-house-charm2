"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { consentFormsConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={consentFormsConfig} />;
}
