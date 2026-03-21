import { NextResponse } from "next/server";

import { readJsonObjectBody, toRequestBodyErrorResponse } from "@/lib/api/request";
import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, BookmarkItem, JsonObject } from "@/lib/types/api";

export async function POST(
  request: Request,
  context: { params: Promise<{ bookmarkId: string }> },
) {
  try {
    const session = await requireSession("client");
    const { bookmarkId } = await context.params;
    const body = (await readJsonObjectBody(request)) as JsonObject;
    const data = await backendFetch<BookmarkItem>(`/client/bookmarks/${bookmarkId}/items`, {
      method: "POST",
      session,
      body,
    });
    return NextResponse.json<ApiResponse<BookmarkItem>>({ ok: true, data }, { status: 201 });
  } catch (error) {
    const requestErrorResponse = toRequestBodyErrorResponse(error);
    if (requestErrorResponse) {
      return requestErrorResponse;
    }
    return toApiErrorResponse(error, "Unable to save bookmark.");
  }
}
