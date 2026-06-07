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

import { GET } from "@/app/api/pt/routines/route";

describe("GET /api/pt/routines", () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    requireSessionMock.mockReset();
  });

  it("loads PT routines through the protected backend client", async () => {
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
    expect(requireSessionMock).toHaveBeenCalledWith("pt");
    expect(backendFetchMock).toHaveBeenCalledWith("/pt/routines", {
      session: { accessToken: "token-123", user: { role: "pt" } },
    });
  });

  it("normalizes PT routine backend failures through the shared API error response", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "pt" } });
    backendFetchMock.mockRejectedValue(new Error("boom"));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "internal_error",
        message: "Unable to load PT routines.",
      },
    });
  });
});
