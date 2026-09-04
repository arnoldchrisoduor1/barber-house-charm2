"use client";

import { Building2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranchFilter } from "@/hooks/useBranchFilter";

export function BranchSwitcher() {
  const { canFilter, branches, activeBranchId, setActiveBranchId, isLoading } = useBranchFilter();

  if (!canFilter) return null;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
      <Building2 className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
      <Select
        value={activeBranchId ?? "all"}
        onValueChange={(value) => setActiveBranchId(value === "all" ? null : value)}
      >
        <SelectTrigger
          className="h-11 w-full min-w-0 text-sm md:h-9 md:w-[180px] lg:w-[220px]"
          aria-label="Branch filter"
        >
          <SelectValue placeholder={isLoading ? "Loading branches…" : "All branches"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All branches</SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
