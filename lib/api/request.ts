import { NextResponse } from "next/server";

import type { ApiResponse, JsonObject } from "@/lib/types/api";

export class RequestBodyError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function readJsonObjectBody(request: Request): Promise<JsonObject> {
  let body: unknown;

  try {
    body = (await request.json()) as unknown;
  } catch {
    throw new RequestBodyError(400, "invalid_request", "Request body must be valid JSON.");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new RequestBodyError(400, "invalid_request", "Request body must be a JSON object.");
  }

  return body as JsonObject;
}

export function toRequestBodyErrorResponse(
  error: unknown,
): NextResponse<ApiResponse<never>> | null {
  if (!(error instanceof RequestBodyError)) {
    return null;
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
      },
    },
    { status: error.status },
  );
}
