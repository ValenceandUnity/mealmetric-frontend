import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, PTDashboardResponse } from "@/lib/types/api";

export async function GET() {
  try {
    const session = await requireSession("pt");
    const data = await backendFetch<PTDashboardResponse>("/pt/dashboard", { session });

    return NextResponse.json<ApiResponse<PTDashboardResponse>>({
      ok: true,
      data,
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load PT dashboard.");
  }
}
