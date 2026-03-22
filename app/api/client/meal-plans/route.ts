import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

function normalizeZipCodes(searchParams: URLSearchParams): string[] {
  const normalizedZipCodes: string[] = [];
  const seen = new Set<string>();

  for (const rawValue of searchParams.getAll("zip_codes")) {
    for (const candidate of rawValue.split(",")) {
      const normalized = candidate.trim();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      normalizedZipCodes.push(normalized);
    }
  }

  return normalizedZipCodes;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession("client");
    const incomingSearchParams = new URL(request.url).searchParams;
    const searchParams = new URLSearchParams(incomingSearchParams);
    const normalizedQuery = searchParams.get("q")?.trim() ?? "";

    if (normalizedQuery) {
      searchParams.set("q", normalizedQuery);
    } else {
      searchParams.delete("q");
    }

    const hadZipCodes = incomingSearchParams.getAll("zip_codes").length > 0;
    const normalizedZipCodes = normalizeZipCodes(incomingSearchParams);
    searchParams.delete("zip_codes");
    searchParams.delete("zip_code");
    if (hadZipCodes) {
      if (normalizedZipCodes.length > 0) {
        searchParams.set("zip_codes", normalizedZipCodes.join(","));
      }
    } else {
      const normalizedZipCode = incomingSearchParams.get("zip_code")?.trim() ?? "";
      if (normalizedZipCode) {
        searchParams.set("zip_code", normalizedZipCode);
      }
    }

    const data = await backendFetch<JsonValue>("/meal-plans", { session, searchParams });

    return NextResponse.json<ApiResponse<JsonValue>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load meal plans.");
  }
}
