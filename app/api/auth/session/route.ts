import { NextResponse } from "next/server";

import { clearSessionCookie, getSession, writeSessionCookie } from "@/lib/auth/session";
import { BackendClientError, backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type { ApiResponse, BackendMeResponse, SessionPayload, SessionStatusResponse } from "@/lib/types/api";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse<SessionStatusResponse>>({
      ok: true,
      data: {
        authenticated: false,
      },
    });
  }

  try {
    // Re-validate the session against the backend identity endpoint instead of trusting
    // the cookie contents alone. The cookie is encrypted and structurally validated in
    // lib/auth/session.ts, and this request confirms the token is still accepted by backend.
    const me = await backendFetch<BackendMeResponse>("/auth/me", {
      accessToken: session.accessToken,
    });

    const refreshedSession: SessionPayload = {
      accessToken: session.accessToken,
      user: {
        id: me.id,
        email: me.email,
        role: me.role,
      },
    };

    const response = NextResponse.json<ApiResponse<SessionStatusResponse>>({
      ok: true,
      data: {
        authenticated: true,
        user: refreshedSession.user,
      },
    });

    writeSessionCookie(response, refreshedSession);
    return response;
  } catch (error) {
    if (error instanceof BackendClientError && (error.status === 401 || error.status === 403)) {
      const response = NextResponse.json<ApiResponse<SessionStatusResponse>>({
        ok: true,
        data: {
          authenticated: false,
        },
      });

      clearSessionCookie(response);
      return response;
    }

    return toApiErrorResponse(error, "Unable to resolve session.");
  }
}
