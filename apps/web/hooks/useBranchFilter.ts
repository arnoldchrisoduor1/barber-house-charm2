"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";
import { branchQueryParam, useBranchStore, type BranchOption } from "@/lib/store/branch-store";

const BRANCH_FILTER_ROLES = new Set(["ceo", "director", "branch_manager"]);

export function useBranchFilter() {
  const { activeOrg, roles } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useBranchStore((s) => s.setActiveBranchId);
  const setBranches = useBranchStore((s) => s.setBranches);
  const branches = useBranchStore((s) => s.branches);

  const canFilter = roles.some((role) => BRANCH_FILTER_ROLES.has(role));

  const branchesQuery = useQuery({
    queryKey: ["branches", orgId],
    enabled: !!orgId && canFilter,
    queryFn: async () => {
      const rows = await api.get<Record<string, unknown>[] | { data: Record<string, unknown>[] }>(
        `/organizations/${orgId}/branches`,
      );
      const list = Array.isArray(rows) ? rows : (rows.data ?? []);
      return list.map(
        (row): BranchOption => ({
          id: String(pickRowField(row, "id") ?? ""),
          name: String(pickRowField(row, "name") ?? "Branch"),
          address: pickRowField(row, "address") ? String(pickRowField(row, "address")) : undefined,
        }),
      );
    },
  });

  useEffect(() => {
    if (branchesQuery.data) {
      setBranches(branchesQuery.data);
    }
  }, [branchesQuery.data, setBranches]);

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === activeBranchId) ?? null,
    [branches, activeBranchId],
  );

  const apiParams = useMemo(() => branchQueryParam(canFilter ? activeBranchId : null), [canFilter, activeBranchId]);

  return {
    canFilter,
    branches,
    activeBranchId,
    activeBranch,
    setActiveBranchId,
    apiParams,
    isLoading: branchesQuery.isLoading,
  };
}
