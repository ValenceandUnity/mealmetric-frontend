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

import { GET } from "@/app/api/pt/clients/[clientId]/workout-logs/route";

describe("GET /api/pt/clients/[clientId]/workout-logs", () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    requireSessionMock.mockReset();
  });

  it("forwards only supported workout-history query params through the PT BFF route", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "pt" } });
    backendFetchMock.mockResolvedValue({ items: [], count: 0 });

    const request = new Request(
      "http://localhost/api/pt/clients/client-1/workout-logs?limit=30&offset=60&mode=set&search=lunge&unsafe=drop-me",
    );

    const response = await GET(request, {
      params: Promise.resolve({ clientId: "client-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        items: [],
        count: 0,
      },
    });
    expect(backendFetchMock).toHaveBeenCalledWith("/pt/clients/client-1/workout-logs", {
      session: { accessToken: "token-123", user: { role: "pt" } },
      searchParams: expect.any(URLSearchParams),
    });

    const searchParams = backendFetchMock.mock.calls[0][1].searchParams as URLSearchParams;
    expect(searchParams.toString()).toBe("limit=30&offset=60&mode=set&search=lunge");
  });
});
