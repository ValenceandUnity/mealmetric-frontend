import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ mealPlanId: string }> },
) {
  try {
    const session = await requireSession("client");
    const { mealPlanId } = await context.params;

    const data = await backendFetch<JsonValue>(`/meal-plans/${mealPlanId}`, {
      session,
    });

    return NextResponse.json<ApiResponse<JsonValue>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load meal plan detail.");
  }
}
