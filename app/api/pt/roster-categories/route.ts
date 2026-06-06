import { NextResponse } from "next/server";

import { readJsonObjectBody, toRequestBodyErrorResponse } from "@/lib/api/request";
import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type RosterCategoryRequest = {
  name?: string;
};

export async function GET() {
  try {
    const session = await requireSession("pt");
    const data = await backendFetch<JsonValue>("/pt/roster-categories", { session });

    return NextResponse.json<ApiResponse<JsonValue>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load PT roster categories.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession("pt");
    const body = (await readJsonObjectBody(request)) as RosterCategoryRequest;

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        {
          ok: false,
          error: {
            code: "invalid_request",
            message: "Roster category name is required.",
          },
        },
        { status: 400 },
      );
    }

    const data = await backendFetch<JsonValue>("/pt/roster-categories", {
      method: "POST",
      session,
      body: {
        name: body.name,
      },
    });

    return NextResponse.json<ApiResponse<JsonValue>>(
      {
        ok: true,
        data,
      },
      { status: 201 },
    );
  } catch (error) {
    const requestErrorResponse = toRequestBodyErrorResponse(error);
    if (requestErrorResponse) {
      return requestErrorResponse;
    }

    return toApiErrorResponse(error, "Unable to create PT roster category.");
  }
}
