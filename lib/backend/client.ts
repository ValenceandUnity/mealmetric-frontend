import "server-only";

import { NextResponse } from "next/server";

import { SessionError } from "@/lib/auth/session";
import { buildTrustedBackendHeaders } from "@/lib/backend/headers";
import type { ApiResponse, SessionPayload } from "@/lib/types/api";

type BackendRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  session?: SessionPayload | null;
  accessToken?: string | null;
  searchParams?: URLSearchParams;
  headers?: HeadersInit;
  cache?: RequestCache;
};

export class BackendClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly internalDetails?: unknown;

  constructor(status: number, code: string, message: string, internalDetails?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.internalDetails = internalDetails;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSafeBackendErrorDetails(payload: unknown): {
  code?: string;
  message?: string;
} {
  if (typeof payload === "string") {
    const message = payload.trim();
    return message.length > 0 ? { message } : {};
  }

  if (!isRecord(payload)) {
    return {};
  }

  const code = typeof payload.code === "string" ? payload.code : undefined;
  if (typeof payload.message === "string" && payload.message.trim().length > 0) {
    return { code, message: payload.message.trim() };
  }

  if (typeof payload.detail === "string" && payload.detail.trim().length > 0) {
    return { code, message: payload.detail.trim() };
  }

  if (isRecord(payload.error)) {
    const nestedCode = typeof payload.error.code === "string" ? payload.error.code : code;
    if (typeof payload.error.message === "string" && payload.error.message.trim().length > 0) {
      return { code: nestedCode, message: payload.error.message.trim() };
    }
  }

  return { code };
}

function getBackendBaseUrl(): string {
  const value = process.env.BACKEND_BASE_URL;

  if (!value) {
    throw new BackendClientError(500, "backend_config_missing", "Backend is not configured.");
  }

  return value.replace(/\/$/, "");
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

function getAccessToken(options: BackendRequestOptions): string | null {
  if (options.accessToken) {
    return options.accessToken;
  }

  if (options.session?.accessToken) {
    return options.session.accessToken;
  }

  return null;
}

export async function backendFetch<T>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  const search = options.searchParams?.toString();
  const pathWithQuery = search ? `${path}?${search}` : path;
  const url = `${getBackendBaseUrl()}${pathWithQuery}`;

  const headers = buildTrustedBackendHeaders({
    method,
    pathWithQuery,
    body: body ?? "",
  });

  if (options.headers) {
    const extraHeaders = new Headers(options.headers);
    extraHeaders.forEach((value, key) => headers.set(key, value));
  }

  if (body) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = getAccessToken(options);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      cache: options.cache ?? "no-store",
    });
  } catch (error) {
    throw new BackendClientError(502, "backend_unreachable", "Unable to reach backend service.", {
      cause: error instanceof Error ? error.message : "unknown",
    });
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const safeError = getSafeBackendErrorDetails(payload);
    throw new BackendClientError(
      response.status,
      safeError.code ?? "backend_request_failed",
      safeError.message ?? "Backend request failed.",
      payload,
    );
  }

  return payload as T;
}

export function toApiErrorResponse(
  error: unknown,
  fallbackMessage: string,
): NextResponse<ApiResponse<never>> {
  if (error instanceof SessionError) {
    const status = error.code === "unauthenticated" ? 401 : 403;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: fallbackMessage,
        },
      },
      { status },
    );
  }

  if (error instanceof BackendClientError) {
    const message =
      error.status >= 400 && error.status < 500 && error.message.trim().length > 0
        ? error.message
        : fallbackMessage;

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message,
        },
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "internal_error",
        message: fallbackMessage,
      },
    },
    { status: 500 },
  );
}
