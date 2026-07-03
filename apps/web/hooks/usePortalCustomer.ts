"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { fetchLoyaltyWallet } from "@/lib/api/portal";
import { readPortalCustomerPhone, usePortalCustomerStore } from "@/lib/store/portal-customer-store";

export function usePortalCustomer() {
  const { activeOrg, me } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const storePhone = usePortalCustomerStore((s) => s.phone);
  const storeName = usePortalCustomerStore((s) => s.fullName);
  const [phone, setPhone] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    const resolvedPhone = storePhone ?? readPortalCustomerPhone();
    const resolvedName = storeName ?? me?.user?.fullName ?? null;
    setPhone(resolvedPhone);
    setFullName(resolvedName);
    const unsub = usePortalCustomerStore.persist.onFinishHydration(() => {
      setPhone(usePortalCustomerStore.getState().phone ?? readPortalCustomerPhone());
      setFullName(usePortalCustomerStore.getState().fullName ?? me?.user?.fullName ?? null);
    });
    return unsub;
  }, [storePhone, storeName, me?.user?.fullName]);

  const walletQuery = useQuery({
    queryKey: ["portal-wallet", orgId, phone],
    enabled: !!orgId && !!phone,
    queryFn: () => fetchLoyaltyWallet(orgId, phone!),
    retry: false,
  });

  const customerId = walletQuery.data?.customer_id ?? null;
  const referralCode = walletQuery.data?.referral_code ?? null;
  const hasCustomerRecord = !!customerId && !walletQuery.isError;

  return {
    orgId,
    phone,
    fullName,
    customerId,
    referralCode,
    hasCustomerRecord,
    walletQuery,
    isReady: phone !== null,
  };
}
