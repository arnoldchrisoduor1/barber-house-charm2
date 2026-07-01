"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BranchOption {
  id: string;
  name: string;
  address?: string;
}

interface BranchState {
  activeBranchId: string | null;
  branches: BranchOption[];
  setActiveBranchId: (id: string | null) => void;
  setBranches: (branches: BranchOption[]) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      activeBranchId: null,
      branches: [],
      setActiveBranchId: (activeBranchId) => set({ activeBranchId }),
      setBranches: (branches) => set({ branches }),
    }),
    { name: "haus-branch-filter" },
  ),
);

export function branchQueryParam(branchId: string | null): Record<string, string> {
  return branchId ? { branch_id: branchId } : {};
}
