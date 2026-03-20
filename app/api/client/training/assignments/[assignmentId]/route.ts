import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const session = await requireSession("client");
    const { assignmentId } = await context.params;

    const data = await backendFetch<JsonValue>(`/client/training/assignments/${assignmentId}`, {
      session,
    });

    return NextResponse.json<ApiResponse<JsonValue>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load assignment detail.");
  }
}
