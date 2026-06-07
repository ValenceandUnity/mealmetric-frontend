import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const session = await requireSession("client");
    const { invitationId } = await context.params;
    const data = await backendFetch<JsonValue>(`/client/invitations/${invitationId}/decline`, {
      method: "POST",
      session,
    });

    return NextResponse.json<ApiResponse<JsonValue>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to decline client invitation.");
  }
}
