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

  it("renders the training portfolio accordion from the existing PT BFF routes", async () => {
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
              {
                id: "folder-2",
                name: "Recovery",
                description: "Mobility and reset work",
                sort_order: 2,
              },
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
                description: "Four-week progressive overload block",
                status: "active",
                duration_days: 28,
                is_template: false,
              },
              {
                id: "package-2",
                folder_id: "folder-2",
                title: "Recovery Reset",
                description: "Lower-load deload cycle",
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
                description: "Posterior-chain prep",
                difficulty: "advanced",
                estimated_minutes: 55,
                is_archived: false,
              },
              {
                id: "routine-2",
                folder_id: "folder-2",
                title: "Recovery Flow",
                description: "Breathing and mobility sequence",
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
      expect(screen.getByRole("heading", { name: "Training Portfolio" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/pt/folders", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/packages", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/routines", { cache: "no-store" });
    expect(screen.getByRole("heading", { name: "PT Training" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/pt/settings");
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search PT training" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 })[0]?.textContent).toBe("Training Portfolio");
    expect(screen.queryByRole("heading", { name: "Training overview" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Portfolio cards" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Routine cards" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Management status" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Folder lanes" })).toBeNull();
    expect(screen.queryByText("Editor routes are not wired yet")).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit folders unavailable" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add new portfolio unavailable" })).toBeNull();

    const strengthFolderButton = screen.getByRole("button", { name: "Strength" });
    const recoveryFolderButton = screen.getByRole("button", { name: "Recovery" });
    const fetchCallCount = fetchMock.mock.calls.length;

    expect(strengthFolderButton.getAttribute("aria-expanded")).toBe("false");
    expect(recoveryFolderButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Strength")).toBeTruthy();

    fireEvent.click(strengthFolderButton);

    await waitFor(() => {
      expect(strengthFolderButton.getAttribute("aria-expanded")).toBe("true");
    });

    expect(screen.getByText("Barbell-first programming")).toBeTruthy();
    expect(screen.getByText("Strength Camp")).toBeTruthy();
    expect(screen.getByText("Deadlift Primer")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);

    fireEvent.click(recoveryFolderButton);

    await waitFor(() => {
      expect(recoveryFolderButton.getAttribute("aria-expanded")).toBe("true");
    });

    expect(strengthFolderButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Strength Camp")).toBeNull();
    expect(screen.getByText("Recovery Reset")).toBeTruthy();
    expect(screen.getByText("Recovery Flow")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
  });

  it("filters loaded training portfolio folders locally without issuing new requests", async () => {
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
      expect(screen.getByRole("button", { name: "Strength" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Recovery" })).toBeTruthy();
    });

    const searchbox = screen.getByRole("searchbox", { name: "Search PT training" });
    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.change(searchbox, {
      target: { value: "Recovery" },
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Strength" })).toBeNull();
      expect(screen.getByRole("button", { name: "Recovery" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);

    fireEvent.click(screen.getByRole("button", { name: "Recovery" }));

    await waitFor(() => {
      expect(screen.getByText("Recovery Reset")).toBeTruthy();
      expect(screen.getByText("Recovery Flow")).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
  });

  it("renders a safe empty state when the PT training routes return no folders, packages, or routines", async () => {
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
      expect(screen.getByRole("heading", { name: "No training folders yet." })).toBeTruthy();
    });

    expect(screen.queryByRole("heading", { name: "Training overview" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Portfolio cards" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Routine cards" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Management status" })).toBeNull();
  });

  it("renders a safe Training Portfolio unavailable state when the folders route fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/folders") {
        return jsonResponse({
          ok: false,
          error: {
            code: "internal_error",
            message: "Unavailable: /api/pt/folders",
          },
        });
      }

      if (url === "/api/pt/packages" || url === "/api/pt/routines") {
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
      expect(screen.getAllByText("Training Portfolio unavailable").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("Unavailable: /api/pt/folders")).toBeTruthy();
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
