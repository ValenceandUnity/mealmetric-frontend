import { NextResponse } from "next/server";

import { readJsonObjectBody, toRequestBodyErrorResponse } from "@/lib/api/request";
import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type RouteContext = {
  params: Promise<{
    workoutLogId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSession("pt");
    const body = await readJsonObjectBody(request);
    const { workoutLogId } = await context.params;
    const data = await backendFetch<JsonValue>(`/pt/workout-logs/${workoutLogId}/pt-notes`, {
      method: "PATCH",
      session,
      body,
    });

    return NextResponse.json<ApiResponse<JsonValue>>({
      ok: true,
      data,
    });
  } catch (error) {
    const requestErrorResponse = toRequestBodyErrorResponse(error);
    if (requestErrorResponse) {
      return requestErrorResponse;
    }

    return toApiErrorResponse(error, "Unable to update PT workout log note.");
  }
}
