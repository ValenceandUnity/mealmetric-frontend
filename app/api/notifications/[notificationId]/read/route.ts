import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, NotificationItem } from "@/lib/types/api";

type RouteContext = {
  params: Promise<{
    notificationId: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    const { notificationId } = await context.params;
    const data = await backendFetch<NotificationItem>(`/notifications/${notificationId}/read`, {
      session,
      method: "PATCH",
    });

    return NextResponse.json<ApiResponse<NotificationItem>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to update notification.");
  }
}
