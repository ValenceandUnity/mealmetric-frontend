import { NextResponse } from "next/server";

import { readJsonObjectBody, toRequestBodyErrorResponse } from "@/lib/api/request";
import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, BookmarkFolder, BookmarkFolderListPayload, JsonObject } from "@/lib/types/api";

export async function GET() {
  try {
    const session = await requireSession("client");
    const data = await backendFetch<BookmarkFolderListPayload>("/client/bookmarks", { session });
    return NextResponse.json<ApiResponse<BookmarkFolderListPayload>>({ ok: true, data });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load bookmarks.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession("client");
    const body = (await readJsonObjectBody(request)) as JsonObject;
    const data = await backendFetch<BookmarkFolder>("/client/bookmarks", {
      method: "POST",
      session,
      body,
    });
    return NextResponse.json<ApiResponse<BookmarkFolder>>({ ok: true, data }, { status: 201 });
  } catch (error) {
    const requestErrorResponse = toRequestBodyErrorResponse(error);
    if (requestErrorResponse) {
      return requestErrorResponse;
    }
    return toApiErrorResponse(error, "Unable to create bookmark folder.");
  }
}
