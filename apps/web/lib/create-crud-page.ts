/** Helper to generate thin CRUD page files — used during scaffolding only. */
export function crudPageImport(configExport: string) {
  return `"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { ${configExport} } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={${configExport}} />;
}
`;
}
