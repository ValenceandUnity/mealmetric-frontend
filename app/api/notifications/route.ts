import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, NotificationListPayload } from "@/lib/types/api";

export async function GET() {
  try {
    const session = await requireSession();
    const data = await backendFetch<NotificationListPayload>("/notifications", { session });

    return NextResponse.json<ApiResponse<NotificationListPayload>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load notifications.");
  }
}
