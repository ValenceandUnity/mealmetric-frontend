import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function createHistoryItem(args: {
  id: string;
  performedAt: string;
  mode: "rep" | "set" | "general_workout";
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  durationSeconds: number | null;
  entryNotes?: string | null;
  clientNotes?: string | null;
  ptNotes?: string | null;
}) {
  return {
    id: args.id,
    performed_at: args.performedAt,
    mode: args.mode,
    client_notes: args.clientNotes ?? null,
    pt_notes: args.ptNotes ?? null,
    exercise_entries: [
      {
        id: `${args.id}-entry-1`,
        exercise_name: args.exerciseName,
        sets: args.sets,
        reps: args.reps,
        weight: args.weight,
        duration_seconds: args.durationSeconds,
        notes: args.entryNotes ?? null,
        position: 0,
      },
    ],
  };
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
      items:
        args?.items ??
        [
          createHistoryItem({
            id: "log-1",
            performedAt: "2026-06-08T10:00:00Z",
            mode: "rep",
            exerciseName: "Bench Press",
            sets: 4,
            reps: 8,
            weight: 135.5,
            durationSeconds: 90,
            entryNotes: "Entry note",
            clientNotes: "Client note",
            ptNotes: "PT note",
          }),
          createHistoryItem({
            id: "log-2",
            performedAt: "2026-06-01T09:00:00Z",
            mode: "set",
            exerciseName: "Goblet Squat",
            sets: 3,
            reps: 10,
            weight: 50,
            durationSeconds: 60,
          }),
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

  it("renders /client/add-log/full-log-history with weekly archive controls and without the utility or type-filter pills", async () => {
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
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(screen.getByRole("link", { name: "Back to log workout" }).getAttribute("href")).toBe("/client/add-log");
    expect(screen.queryByText("History utility")).toBeNull();
    expect(screen.queryByText("Full workout history")).toBeNull();
    expect(screen.queryByText("Protected client route")).toBeNull();
    expect(screen.queryByText("Returned logs")).toBeNull();
    expect(screen.queryByText("Older entries")).toBeNull();
    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rep" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Set" })).toBeNull();
    expect(screen.queryByRole("button", { name: "General Workout" })).toBeNull();
    expect(screen.getByText("Log Archive By Date")).toBeTruthy();
    expect(screen.getByLabelText("Start date")).toHaveProperty("type", "date");
    expect(screen.getByLabelText("End date")).toHaveProperty("type", "date");
    expect(screen.getByText("This Week")).toBeTruthy();
    expect(screen.getByText("Last Week")).toBeTruthy();

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.every((url) => url.startsWith("/api/client/training/workout-logs"))).toBe(true);
    const mutationCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init?.method ?? "GET").toUpperCase() !== "GET",
    );
    expect(mutationCalls).toHaveLength(0);
  });

  it("renders /client/training/history with the existing history utility and type-filter pills", async () => {
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
    expect(screen.getByText("History utility")).toBeTruthy();
    expect(screen.getByText("Protected client route")).toBeTruthy();
    expect(screen.getByRole("button", { name: "All" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rep" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Set" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "General Workout" })).toBeTruthy();
  });

  it("builds weekly archive blocks from a selected date range and expands them into data cells without a type pill", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/workout-logs?limit=30&offset=0" && method === "GET") {
        return jsonResponse(
          historyPayload({
            items: [
              createHistoryItem({
                id: "may-log-1",
                performedAt: "2026-05-03T10:00:00Z",
                mode: "rep",
                exerciseName: "Bench Press",
                sets: 4,
                reps: 8,
                weight: 135.5,
                durationSeconds: 90,
              }),
              createHistoryItem({
                id: "may-log-2",
                performedAt: "2026-05-10T09:00:00Z",
                mode: "set",
                exerciseName: "Goblet Squat",
                sets: 3,
                reps: 10,
                weight: 50,
                durationSeconds: 60,
              }),
            ],
          }),
        );
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(AddLogFullHistoryPage));

    await waitFor(() => {
      expect(screen.getByText("This Week")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-05-01" },
    });
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-05-14" },
    });

    expect(screen.getByText("Week of May 1")).toBeTruthy();
    expect(screen.getByText("Week of May 8")).toBeTruthy();

    const archiveToggle = screen.getByRole("button", { name: "Toggle Week of May 1 archive block" });
    fireEvent.click(archiveToggle);

    const archivePanelId = archiveToggle.getAttribute("aria-controls");
    const archivePanel = archivePanelId ? document.getElementById(archivePanelId) : null;
    expect(archivePanel).toBeTruthy();
    expect(within(archivePanel as HTMLElement).getByText("Bench Press")).toBeTruthy();
    expect(within(archivePanel as HTMLElement).getByText("135.5")).toBeTruthy();
    expect(within(archivePanel as HTMLElement).getByText("1m 30s")).toBeTruthy();
    expect(within(archivePanel as HTMLElement).queryByText("Rep")).toBeNull();
    expect(within(archivePanel as HTMLElement).queryByText("Set")).toBeNull();
    expect(within(archivePanel as HTMLElement).queryByText("General Workout")).toBeNull();
  });

  it("keeps the date range frontend-only and does not refetch or add archive query params", async () => {
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
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client/training/workout-logs?limit=30&offset=0",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    const initialFetchCallCount = fetchMock.mock.calls.length;

    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-05-01" },
    });
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-05-14" },
    });

    expect(fetchMock.mock.calls).toHaveLength(initialFetchCallCount);
    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(
      requestedUrls.every(
        (url) =>
          !url.includes("start_date") &&
          !url.includes("end_date") &&
          !url.includes("date=") &&
          !url.includes("week") &&
          !url.includes("archive"),
      ),
    ).toBe(true);
  });

  it("shows the search overlay on add-log full-history and lets the user close it without clearing the query", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method !== "GET") {
        throw new Error(`Unexpected mutation: ${method} ${url}`);
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0") {
        return jsonResponse(historyPayload());
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0&search=bench") {
        return jsonResponse(
          historyPayload({
            items: [
              createHistoryItem({
                id: "search-overlay-log-1",
                performedAt: "2026-06-08T10:00:00Z",
                mode: "rep",
                exerciseName: "Bench Press",
                sets: 4,
                reps: 8,
                weight: 135.5,
                durationSeconds: 90,
              }),
            ],
          }),
        );
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

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "bench" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client/training/workout-logs?limit=30&offset=0&search=bench",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    const overlay = screen.getByRole("dialog", { name: "Search Results" });
    expect(within(overlay).getByText('Results for "bench"')).toBeTruthy();
    expect(within(overlay).getByText("Bench Press")).toBeTruthy();
    expect(within(overlay).getByText("Sets")).toBeTruthy();
    expect(within(overlay).getByText("Reps")).toBeTruthy();
    expect(within(overlay).getByText("Weight")).toBeTruthy();
    expect(within(overlay).getByText("Time")).toBeTruthy();

    fireEvent.click(within(overlay).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog", { name: "Search Results" })).toBeNull();
    expect((screen.getByLabelText("Search") as HTMLInputElement).value).toBe("bench");
  });

  it("clears the add-log full-history search from the overlay action", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method !== "GET") {
        throw new Error(`Unexpected mutation: ${method} ${url}`);
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0") {
        return jsonResponse(historyPayload());
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0&search=bench") {
        return jsonResponse(
          historyPayload({
            items: [
              createHistoryItem({
                id: "search-overlay-log-2",
                performedAt: "2026-06-08T10:00:00Z",
                mode: "rep",
                exerciseName: "Bench Press",
                sets: 4,
                reps: 8,
                weight: 135.5,
                durationSeconds: 90,
              }),
            ],
          }),
        );
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(AddLogFullHistoryPage));

    await waitFor(() => {
      expect(screen.getByLabelText("Search")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "bench" },
    });

    const overlay = await screen.findByRole("dialog", { name: "Search Results" });
    fireEvent.click(within(overlay).getByRole("button", { name: "Clear search" }));

    await waitFor(() => {
      expect((screen.getByLabelText("Search") as HTMLInputElement).value).toBe("");
    });
    expect(screen.queryByRole("dialog", { name: "Search Results" })).toBeNull();
  });

  it("shows a no-results message in the add-log full-history search overlay when no rows match", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method !== "GET") {
        throw new Error(`Unexpected mutation: ${method} ${url}`);
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0") {
        return jsonResponse(historyPayload());
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0&search=missing") {
        return jsonResponse(historyPayload({ items: [], count: 0 }));
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(AddLogFullHistoryPage));

    await waitFor(() => {
      expect(screen.getByLabelText("Search")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "missing" },
    });

    const overlay = await screen.findByRole("dialog", { name: "Search Results" });
    expect(within(overlay).getByText("No matching logs found.")).toBeTruthy();
  });

  it("preserves add-log full-history search and older-entry pagination without adding a mode query", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method !== "GET") {
        throw new Error(`Unexpected mutation: ${method} ${url}`);
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0") {
        return jsonResponse(historyPayload({ nextOffset: 30, hasMore: true }));
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0&search=bench") {
        return jsonResponse(
          historyPayload({
            items: [
              createHistoryItem({
                id: "search-log-1",
                performedAt: "2026-06-08T10:00:00Z",
                mode: "rep",
                exerciseName: "Bench Press",
                sets: 4,
                reps: 8,
                weight: 135.5,
                durationSeconds: 90,
              }),
            ],
            nextOffset: 30,
            hasMore: true,
          }),
        );
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=30&search=bench") {
        return jsonResponse(
          historyPayload({
            items: [
              createHistoryItem({
                id: "search-log-2",
                performedAt: "2026-06-01T09:00:00Z",
                mode: "set",
                exerciseName: "Bench Supported Row",
                sets: 2,
                reps: 12,
                weight: 55,
                durationSeconds: 60,
              }),
            ],
            count: 2,
            limit: 30,
            offset: 30,
            nextOffset: null,
            hasMore: false,
          }),
        );
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

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "bench" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client/training/workout-logs?limit=30&offset=0&search=bench",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Show older workout entries" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client/training/workout-logs?limit=30&offset=30&search=bench",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.every((url) => !url.includes("mode="))).toBe(true);
  });

  it("does not show the search overlay on /client/training/history", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method !== "GET") {
        throw new Error(`Unexpected mutation: ${method} ${url}`);
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0") {
        return jsonResponse(historyPayload());
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0&search=bench") {
        return jsonResponse(
          historyPayload({
            items: [
              createHistoryItem({
                id: "training-search-log-1",
                performedAt: "2026-06-08T10:00:00Z",
                mode: "rep",
                exerciseName: "Bench Press",
                sets: 4,
                reps: 8,
                weight: 135.5,
                durationSeconds: 90,
              }),
            ],
          }),
        );
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientWorkoutHistoryPage));

    await waitFor(() => {
      expect(screen.getByLabelText("Search")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "bench" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client/training/workout-logs?limit=30&offset=0&search=bench",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    expect(screen.queryByRole("dialog", { name: "Search Results" })).toBeNull();
  });

  it("preserves training-history type-filter queries, search, and older-entry pagination", async () => {
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
        return jsonResponse(
          historyPayload({
            items: [
              createHistoryItem({
                id: "set-log-1",
                performedAt: "2026-06-08T09:30:00Z",
                mode: "set",
                exerciseName: "Goblet Squat",
                sets: 3,
                reps: 10,
                weight: 50,
                durationSeconds: 60,
              }),
            ],
            nextOffset: 30,
            hasMore: true,
          }),
        );
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=0&mode=set&search=bench") {
        return jsonResponse(
          historyPayload({
            items: [
              createHistoryItem({
                id: "set-log-2",
                performedAt: "2026-06-08T09:30:00Z",
                mode: "set",
                exerciseName: "Bench Supported Row",
                sets: 3,
                reps: 12,
                weight: 60,
                durationSeconds: 60,
              }),
            ],
            nextOffset: 30,
            hasMore: true,
          }),
        );
      }

      if (url === "/api/client/training/workout-logs?limit=30&offset=30&mode=set&search=bench") {
        return jsonResponse(
          historyPayload({
            items: [
              createHistoryItem({
                id: "set-log-3",
                performedAt: "2026-06-01T09:30:00Z",
                mode: "set",
                exerciseName: "Bench Supported Row",
                sets: 2,
                reps: 12,
                weight: 55,
                durationSeconds: 60,
              }),
            ],
            count: 2,
            limit: 30,
            offset: 30,
            nextOffset: null,
            hasMore: false,
          }),
        );
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientWorkoutHistoryPage));

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
