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

import { GET } from "@/app/api/pt/clients/route";

describe("GET /api/pt/clients", () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    requireSessionMock.mockReset();
  });

  it("forwards only the supported roster filter query param through the PT BFF route", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "pt" } });
    backendFetchMock.mockResolvedValue({ items: [], count: 0 });

    const request = new Request(
      "http://localhost/api/pt/clients?category_id=cat-123&unsafe=drop-me",
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        items: [],
        count: 0,
      },
    });
    expect(requireSessionMock).toHaveBeenCalledWith("pt");
    expect(backendFetchMock).toHaveBeenCalledWith("/pt/clients", {
      session: { accessToken: "token-123", user: { role: "pt" } },
      searchParams: expect.any(URLSearchParams),
    });

    const searchParams = backendFetchMock.mock.calls[0][1].searchParams as URLSearchParams;
    expect(searchParams.toString()).toBe("category_id=cat-123");
  });
});
