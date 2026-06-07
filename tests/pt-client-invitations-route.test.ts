import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock, requireSessionMock } = vi.hoisted(() => ({
  backendFetchMock: vi.fn(),
  requireSessionMock: vi.fn(),
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
    requireSession: requireSessionMock,
  };
});

import { GET, POST } from "@/app/api/pt/client-invitations/route";

describe("PT client invitation BFF routes", () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    requireSessionMock.mockReset();
  });

  it("loads PT client invitations through the protected backend client", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "pt" } });
    backendFetchMock.mockResolvedValue({ items: [], count: 0 });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        items: [],
        count: 0,
      },
    });
    expect(backendFetchMock).toHaveBeenCalledWith("/pt/client-invitations", {
      session: { accessToken: "token-123", user: { role: "pt" } },
    });
  });

  it("sends a PT client invitation with only the validated email field", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "pt" } });
    backendFetchMock.mockResolvedValue({ id: "invite-1", client_email: "goku@example.com" });

    const request = new Request("http://localhost/api/pt/client-invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_email: "  goku@example.com  ", unsafe: "drop-me" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toEqual({
      ok: true,
      data: {
        id: "invite-1",
        client_email: "goku@example.com",
      },
    });
    expect(backendFetchMock).toHaveBeenCalledWith("/pt/client-invitations", {
      method: "POST",
      session: { accessToken: "token-123", user: { role: "pt" } },
      body: {
        client_email: "goku@example.com",
      },
    });
  });

  it("rejects an empty invite email before calling the backend", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "pt" } });

    const request = new Request("http://localhost/api/pt/client-invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_email: "   " }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "invalid_request",
        message: "Client email is required.",
      },
    });
    expect(backendFetchMock).not.toHaveBeenCalled();
  });
});
