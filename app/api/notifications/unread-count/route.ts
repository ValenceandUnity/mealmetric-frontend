import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, NotificationUnreadCountPayload } from "@/lib/types/api";

export async function GET() {
  try {
    const session = await requireSession();
    const data = await backendFetch<NotificationUnreadCountPayload>("/notifications/unread-count", {
      session,
    });

    return NextResponse.json<ApiResponse<NotificationUnreadCountPayload>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load unread notification count.");
  }
}
