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
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
      <Select
        value={activeBranchId ?? "all"}
        onValueChange={(value) => setActiveBranchId(value === "all" ? null : value)}
      >
        <SelectTrigger
          className="h-9 w-[180px] text-xs sm:w-[220px] sm:text-sm"
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
