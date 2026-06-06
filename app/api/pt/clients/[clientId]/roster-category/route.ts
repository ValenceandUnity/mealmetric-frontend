import { NextResponse } from "next/server";

import { readJsonObjectBody, toRequestBodyErrorResponse } from "@/lib/api/request";
import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type RosterCategoryUpdateRequest = {
  roster_category_id?: string | null;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  try {
    const { clientId } = await context.params;
    const session = await requireSession("pt");
    const body = (await readJsonObjectBody(request)) as RosterCategoryUpdateRequest;

    if ("roster_category_id" in body) {
      const value = body.roster_category_id;
      if (value !== null && typeof value !== "string") {
        return NextResponse.json<ApiResponse<never>>(
          {
            ok: false,
            error: {
              code: "invalid_request",
              message: "roster_category_id must be a string UUID or null.",
            },
          },
          { status: 400 },
        );
      }
    }

    const data = await backendFetch<JsonValue>(`/pt/clients/${clientId}/roster-category`, {
      method: "PATCH",
      session,
      body: {
        roster_category_id: body.roster_category_id ?? null,
      },
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

    return toApiErrorResponse(error, "Unable to update client roster category.");
  }
}
