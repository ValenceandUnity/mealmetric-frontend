import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchMock,
  pathnameState,
  useSessionBootstrapMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  pathnameState: { value: "/client/notifications" },
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => React.createElement("a", { href, className, ...rest }, children),
}));

vi.mock("@/lib/client/session", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/client/session")>("@/lib/client/session");
  return {
    ...actual,
    useSessionBootstrap: useSessionBootstrapMock,
  };
});

import ClientNotificationsRoute from "@/app/client/notifications/page";
import PTNotificationsRoute from "@/app/pt/notifications/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("Notifications routes mobile experience", () => {
  beforeEach(() => {
    vi.useRealTimers();
    fetchMock.mockReset();
    useSessionBootstrapMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders /client/notifications on the mobile foundation and preserves the existing notifications plus invitations fetches", async () => {
    pathnameState.value = "/client/notifications";
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "client-1",
        email: "client@example.com",
        role: "client",
      },
    });

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/notifications" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "notification-1",
                recipient_user_id: "client-1",
                actor_user_id: "pt-1",
                type: "client_workout_logged",
                title: "Workout Logged",
                message: "Your latest workout was recorded.",
                related_entity_type: "workout_log",
                related_entity_id: "log-1",
                is_read: false,
                created_at: "2026-06-08T10:00:00Z",
              },
              {
                id: "notification-2",
                recipient_user_id: "client-1",
                actor_user_id: "pt-1",
                type: "pt_client_invitation_received",
                title: "PT Invitation",
                message: "A PT invited you.",
                related_entity_type: "pt_client_invitation",
                related_entity_id: "invite-1",
                is_read: false,
                created_at: "2026-06-08T09:00:00Z",
              },
            ],
            count: 2,
          },
        });
      }

      if (url === "/api/client/invitations" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "invite-1",
                pt_user_id: "pt-1",
                client_user_id: "client-1",
                pt_email: "pt@example.com",
                client_email: "client@example.com",
                client_email_snapshot: null,
                status: "pending",
                created_at: "2026-06-08T09:00:00Z",
                responded_at: null,
              },
            ],
            count: 1,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientNotificationsRoute));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Client Notifications" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/notifications", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/client/invitations", { cache: "no-store" });
    expect(screen.getByText("Notification summary")).toBeTruthy();
    expect(screen.getByText("PT roster invitation")).toBeTruthy();
    expect(screen.getByText("Workout Logged")).toBeTruthy();
    expect(screen.getByText("Your latest workout was recorded.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Accept PT roster invitation/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Decline PT roster invitation/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Mark Workout Logged as read/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /archive|delete|preferences|mark all/i })).toBeNull();

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls).toEqual(["/api/notifications", "/api/client/invitations"]);
    expect(requestedUrls).not.toContain("/api/notifications/unread-count");
    expect(requestedUrls.every((url) => url.startsWith("/api/"))).toBe(true);
  });

  it("renders /pt/notifications as a distinct PT mobile route and preserves the existing notifications fetch only", async () => {
    pathnameState.value = "/pt/notifications";
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "pt-1",
        email: "pt@example.com",
        role: "pt",
      },
    });

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/notifications" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "notification-1",
                recipient_user_id: "pt-1",
                actor_user_id: "client-1",
                type: "client_workout_logged",
                title: "Client Workout Logged",
                message: "A linked client recorded a workout.",
                related_entity_type: "workout_log",
                related_entity_id: "log-1",
                is_read: true,
                created_at: "2026-06-08T10:00:00Z",
              },
            ],
            count: 1,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTNotificationsRoute));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "PT Notifications" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/notifications", { cache: "no-store" });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(["/api/notifications"]);
    expect(screen.getByText("A linked client recorded a workout.")).toBeTruthy();
    expect(screen.queryByText("PT roster invitation")).toBeNull();
  });

  it("preserves mark-as-read through PATCH /api/notifications/[notificationId]/read without adding other notification mutations", async () => {
    pathnameState.value = "/pt/notifications";
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "pt-1",
        email: "pt@example.com",
        role: "pt",
      },
    });

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/notifications" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "notification-1",
                recipient_user_id: "pt-1",
                actor_user_id: "client-1",
                type: "client_workout_logged",
                title: "Client Workout Logged",
                message: "A linked client recorded a workout.",
                related_entity_type: "workout_log",
                related_entity_id: "log-1",
                is_read: false,
                created_at: "2026-06-08T10:00:00Z",
              },
            ],
            count: 1,
          },
        });
      }

      if (url === "/api/notifications/notification-1/read" && method === "PATCH") {
        return jsonResponse({
          ok: true,
          data: {
            id: "notification-1",
            recipient_user_id: "pt-1",
            actor_user_id: "client-1",
            type: "client_workout_logged",
            title: "Client Workout Logged",
            message: "A linked client recorded a workout.",
            related_entity_type: "workout_log",
            related_entity_id: "log-1",
            is_read: true,
            created_at: "2026-06-08T10:00:00Z",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTNotificationsRoute));

    const markReadButton = await screen.findByRole("button", { name: /Mark Client Workout Logged as read/ });
    fireEvent.click(markReadButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/notifications/notification-1/read", {
        method: "PATCH",
      });
    });

    expect(screen.getByText("Read")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Mark Client Workout Logged as read/ })).toBeNull();
    expect(
      fetchMock.mock.calls.filter(([, init]) => {
        const method = (init?.method ?? "GET").toUpperCase();
        return method !== "GET" && method !== "PATCH";
      }),
    ).toHaveLength(0);
  });

  it("preserves client invitation acceptance through the existing accept route and updates visible notification state", async () => {
    pathnameState.value = "/client/notifications";
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "client-1",
        email: "client@example.com",
        role: "client",
      },
    });

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/notifications" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "notification-2",
                recipient_user_id: "client-1",
                actor_user_id: "pt-1",
                type: "pt_client_invitation_received",
                title: "PT Invitation",
                message: "A PT invited you.",
                related_entity_type: "pt_client_invitation",
                related_entity_id: "invite-1",
                is_read: false,
                created_at: "2026-06-08T09:00:00Z",
              },
            ],
            count: 1,
          },
        });
      }

      if (url === "/api/client/invitations" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "invite-1",
                pt_user_id: "pt-1",
                client_user_id: "client-1",
                pt_email: "pt@example.com",
                client_email: "client@example.com",
                client_email_snapshot: null,
                status: "pending",
                created_at: "2026-06-08T09:00:00Z",
                responded_at: null,
              },
            ],
            count: 1,
          },
        });
      }

      if (url === "/api/client/invitations/invite-1/accept" && method === "POST") {
        return jsonResponse({
          ok: true,
          data: {
            id: "invite-1",
            pt_user_id: "pt-1",
            client_user_id: "client-1",
            pt_email: "pt@example.com",
            client_email: "client@example.com",
            client_email_snapshot: null,
            status: "accepted",
            created_at: "2026-06-08T09:00:00Z",
            responded_at: "2026-06-08T10:00:00Z",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientNotificationsRoute));

    const acceptButton = await screen.findByRole("button", {
      name: /Accept PT roster invitation from pt@example.com/,
    });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/client/invitations/invite-1/accept", {
        method: "POST",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("PT Invitation")).toBeTruthy();
    });

    expect(screen.queryByText("PT roster invitation")).toBeNull();
    expect(screen.getByText("Read")).toBeTruthy();
  });

  it("renders empty and error states safely and preserves session gating", async () => {
    pathnameState.value = "/client/notifications";
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(ClientNotificationsRoute));

    expect(screen.getByText("Loading notifications")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders the existing empty state when no notifications or invitations exist", async () => {
    pathnameState.value = "/client/notifications";
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "client-1",
        email: "client@example.com",
        role: "client",
      },
    });

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/notifications" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [],
            count: 0,
          },
        });
      }

      if (url === "/api/client/invitations" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [],
            count: 0,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientNotificationsRoute));

    await waitFor(() => {
      expect(screen.getByText("No notifications")).toBeTruthy();
    });

    expect(screen.getByText("High-value in-app events will appear here when they actually happen.")).toBeTruthy();
  });

  it("renders the existing error state when the notifications BFF route fails", async () => {
    pathnameState.value = "/pt/notifications";
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "pt-1",
        email: "pt@example.com",
        role: "pt",
      },
    });

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/notifications" && method === "GET") {
        return jsonResponse({
          ok: false,
          error: {
            code: "upstream_error",
            message: "Unable to load notifications.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTNotificationsRoute));

    await waitFor(() => {
      expect(screen.getByText("Unable to load notifications.")).toBeTruthy();
    });

    expect(screen.getAllByText("Unable to load notifications").length).toBeGreaterThan(0);
  });
});
