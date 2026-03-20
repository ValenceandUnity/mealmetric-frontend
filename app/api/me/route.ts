import { NextResponse } from "next/server";

import { readJsonObjectBody, toRequestBodyErrorResponse } from "@/lib/api/request";
import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

export async function GET() {
  try {
    const session = await requireSession();
    const data = await backendFetch<JsonValue>("/me", { session });

    return NextResponse.json<ApiResponse<JsonValue>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load profile.");
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonObjectBody(request);
    const data = await backendFetch<JsonValue>("/me", {
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

    return toApiErrorResponse(error, "Unable to update profile.");
  }
}
