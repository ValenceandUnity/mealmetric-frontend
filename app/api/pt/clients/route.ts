import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

const ALLOWED_QUERY_PARAMS = new Set(["category_id"]);

export async function GET(request: Request) {
  try {
    const session = await requireSession("pt");
    const url = new URL(request.url);
    const searchParams = new URLSearchParams();

    for (const [key, value] of url.searchParams.entries()) {
      if (ALLOWED_QUERY_PARAMS.has(key) && value.trim().length > 0) {
        searchParams.set(key, value);
      }
    }

    const data = await backendFetch<JsonValue>("/pt/clients", {
      session,
      searchParams,
    });

    return NextResponse.json<ApiResponse<JsonValue>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load PT clients.");
  }
}
