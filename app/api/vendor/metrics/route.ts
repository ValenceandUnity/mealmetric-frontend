import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, VendorMetricsPayload } from "@/lib/types/api";

export async function GET(request: Request) {
  try {
    const session = await requireSession("vendor");
    const searchParams = new URL(request.url).searchParams;
    const data = await backendFetch<VendorMetricsPayload>("/vendor/metrics", {
      session,
      searchParams,
    });
    return NextResponse.json<ApiResponse<VendorMetricsPayload>>({ ok: true, data });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load vendor metrics.");
  }
}
