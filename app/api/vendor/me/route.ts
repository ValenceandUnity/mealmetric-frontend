import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, VendorMePayload } from "@/lib/types/api";

export async function GET() {
  try {
    const session = await requireSession("vendor");
    const data = await backendFetch<VendorMePayload>("/vendor/me", { session });
    return NextResponse.json<ApiResponse<VendorMePayload>>({ ok: true, data });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load vendor profile.");
  }
}
