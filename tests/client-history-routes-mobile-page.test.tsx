import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/training/history",
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

import AddLogFullHistoryPage from "@/app/client/add-log/full-log-history/page";
import ClientWorkoutHistoryPage from "@/app/client/training/history/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

function historyPayload(args?: {
  items?: unknown[];
  count?: number;
  limit?: number;
  offset?: number;
  nextOffset?: number | null;
  hasMore?: boolean;
}) {
  return {
    ok: true,
    data: {
      items: args?.items ?? [
        {
          id: "log-1",
          performed_at: "2026-06-08T10:00:00Z",
          mode: "rep",
          client_notes: "Client note",
          pt_notes: "PT note",
          exercise_entries: [
            {
              id: "entry-1",
              exercise_name: "Bench Press",
              sets: 4,
              reps: 8,
              weight: 135.5,
              duration_seconds: 90,
              notes: "Entry note",
              position: 0,
            },
          ],
        },
        {
          id: "log-2",
          performed_at: "2026-06-01T09:00:00Z",
          mode: "set",
          client_notes: null,
          pt_notes: null,
          exercise_entries: [
            {
              id: "entry-2",
              exercise_name: "Goblet Squat",
              sets: 3,
              reps: 10,
              weight: 50,
              duration_seconds: 60,
              notes: null,
              position: 0,
            },
          ],
        },
      ],
      count: args?.count ?? 2,
      limit: args?.limit ?? 30,
      offset: args?.offset ?? 0,
      next_offset: args?.nextOffset ?? null,
      has_more: args?.hasMore ?? false,
    },
  };
}

describe("Client history routes mobile experience", () => {
  beforeEach(() => {
    vi.useRealTimers();
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

  it("renders /client/add-log/full-log-history without the utility section and preserves the existing workout-history BFF fetch", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/workout-logs?limit=30&offset=0" && method === "GET") {
        return jsonResponse(historyPayload());
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(AddLogFullHistoryPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Full Log History" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/client/training/workout-logs?limit=30&offset=0",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(screen.getByRole("link", { name: "Back to log workout" }).getAttribute("href")).toBe("/client/add-log");
    expect(screen.queryByText("History utility")).toBeNull();
    expect(screen.queryByText("Protected client route")).toBeNull();
    expect(screen.queryByText("Returned logs")).toBeNull();
    expect(screen.queryByText("Older entries available")).toBeNull();
    expect(screen.getByText("Log Archive By Date")).toBeTruthy();
    expect(screen.getByLabelText("Archive date")).toHaveProperty("type", "date");
    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("Goblet Squat")).toBeTruthy();
    expect(screen.getByText("Notes: Entry note Client note PT note")).toBeTruthy();
    expect(screen.getByText("Sets 4")).toBeTruthy();
    expect(screen.getByText("Reps 8")).toBeTruthy();
    expect(screen.getByText("Weight 135.5")).toBeTruthy();
    expect(screen.getByText("Time 1m 30s")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /save|edit|delete|export/i })).toBeNull();

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.every((url) => url.startsWith("/api/client/training/workout-logs"))).toBe(true);
    const mutationCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init?.method ?? "GET").toUpperCase() !== "GET",
    );
    expect(mutationCalls).toHaveLength(0);
  });

  it("renders /client/training/history as a distinct mobile utility route with the existing training back link", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/workout-logs?limit=30&offset=0" && method === "GET") {
        return jsonResponse(historyPayload());
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientWorkoutHistoryPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Training History" })).toBeTruthy();
    });

    expect(screen.getByRole("link", { name: "Back to training" }).getAttribute("href")).toBe("/client/training");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/client/training/workout-logs?limit=30&offset=0",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(screen.getByText("History utility")).toBeTruthy();
    expect(screen.getByText("Protected client route")).toBeTruthy();
  });

  it("filters the add-log full history page by archive date without changing the BFF query", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/workout-logs?limit=30&offset=0" && method === "GET") {
        return jsonResponse(historyPayload());
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(AddLogFullHistoryPage));

    await waitFor(() => {
      expect(screen.getByText("Bench Press")).toBeTruthy();
    });

    expect(screen.getByText("Goblet Squat")).toBeTruthy();

    const archiveDateInput = screen.getByLabelText("Archive date");
    const initialFetchCallCount = fetchMock.mock.calls.length;

    fireEvent.change(archiveDateInput, {
      target: { value: "2026-06-08" },
    });

    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.queryByText("Goblet Squat")).toBeNull();
    expect(fetchMock.mock.calls).toHaveLength(initialFetchCallCount);

    fireEvent.change(archiveDateInput, {
      target: { value: "2026-06-01" },
    });

    expect(screen.getByText("Goblet Squat")).toBeTruthy();
    expect(screen.queryByText("Bench Press")).toBeNull();
    expect(fetchMock.mock.calls).toHaveLength(initialFetchCallCount);

    fireEvent.click(screen.getByRole("button", { name: "Clear date" }));

    expect((screen.getByLabelText("Archive date") as HTMLInputElement).value).toBe("");
    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("Goblet Squat")).toBeTruthy();

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.every((url) => !url.includes("date="))).toBe(true);
  });

  for (const [label, Page] of [
    ["full log history", AddLogFullHistoryPage],
    ["training history", ClientWorkoutHistoryPage],
  ] as const) {
    it(`preserves client session bootstrap gating for ${label}`, () => {
      useSessionBootstrapMock.mockReturnValue({
        status: "loading",
        user: null,
      });

      render(React.createElement(Page));

      expect(screen.getByText("Loading workout history")).toBeTruthy();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  }

  it("preserves query params and older-entry pagination on the existing client workout-history route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method !== "GET") {
        throw new Error(`Unexpected mutation: ${method} ${url}`);
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0") {
        return jsonResponse(historyPayload({ nextOffset: 30, hasMore: true }));
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0&mode=set") {
        return jsonResponse(historyPayload({
          items: [
            {
              id: "log-set-1",
              performed_at: "2026-06-08T09:30:00Z",
              mode: "set",
              exercise_entries: [
                {
                  id: "entry-set-1",
                  exercise_name: "Goblet Squat",
                  sets: 3,
                  reps: 10,
                  weight: 50,
                  duration_seconds: 60,
                  position: 0,
                },
              ],
            },
          ],
          nextOffset: 30,
          hasMore: true,
        }));
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0&mode=set&search=bench") {
        return jsonResponse(historyPayload({
          items: [
            {
              id: "log-search-1",
              performed_at: "2026-06-08T09:30:00Z",
              mode: "set",
              exercise_entries: [
                {
                  id: "entry-search-1",
                  exercise_name: "Bench Supported Row",
                  sets: 3,
                  reps: 12,
                  weight: 60,
                  duration_seconds: 60,
                  position: 0,
                },
              ],
            },
          ],
          nextOffset: 30,
          hasMore: true,
        }));
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=30&mode=set&search=bench") {
        return jsonResponse(historyPayload({
          items: [
            {
              id: "log-search-2",
              performed_at: "2026-06-01T09:30:00Z",
              mode: "set",
              exercise_entries: [
                {
                  id: "entry-search-2",
                  exercise_name: "Bench Supported Row",
                  sets: 2,
                  reps: 12,
                  weight: 55,
                  duration_seconds: 60,
                  position: 0,
                },
              ],
            },
          ],
          count: 2,
          limit: 30,
          offset: 30,
          nextOffset: null,
          hasMore: false,
        }));
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(AddLogFullHistoryPage));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client/training/workout-logs?limit=30&offset=0",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Set" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client/training/workout-logs?limit=30&offset=0&mode=set",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "bench" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client/training/workout-logs?limit=30&offset=0&mode=set&search=bench",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Show older workout entries" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client/training/workout-logs?limit=30&offset=30&mode=set&search=bench",
        expect.objectContaining({ cache: "no-store" }),
      );
    });
  });

  it("renders the existing empty state when no workout logs are returned", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/workout-logs?limit=30&offset=0" && method === "GET") {
        return jsonResponse(historyPayload({ items: [], count: 0 }));
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientWorkoutHistoryPage));

    await waitFor(() => {
      expect(screen.getByText("No logged workouts yet.")).toBeTruthy();
    });
  });

  it("renders the existing error state when the client workout-history BFF route fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/workout-logs?limit=30&offset=0" && method === "GET") {
        return jsonResponse({
          ok: false,
          error: {
            code: "upstream_error",
            message: "Unable to load workout history.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(AddLogFullHistoryPage));

    await waitFor(() => {
      expect(screen.getByText("Unable to load workout history.")).toBeTruthy();
    });

    expect(screen.getAllByText("Unable to load workout history").length).toBeGreaterThan(0);
  });
});
