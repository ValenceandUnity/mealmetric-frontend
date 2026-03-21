import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, MealPlanListPayload } from "@/lib/types/api";

export async function GET(request: Request) {
  try {
    const session = await requireSession("vendor");
    const searchParams = new URL(request.url).searchParams;
    const data = await backendFetch<MealPlanListPayload>("/vendor/meal-plans", {
      session,
      searchParams,
    });
    return NextResponse.json<ApiResponse<MealPlanListPayload>>({ ok: true, data });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load vendor meal plans.");
  }
}
