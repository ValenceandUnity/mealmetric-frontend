import { NextResponse } from "next/server";

import { readJsonObjectBody, toRequestBodyErrorResponse } from "@/lib/api/request";
import { writeSessionCookie } from "@/lib/auth/session";
import { backendFetch, toApiErrorResponse } from "@/lib/backend/client";
import type {
  ApiResponse,
  BackendMeResponse,
  BackendTokenResponse,
  SessionPayload,
  SessionUser,
} from "@/lib/types/api";

type LoginRequest = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await readJsonObjectBody(request)) as LoginRequest;

    if (!body.email || !body.password) {
      return NextResponse.json<ApiResponse<never>>(
        {
          ok: false,
          error: {
            code: "invalid_request",
            message: "Email and password are required.",
          },
        },
        { status: 400 },
      );
    }

    const token = await backendFetch<BackendTokenResponse>("/auth/login", {
      method: "POST",
      body: {
        email: body.email,
        password: body.password,
      },
    });

    const me = await backendFetch<BackendMeResponse>("/auth/me", {
      accessToken: token.access_token,
    });

    const user: SessionUser = {
      id: me.id,
      email: me.email,
      role: me.role,
    };

    const session: SessionPayload = {
      accessToken: token.access_token,
      user,
    };

    const response = NextResponse.json<ApiResponse<{ user: SessionUser }>>({
      ok: true,
      data: {
        user,
      },
    });

    writeSessionCookie(response, session);
    return response;
  } catch (error) {
    const requestErrorResponse = toRequestBodyErrorResponse(error);
    if (requestErrorResponse) {
      return requestErrorResponse;
    }

    return toApiErrorResponse(error, "Login failed.");
  }
}
