"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

type ListResponse<T> = { data: T[] } | T[];

function unwrapList<T>(body: ListResponse<T>): T[] {
  if (Array.isArray(body)) return body;
  return body.data ?? [];
}

export function useEntityList<T>(
  orgId: string | undefined,
  resource: string,
  params?: Record<string, string>,
) {
  return useQuery({
    queryKey: ["org", orgId, resource, params],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const body = await apiClient<ListResponse<T>>(`/organizations/${orgId}/${resource}`, { params });
      return unwrapList(body);
    },
  });
}

export function useEntityCreate<TBody extends Record<string, unknown>>(
  orgId: string | undefined,
  resource: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) =>
      apiClient(`/organizations/${orgId}/${resource}`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, resource] }),
  });
}

export function useEntityUpdate<TBody extends Record<string, unknown>>(
  orgId: string | undefined,
  resource: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TBody }) =>
      apiClient(`/organizations/${orgId}/${resource}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, resource] }),
  });
}

export function useEntityDelete(orgId: string | undefined, resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/organizations/${orgId}/${resource}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, resource] }),
  });
}

export function useReadModel<T>(orgId: string | undefined, path: string, queryKey: string[]) {
  return useQuery({
    queryKey,
    enabled: Boolean(orgId),
    queryFn: () => apiClient<T>(`/organizations/${orgId}/${path}`),
  });
}
