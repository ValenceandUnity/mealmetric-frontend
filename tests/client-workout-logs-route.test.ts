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

import { GET, POST } from "@/app/api/client/training/workout-logs/route";

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

describe("POST /api/client/training/workout-logs", () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    requireSessionMock.mockReset();
  });

  it("forwards standalone workout-log payloads through the protected backend client without injecting anchors", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "client" } });
    backendFetchMock.mockResolvedValue({
      id: "log-123",
      mode: "general_workout",
      assignment_id: null,
      routine_id: null,
      pt_user_id: null,
      exercise_entries: [{ id: "entry-1", exercise_name: "Bench Press", position: 0 }],
    });

    const requestBody = {
      mode: "general_workout",
      performed_at: "2026-03-20T12:30:00Z",
      completion_status: "completed",
      exercise_entries: [{ exercise_name: "Bench Press", position: 0 }],
    };
    const request = new Request("http://localhost/api/client/training/workout-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        id: "log-123",
        mode: "general_workout",
        assignment_id: null,
        routine_id: null,
        pt_user_id: null,
        exercise_entries: [{ id: "entry-1", exercise_name: "Bench Press", position: 0 }],
      },
    });
    expect(requireSessionMock).toHaveBeenCalledWith("client");
    expect(backendFetchMock).toHaveBeenCalledWith("/client/training/workout-logs", {
      method: "POST",
      session: { accessToken: "token-123", user: { role: "client" } },
      body: requestBody,
    });
  });
});
