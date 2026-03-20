import { NextResponse } from "next/server";

import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { backendFetch } from "@/lib/backend/client";
import type { ApiResponse } from "@/lib/types/api";

export async function POST() {
  const session = await getSession();

  try {
    if (session) {
      await backendFetch("/auth/logout", {
        method: "POST",
        session,
      });
    }
  } catch {
    // Logout still clears the BFF-managed cookie even if the backend call fails.
  }

  const response = NextResponse.json<ApiResponse<{ loggedOut: true }>>({
    ok: true,
    data: {
      loggedOut: true,
    },
  });

  clearSessionCookie(response);
  return response;
}
