import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock, writeSessionCookieMock } = vi.hoisted(() => ({
  backendFetchMock: vi.fn(),
  writeSessionCookieMock: vi.fn(),
}));

vi.mock("@/lib/backend/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/backend/client")>("@/lib/backend/client");
  return {
    ...actual,
    backendFetch: backendFetchMock,
  };
});

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>("@/lib/auth/session");
  return {
    ...actual,
    writeSessionCookie: writeSessionCookieMock,
  };
});

import { POST } from "@/app/api/auth/register/route";
import { BackendClientError } from "@/lib/backend/client";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    writeSessionCookieMock.mockReset();
  });

  it("registers, logs in, and writes the session cookie", async () => {
    backendFetchMock
      .mockResolvedValueOnce({ registered: true })
      .mockResolvedValueOnce({ access_token: "token-123" })
      .mockResolvedValueOnce({
        id: "user-1",
        email: "pt@example.com",
        role: "pt",
      });

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "pt@example.com",
        password: "password123",
        role: "pt",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        user: {
          id: "user-1",
          email: "pt@example.com",
          role: "pt",
        },
      },
    });
    expect(backendFetchMock).toHaveBeenNthCalledWith(1, "/auth/register", {
      method: "POST",
      body: {
        email: "pt@example.com",
        password: "password123",
        role: "pt",
      },
    });
    expect(backendFetchMock).toHaveBeenNthCalledWith(2, "/auth/login", {
      method: "POST",
      body: {
        email: "pt@example.com",
        password: "password123",
      },
    });
    expect(backendFetchMock).toHaveBeenNthCalledWith(3, "/auth/me", {
      accessToken: "token-123",
    });
    expect(writeSessionCookieMock).toHaveBeenCalledOnce();
    expect(writeSessionCookieMock).toHaveBeenCalledWith(expect.anything(), {
      accessToken: "token-123",
      user: {
        id: "user-1",
        email: "pt@example.com",
        role: "pt",
      },
    });
  });

  it("propagates backend register errors using the standard api error shape", async () => {
    backendFetchMock.mockRejectedValueOnce(
      new BackendClientError(409, "email_taken", "Email is already registered."),
    );

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "client@example.com",
        password: "password123",
        role: "client",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "email_taken",
        message: "Email is already registered.",
      },
    });
    expect(writeSessionCookieMock).not.toHaveBeenCalled();
  });
});
