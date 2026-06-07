import { NextResponse } from "next/server";

import { readJsonObjectBody, toRequestBodyErrorResponse } from "@/lib/api/request";
import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type {
  ApiResponse,
  JsonValue,
  PTClientInvitationListResponse,
} from "@/lib/types/api";

export async function GET() {
  try {
    const session = await requireSession("pt");
    const data = await backendFetch<PTClientInvitationListResponse>("/pt/client-invitations", {
      session,
    });

    return NextResponse.json<ApiResponse<PTClientInvitationListResponse>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load PT client invitations.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession("pt");
    const body = await readJsonObjectBody(request);
    const rawEmail = typeof body.client_email === "string" ? body.client_email.trim() : "";

    if (rawEmail.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        {
          ok: false,
          error: {
            code: "invalid_request",
            message: "Client email is required.",
          },
        },
        { status: 400 },
      );
    }

    const data = await backendFetch<JsonValue>("/pt/client-invitations", {
      method: "POST",
      session,
      body: {
        client_email: rawEmail,
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

    return toApiErrorResponse(error, "Unable to send PT client invitation.");
  }
}
