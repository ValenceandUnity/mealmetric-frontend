import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pt/training",
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

import PTTrainingPage from "@/app/pt/training/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("PTTrainingPage mobile experience", () => {
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

  it("renders the PT training mobile hub from protected PT BFF routes", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/folders") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "folder-1",
                name: "Strength",
                description: "Barbell-first programming",
                sort_order: 1,
              },
            ],
            count: 1,
          },
        });
      }

      if (url === "/api/pt/packages") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "package-1",
                folder_id: "folder-1",
                title: "Strength Camp",
                description: "Four-week progressive overload block",
                status: "active",
                duration_days: 28,
                is_template: false,
              },
            ],
            count: 1,
          },
        });
      }

      if (url === "/api/pt/routines") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "routine-1",
                folder_id: "folder-1",
                title: "Deadlift Primer",
                description: "Posterior-chain prep",
                difficulty: "advanced",
                estimated_minutes: 55,
                is_archived: false,
              },
            ],
            count: 1,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByText("Strength Camp")).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/pt/folders", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/packages", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/routines", { cache: "no-store" });
    expect(screen.getByRole("heading", { name: "PT Training" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search PT training" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Filter to Strength folder" })).toBeTruthy();
    expect(screen.getByText("Barbell-first programming")).toBeTruthy();
    expect(screen.getByText("Deadlift Primer")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit folders unavailable" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Add new portfolio unavailable" }).hasAttribute("disabled")).toBe(true);
  });

  it("filters already-fetched PT training data locally without issuing new requests", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/folders") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              { id: "folder-1", name: "Strength", description: "Power block", sort_order: 1 },
              { id: "folder-2", name: "Recovery", description: "Mobility block", sort_order: 2 },
            ],
            count: 2,
          },
        });
      }

      if (url === "/api/pt/packages") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "package-1",
                folder_id: "folder-1",
                title: "Strength Camp",
                description: "Barbell cycle",
                status: "active",
                duration_days: 28,
                is_template: false,
              },
              {
                id: "package-2",
                folder_id: "folder-2",
                title: "Recovery Reset",
                description: "Deload cycle",
                status: "draft",
                duration_days: 14,
                is_template: true,
              },
            ],
            count: 2,
          },
        });
      }

      if (url === "/api/pt/routines") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "routine-1",
                folder_id: "folder-1",
                title: "Deadlift Primer",
                description: "Heavy pulling prep",
                difficulty: "advanced",
                estimated_minutes: 55,
                is_archived: false,
              },
              {
                id: "routine-2",
                folder_id: "folder-2",
                title: "Recovery Flow",
                description: "Mobility sequence",
                difficulty: "easy",
                estimated_minutes: 20,
                is_archived: false,
              },
            ],
            count: 2,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByText("Strength Camp")).toBeTruthy();
      expect(screen.getByText("Recovery Reset")).toBeTruthy();
    });

    const searchbox = screen.getByRole("searchbox", { name: "Search PT training" });
    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.change(searchbox, {
      target: { value: "Recovery" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Strength Camp")).toBeNull();
      expect(screen.queryByText("Deadlift Primer")).toBeNull();
      expect(screen.getByText("Recovery Reset")).toBeTruthy();
      expect(screen.getByText("Recovery Flow")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Filter to Recovery folder" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
  });

  it("renders safe empty states when the PT training routes return no folders, packages, or routines", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (
        url === "/api/pt/folders" ||
        url === "/api/pt/packages" ||
        url === "/api/pt/routines"
      ) {
        return jsonResponse({
          ok: true,
          data: {
            items: [],
            count: 0,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "No folders yet" })).toBeTruthy();
    });

    expect(screen.getByRole("heading", { name: "No portfolios yet" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "No routines yet" })).toBeTruthy();
  });

  it("renders a protected unavailable state when every PT training route fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (
        url === "/api/pt/folders" ||
        url === "/api/pt/packages" ||
        url === "/api/pt/routines"
      ) {
        return jsonResponse({
          ok: false,
          error: {
            code: "internal_error",
            message: `Unavailable: ${url}`,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "PT training unavailable" })).toBeTruthy();
    });

    expect(screen.getByText(/does not fall back to direct backend calls/i)).toBeTruthy();
  });

  it("does not bypass PT session bootstrap before fetching PT training data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(PTTrainingPage));

    expect(screen.getByText("Loading PT training")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
