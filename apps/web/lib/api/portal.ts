import { api, apiClient } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

export interface LoyaltyWallet {
  customer_id: string;
  full_name: string;
  phone: string;
  loyalty_points: number;
  loyalty_tier: string;
  referral_code?: string | null;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description?: string;
  points_required: number;
}

export interface PortalReview {
  id: string;
  rating: number;
  comment?: string;
  staff_id?: string;
  created_at?: string;
}

export interface ReferralRow {
  id: string;
  referred_name?: string;
  status?: string;
  reward_kes?: number;
  created_at?: string;
}

function mapReward(row: Record<string, unknown>): LoyaltyReward {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    name: String(pickRowField(row, "name") ?? "Reward"),
    description: pickRowField(row, "description") ? String(pickRowField(row, "description")) : undefined,
    points_required: Number(pickRowField(row, "points_required") ?? 0),
  };
}

export async function fetchLoyaltyWallet(orgId: string, phone: string): Promise<LoyaltyWallet> {
  return api.get<LoyaltyWallet>(`/organizations/${orgId}/loyalty/wallet`, { params: { phone } });
}

export async function fetchLoyaltyRewards(orgId: string): Promise<LoyaltyReward[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/loyalty/rewards`);
  return (res.data ?? []).map(mapReward);
}

export async function redeemLoyaltyReward(orgId: string, customerId: string, rewardId: string) {
  return api.post(`/organizations/${orgId}/loyalty/redeem`, { customer_id: customerId, reward_id: rewardId });
}

export async function fetchMyReferrals(orgId: string, phone: string) {
  return api.get<{
    referral_code?: string;
    referrals?: ReferralRow[];
    total?: number;
  }>(`/organizations/${orgId}/referrals/my`, { params: { phone } });
}

export async function fetchMyReviews(orgId: string, phone: string): Promise<PortalReview[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/reviews/my`, {
    params: { phone },
  });
  return (res.data ?? []).map((row) => ({
    id: String(pickRowField(row, "id") ?? ""),
    rating: Number(pickRowField(row, "rating") ?? 0),
    comment: pickRowField(row, "comment") ? String(pickRowField(row, "comment")) : undefined,
    staff_id: pickRowField(row, "staff_id") ? String(pickRowField(row, "staff_id")) : undefined,
    created_at: pickRowField(row, "created_at") ? String(pickRowField(row, "created_at")) : undefined,
  }));
}

export async function submitReview(
  orgId: string,
  body: { customer_id: string; staff_id?: string; booking_id?: string; rating: number; comment?: string },
) {
  return apiClient(`/organizations/${orgId}/reviews/submit`, { method: "POST", body: JSON.stringify(body) });
}
