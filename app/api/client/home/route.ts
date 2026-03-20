import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, ClientHomeResponse, JsonValue } from "@/lib/types/api";

export async function GET() {
  try {
    const session = await requireSession("client");

    const [overview, assignments, mealPlans] = await Promise.all([
      backendFetch<JsonValue>("/metrics/overview", { session }),
      backendFetch<JsonValue>("/client/training/assignments", { session }),
      backendFetch<JsonValue>("/meal-plans", { session }),
    ]);

    return NextResponse.json<ApiResponse<ClientHomeResponse>>({
      ok: true,
      data: {
        overview,
        assignments,
        mealPlans,
      },
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load client home.");
  }
}
