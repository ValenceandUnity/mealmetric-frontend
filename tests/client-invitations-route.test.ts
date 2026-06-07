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

import { GET } from "@/app/api/client/invitations/route";
import { POST as POST_ACCEPT } from "@/app/api/client/invitations/[invitationId]/accept/route";
import { POST as POST_DECLINE } from "@/app/api/client/invitations/[invitationId]/decline/route";

describe("Client invitation BFF routes", () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    requireSessionMock.mockReset();
  });

  it("loads client invitations through the protected backend client", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "client" } });
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
    expect(backendFetchMock).toHaveBeenCalledWith("/client/invitations", {
      session: { accessToken: "token-123", user: { role: "client" } },
    });
  });

  it("accepts a client invitation through the protected backend client", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "client" } });
    backendFetchMock.mockResolvedValue({ id: "invite-1", status: "accepted" });

    const response = await POST_ACCEPT(new Request("http://localhost"), {
      params: Promise.resolve({ invitationId: "invite-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        id: "invite-1",
        status: "accepted",
      },
    });
    expect(backendFetchMock).toHaveBeenCalledWith("/client/invitations/invite-1/accept", {
      method: "POST",
      session: { accessToken: "token-123", user: { role: "client" } },
    });
  });

  it("declines a client invitation through the protected backend client", async () => {
    requireSessionMock.mockResolvedValue({ accessToken: "token-123", user: { role: "client" } });
    backendFetchMock.mockResolvedValue({ id: "invite-1", status: "declined" });

    const response = await POST_DECLINE(new Request("http://localhost"), {
      params: Promise.resolve({ invitationId: "invite-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        id: "invite-1",
        status: "declined",
      },
    });
    expect(backendFetchMock).toHaveBeenCalledWith("/client/invitations/invite-1/decline", {
      method: "POST",
      session: { accessToken: "token-123", user: { role: "client" } },
    });
  });
});
