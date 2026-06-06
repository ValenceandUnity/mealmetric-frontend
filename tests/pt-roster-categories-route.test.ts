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

import { GET, POST } from "@/app/api/pt/roster-categories/route";
import { PATCH } from "@/app/api/pt/clients/[clientId]/roster-category/route";

describe("PT roster category BFF routes", () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    requireSessionMock.mockReset();
  });

  it("loads PT roster categories through the protected backend client", async () => {
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
    expect(backendFetchMock).toHaveBeenCalledWith("/pt/roster-categories", {
      session: { accessToken: "token-123", user: { role: "pt" } },
    });
  });

  it("creates a PT roster category with a validated name only", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "pt" } });
    backendFetchMock.mockResolvedValue({ id: "cat-1", name: "Strength Focus" });

    const request = new Request("http://localhost/api/pt/roster-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Strength Focus", unsafe: "drop-me" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toEqual({
      ok: true,
      data: {
        id: "cat-1",
        name: "Strength Focus",
      },
    });
    expect(backendFetchMock).toHaveBeenCalledWith("/pt/roster-categories", {
      method: "POST",
      session: { accessToken: "token-123", user: { role: "pt" } },
      body: {
        name: "Strength Focus",
      },
    });
  });

  it("rejects an empty PT roster category name before calling the backend", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "pt" } });

    const request = new Request("http://localhost/api/pt/roster-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "   " }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "invalid_request",
        message: "Roster category name is required.",
      },
    });
    expect(backendFetchMock).not.toHaveBeenCalled();
  });

  it("updates a client roster category through the PT BFF route", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "pt" } });
    backendFetchMock.mockResolvedValue({
      id: "link-1",
      client_user_id: "client-1",
      roster_category_id: "cat-1",
    });

    const request = new Request("http://localhost/api/pt/clients/client-1/roster-category", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roster_category_id: "cat-1", unsafe: "drop-me" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ clientId: "client-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        id: "link-1",
        client_user_id: "client-1",
        roster_category_id: "cat-1",
      },
    });
    expect(backendFetchMock).toHaveBeenCalledWith("/pt/clients/client-1/roster-category", {
      method: "PATCH",
      session: { accessToken: "token-123", user: { role: "pt" } },
      body: {
        roster_category_id: "cat-1",
      },
    });
  });
});
