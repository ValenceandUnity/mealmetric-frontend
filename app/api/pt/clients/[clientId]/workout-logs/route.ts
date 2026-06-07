import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type RouteContext = {
  params: Promise<{
    clientId: string;
  }>;
};

function getForwardedWorkoutLogSearchParams(request: Request): URLSearchParams {
  const requestUrl = new URL(request.url);
  const forwarded = new URLSearchParams();

  for (const key of ["limit", "offset", "mode", "search"]) {
    const value = requestUrl.searchParams.get(key);
    if (value && value.trim().length > 0) {
      forwarded.set(key, value);
    }
  }

  return forwarded;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireSession("pt");
    const { clientId } = await context.params;
    const searchParams = getForwardedWorkoutLogSearchParams(request);
    const data = await backendFetch<JsonValue>(`/pt/clients/${clientId}/workout-logs`, {
      session,
      searchParams,
    });

    return NextResponse.json<ApiResponse<JsonValue>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load client workout logs.");
  }
}
