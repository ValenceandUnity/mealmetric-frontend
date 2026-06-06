import { NextResponse } from "next/server";

import { readJsonObjectBody, toRequestBodyErrorResponse } from "@/lib/api/request";
import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

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

export async function GET(request: Request) {
  try {
    const session = await requireSession("client");
    const searchParams = getForwardedWorkoutLogSearchParams(request);

    const data = await backendFetch<JsonValue>("/client/training/workout-logs", {
      session,
      searchParams,
    });

    return NextResponse.json<ApiResponse<JsonValue>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load workout history.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession("client");
    const body = await readJsonObjectBody(request);

    const data = await backendFetch<JsonValue>("/client/training/workout-logs", {
      method: "POST",
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

    return toApiErrorResponse(error, "Unable to submit workout log.");
  }
}
