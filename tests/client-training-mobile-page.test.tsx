import React from "react";
import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/training",
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

import ClientTrainingHubPage from "@/app/client/training/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("ClientTrainingHubPage mobile experience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    useSessionBootstrapMock.mockReset();
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "client-1",
        email: "client@example.com",
        role: "client",
      },
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the mobile workout journal surface and assignment cards from the existing BFF route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/training") {
        return jsonResponse({
          ok: true,
          data: [{
            id: "assignment-1",
            title: "Strength Block",
            description: "Four-week progression",
            status: "active",
            pt_name: "Coach Rivera",
            progress_percent: 50,
            checklist: [{ id: "task-1", title: "Warm up", completed: true }],
            routines: [{ id: "routine-1", title: "Leg Day" }],
          }],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientTrainingHubPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Training Journal" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/client/training", { cache: "no-store" });
    expect(screen.getByRole("searchbox", { name: "Search training" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "History" }).getAttribute("href")).toBe("/client/training/history");
    expect(screen.getByRole("link", { name: "Log your reps" }).getAttribute("href")).toBe("/client/add-log");
    expect(screen.getAllByText("Strength Block").length).toBeGreaterThan(0);
    expect(screen.getByText("Warm up")).toBeTruthy();
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/client/training/assignment-1"),
    ).toBe(true);
  });

  it("renders a safe empty state when no assignments exist", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/training") {
        return jsonResponse({
          ok: true,
          data: [],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientTrainingHubPage));

    await waitFor(() => {
      expect(screen.getByText("No training assigned yet")).toBeTruthy();
    });
  });

  it("does not bypass client session bootstrap before fetching", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(ClientTrainingHubPage));

    expect(screen.getByText("Loading training workspace")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
