import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, JsonValue, PTDashboardResponse } from "@/lib/types/api";

export async function GET() {
  try {
    const session = await requireSession("pt");

    const [profile, clients, packages] = await Promise.all([
      backendFetch<JsonValue>("/pt/profile/me", { session }),
      backendFetch<JsonValue>("/pt/clients", { session }),
      backendFetch<JsonValue>("/pt/packages", { session }),
    ]);

    return NextResponse.json<ApiResponse<PTDashboardResponse>>({
      ok: true,
      data: {
        profile,
        clients,
        packages,
      },
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load PT dashboard.");
  }
}
