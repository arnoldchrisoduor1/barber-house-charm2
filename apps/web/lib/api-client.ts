import type { components } from "@haus/contracts";

export type MeResponse = components["schemas"]["MeResponse"];
export type ApiErrorBody = { title?: string; detail?: string; status?: number };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type JsonBody = Record<string, unknown> | unknown[] | null;

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: JsonBody | string;
  params?: Record<string, string | number | boolean | undefined | null>;
}

const API_PREFIX = "/api/v1";

function buildUrl(path: string, params?: ApiRequestOptions["params"]): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_PREFIX}${normalized}`, typeof window === "undefined" ? "http://localhost" : window.location.origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.pathname + url.search;
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | undefined;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = undefined;
  }

  const message = body?.detail ?? body?.title ?? response.statusText ?? "Request failed";
  return new ApiError(response.status, message, body);
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, params, headers, ...init } = options;

  const response = await fetch(buildUrl(path, params), {
    ...init,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, "body" | "method">) =>
    apiFetch<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: JsonBody, options?: Omit<ApiRequestOptions, "body" | "method">) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: JsonBody, options?: Omit<ApiRequestOptions, "body" | "method">) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: JsonBody, options?: Omit<ApiRequestOptions, "body" | "method">) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: Omit<ApiRequestOptions, "body" | "method">) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};

/** Generic fetch helper used by dashboard pages. */
export async function apiClient<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  let { body, ...rest } = options;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body) as JsonBody;
    } catch {
      /* leave as-is; apiFetch will stringify */
    }
  }
  return apiFetch<T>(path, { ...rest, body });
}
