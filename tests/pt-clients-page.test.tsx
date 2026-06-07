import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pt/clients",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    React.createElement("a", { href, className }, children),
}));

vi.mock("@/lib/client/session", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/client/session")>("@/lib/client/session");
  return {
    ...actual,
    useSessionBootstrap: useSessionBootstrapMock,
  };
});

import PTClientsPage from "@/app/pt/clients/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("PTClientsPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    useSessionBootstrapMock.mockReset();
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "pt-1",
        email: "pt@example.com",
        role: "pt",
      },
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders Client Roster, keeps the invite form collapsed by default, and orders folders with Add a New Category last", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/roster-categories") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              { id: "cat-1", pt_user_id: "pt-1", name: "MVPs", created_at: "2026-06-07T00:00:00Z", updated_at: "2026-06-07T00:00:00Z" },
              { id: "cat-2", pt_user_id: "pt-1", name: "Rehab", created_at: "2026-06-07T00:00:01Z", updated_at: "2026-06-07T00:00:01Z" },
            ],
            count: 2,
          },
        });
      }

      if (url === "/api/pt/clients") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "link-1",
                pt_user_id: "pt-1",
                client_user_id: "client-1",
                status: "active",
                client_name: "Goku",
                client_email: "goku@example.com",
                roster_category_id: "cat-1",
                roster_name: "MVPs",
                created_at: "2026-06-07T00:00:00Z",
                updated_at: "2026-06-07T00:00:00Z",
              },
            ],
            count: 1,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTClientsPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Client Roster" })).toBeTruthy();
    });

    expect(screen.queryByRole("heading", { name: "Your Roster" })).toBeNull();
    expect(screen.getByRole("button", { name: "Invite a Client" })).toBeTruthy();
    expect(screen.queryByLabelText("Client email")).toBeNull();
    expect(screen.queryByRole("button", { name: "Send Invite" })).toBeNull();
    expect(screen.queryByText("Pending and recent roster invites")).toBeNull();

    const folderList = screen.getByRole("list", { name: "PT roster folders" });
    const allClientsButton = within(folderList).getByRole("button", {
      name: "Open All Clients roster folder",
    });
    const mvpsButton = within(folderList).getByRole("button", {
      name: "Open MVPs roster folder",
    });
    const rehabButton = within(folderList).getByRole("button", {
      name: "Open Rehab roster folder",
    });
    const addCategoryButton = within(folderList).getByRole("button", {
      name: "Add a new roster category",
    });

    expect(allClientsButton.compareDocumentPosition(mvpsButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(mvpsButton.compareDocumentPosition(rehabButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(rehabButton.compareDocumentPosition(addCategoryButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("reveals the invite form on demand and collapses it again after a successful invite", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/pt/roster-categories" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [],
            count: 0,
          },
        });
      }

      if (url === "/api/pt/clients" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [],
            count: 0,
          },
        });
      }

      if (url === "/api/pt/client-invitations" && method === "POST") {
        return jsonResponse({
          ok: true,
          data: {
            id: "invite-1",
            client_email: "client@example.com",
            pt_user_id: "pt-1",
            client_user_id: "client-1",
            pt_email: "pt@example.com",
            client_email_snapshot: "client@example.com",
            status: "pending",
            created_at: "2026-06-07T00:00:00Z",
            responded_at: null,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTClientsPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Invite a Client" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Invite a Client" }));

    expect(screen.getByLabelText("Client email")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send Invite" })).toBeTruthy();
    expect(screen.queryByText("Pending and recent roster invites")).toBeNull();

    fireEvent.change(screen.getByLabelText("Client email"), {
      target: { value: "client@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Invite" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/pt/client-invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_email: "client@example.com" }),
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Invite a Client" })).toBeTruthy();
    });
    expect(screen.queryByLabelText("Client email")).toBeNull();
  });
});
