import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, ClientMetricsResponse, JsonValue } from "@/lib/types/api";

export async function GET() {
  try {
    const session = await requireSession("client");

    const [overview, history] = await Promise.all([
      backendFetch<JsonValue>("/metrics/overview", { session }),
      backendFetch<JsonValue>("/metrics/history", { session }),
    ]);

    return NextResponse.json<ApiResponse<ClientMetricsResponse>>({
      ok: true,
      data: {
        overview,
        history,
      },
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load client metrics.");
  }
}
