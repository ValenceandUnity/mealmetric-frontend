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

import { GET } from "@/app/api/client/training/workout-logs/route";

describe("GET /api/client/training/workout-logs", () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    requireSessionMock.mockReset();
  });

  it("forwards only the allowed workout-history query params through the protected backend client", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "client" } });
    backendFetchMock.mockResolvedValue({ items: [], count: 0, limit: 30, offset: 0, next_offset: null, has_more: false });

    const request = new Request(
      "http://localhost/api/client/training/workout-logs?limit=30&offset=60&mode=set&search=lunge&unsafe=drop-me",
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        items: [],
        count: 0,
        limit: 30,
        offset: 0,
        next_offset: null,
        has_more: false,
      },
    });
    expect(requireSessionMock).toHaveBeenCalledWith("client");
    expect(backendFetchMock).toHaveBeenCalledWith("/client/training/workout-logs", {
      session: { accessToken: "token-123", user: { role: "client" } },
      searchParams: expect.any(URLSearchParams),
    });

    const searchParams = backendFetchMock.mock.calls[0][1].searchParams as URLSearchParams;
    expect(searchParams.toString()).toBe("limit=30&offset=60&mode=set&search=lunge");
  });
});
