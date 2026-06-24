"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { modeTerms, type BusinessMode } from "@haus/contracts";
import type { MeResponse } from "@/lib/api-client";
import { api } from "@/lib/api-client";

type ActiveOrg = NonNullable<MeResponse["activeOrg"]>;

interface AuthContextValue {
  me: MeResponse | undefined;
  activeOrg: ActiveOrg | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  roles: string[];
  features: string[];
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
    businessType?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

function slugifyOrgName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/me"),
    retry: false,
    staleTime: 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      api.post("/auth/login", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const registerMutation = useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      fullName: string;
      organizationName: string;
      businessType?: string;
    }) =>
      api.post("/auth/register", {
        email: payload.email,
        password: payload.password,
        fullName: payload.fullName,
        orgName: payload.organizationName,
        orgSlug: slugifyOrgName(payload.organizationName),
        businessType: payload.businessType ?? "barber",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["me"], undefined);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const refreshMe = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      me: meQuery.data,
      activeOrg: meQuery.data?.activeOrg,
      isLoading: meQuery.isLoading,
      isAuthenticated: Boolean(meQuery.data?.user),
      roles: meQuery.data?.roles ?? [],
      features: meQuery.data?.features ?? [],
      login: async (email, password) => {
        await loginMutation.mutateAsync({ email, password });
      },
      register: async (payload) => {
        await registerMutation.mutateAsync(payload);
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      refreshMe,
    }),
    [meQuery.data, meQuery.isLoading, loginMutation, registerMutation, logoutMutation, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export type BusinessCategory = BusinessMode;

export interface BusinessTerms {
  staffSingular: string;
  staffPlural: string;
  seniorStaff: string;
  juniorStaff: string;
  serviceSingular: string;
  servicePlural: string;
  serviceAction: string;
  clientSingular: string;
  clientPlural: string;
  bookingSingular: string;
  bookingPlural: string;
  bookingVerb: string;
  stationSingular: string;
  stationPlural: string;
  stationUtilLabel: string;
  preferencesPlaceholder: string;
  specialtiesPlaceholder: string;
  servicesPageTitle: string;
  staffPageTitle: string;
  bookingsPageTitle: string;
  schedulePageTitle: string;
  dashboardSubtitle: string;
}

interface BusinessCategoryContextValue {
  categories: BusinessCategory[];
  mode: BusinessMode | "mixed";
  label: string;
  terms: BusinessTerms;
  themeClass: string | null;
  setFromSubscription: (type: string) => void;
  setCategory: (cat: BusinessCategory) => void;
}

const BusinessCategoryContext = createContext<BusinessCategoryContextValue | undefined>(undefined);

const THEME_CLASSES = Object.values(modeTerms.themeClasses);
const STORAGE_KEY = "business_categories";

function readStoredCategories(): BusinessCategory[] {
  if (typeof window === "undefined") return ["barber"];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as BusinessCategory[];
    } catch {
      /* fall through */
    }
  }
  return ["barber"];
}

function resolveMode(categories: BusinessCategory[]): BusinessMode | "mixed" {
  if (categories.length > 1) return "mixed";
  return categories[0] ?? "barber";
}

function resolveThemeClass(categories: BusinessCategory[]): string | null {
  if (categories.length > 1) return modeTerms.themeClasses.mixed;
  const mode = categories[0];
  if (!mode) return null;
  return modeTerms.themeClasses[mode as keyof typeof modeTerms.themeClasses] ?? null;
}

function resolveTerms(categories: BusinessCategory[]): BusinessTerms {
  const mode = resolveMode(categories);
  if (mode === "mixed") {
    return modeTerms.modes.barber as BusinessTerms;
  }
  return modeTerms.modes[mode] as BusinessTerms;
}

function resolveLabel(categories: BusinessCategory[]): string {
  if (categories.length > 1) return modeTerms.brandLabels.mixed;
  const mode = categories[0];
  return modeTerms.brandLabels[mode as keyof typeof modeTerms.brandLabels] ?? modeTerms.brandLabels.mixed;
}

export function BusinessCategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<BusinessCategory[]>(readStoredCategories);

  const persist = useCallback((next: BusinessCategory[]) => {
    setCategories(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const setCategory = useCallback(
    (cat: BusinessCategory) => {
      persist([cat]);
    },
    [persist],
  );

  const setFromSubscription = useCallback(
    (type: string) => {
      const typeMap: Record<string, BusinessCategory[]> = {
        barber: ["barber"],
        beauty: ["beauty"],
        spa: ["spa"],
        nail_bar: ["nail_bar"],
        clinic: ["clinic"],
        mobile: ["mobile"],
        therapy: ["therapy"],
        solo_pro: ["solo_pro"],
        products: ["products"],
        both: ["barber", "beauty"],
        mixed: ["barber", "beauty", "spa"],
      };
      persist(typeMap[type] ?? [type as BusinessCategory]);
    },
    [persist],
  );

  const mode = resolveMode(categories);
  const themeClass = resolveThemeClass(categories);
  const terms = resolveTerms(categories);
  const label = resolveLabel(categories);

  useEffect(() => {
    const root = document.documentElement;
    THEME_CLASSES.forEach((cls) => root.classList.remove(cls));
    if (themeClass) root.classList.add(themeClass);
  }, [themeClass]);

  const value = useMemo(
    () => ({
      categories,
      mode,
      label,
      terms,
      themeClass,
      setFromSubscription,
      setCategory,
    }),
    [categories, mode, label, terms, themeClass, setFromSubscription, setCategory],
  );

  return (
    <BusinessCategoryContext.Provider value={value}>{children}</BusinessCategoryContext.Provider>
  );
}

export function useBusinessCategory() {
  const context = useContext(BusinessCategoryContext);
  if (!context) {
    throw new Error("useBusinessCategory must be used within BusinessCategoryProvider");
  }
  return context;
}
