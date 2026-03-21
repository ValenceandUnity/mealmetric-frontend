import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse } from "@/lib/types/api";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ bookmarkId: string }> },
) {
  try {
    const session = await requireSession("client");
    const { bookmarkId } = await context.params;
    await backendFetch<void>(`/client/bookmarks/${bookmarkId}`, {
      method: "DELETE",
      session,
    });
    return NextResponse.json<ApiResponse<{ deleted: true }>>({
      ok: true,
      data: { deleted: true },
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to delete bookmark folder.");
  }
}
