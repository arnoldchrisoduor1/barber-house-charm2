import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROOT_HOSTS = new Set(["localhost", "127.0.0.1", "hausofwellness.com", "www.hausofwellness.com"]);

function extractOrgSlugHint(host: string): string | null {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname || ROOT_HOSTS.has(hostname)) return null;

  const parts = hostname.split(".");
  if (parts.length < 3) return null;

  const slug = parts[0];
  if (!slug || slug === "www" || slug === "admin") return null;
  return slug;
}

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const slugHint = extractOrgSlugHint(request.headers.get("host") ?? "");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  if (slugHint) {
    requestHeaders.set("x-org-slug-hint", slugHint);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("x-request-id", requestId);
  if (slugHint) {
    response.headers.set("x-org-slug-hint", slugHint);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
