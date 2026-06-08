import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, searchParamsMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  searchParamsMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ clientId: "client-1" }),
  usePathname: () => "/pt/clients/client-1/log-history",
  useSearchParams: () => searchParamsMock(),
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

import PTClientLogHistoryPage from "@/app/pt/clients/[clientId]/log-history/page";

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
      ],
      count: args?.count ?? 1,
      limit: args?.limit ?? 30,
      offset: args?.offset ?? 0,
      next_offset: args?.nextOffset ?? null,
      has_more: args?.hasMore ?? false,
    },
  };
}

describe("PTClientLogHistoryPage mobile experience", () => {
  beforeEach(() => {
    vi.useRealTimers();
    fetchMock.mockReset();
    searchParamsMock.mockReset();
    useSessionBootstrapMock.mockReset();
    searchParamsMock.mockReturnValue(new URLSearchParams("clientEmail=client%40example.com"));
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

  it("renders the PT mobile log-history page and preserves the existing BFF route without introducing mutations", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/pt/clients/client-1/workout-logs?limit=30&offset=0" && method === "GET") {
        return jsonResponse(historyPayload());
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTClientLogHistoryPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "client@example.com" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pt/clients/client-1/workout-logs?limit=30&offset=0",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(screen.getByRole("link", { name: "Back to clients" }).getAttribute("href")).toBe("/pt/clients");
    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("Notes: Entry note Client note PT note")).toBeTruthy();
    expect(screen.getByText("Sets 4")).toBeTruthy();
    expect(screen.getByText("Reps 8")).toBeTruthy();
    expect(screen.getByText("Weight 135.5")).toBeTruthy();
    expect(screen.getByText("Time 1m 30s")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /save pt note/i })).toBeNull();

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.every((url) => url.startsWith("/api/pt/clients/client-1/workout-logs"))).toBe(true);
    const mutationCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init?.method ?? "GET").toUpperCase() !== "GET",
    );
    expect(mutationCalls).toHaveLength(0);
  });

  it("preserves PT session bootstrap gating before any workout-history fetch", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(PTClientLogHistoryPage));

    expect(screen.getByText("Loading workout history")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves existing query params and pagination behavior for the PT workout-history route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method !== "GET") {
        throw new Error(`Unexpected mutation: ${method} ${url}`);
      }

      if (url === "/api/pt/clients/client-1/workout-logs?limit=30&offset=0") {
        return jsonResponse(historyPayload({ nextOffset: 30, hasMore: true }));
      }

      if (url === "/api/pt/clients/client-1/workout-logs?limit=30&offset=0&mode=set") {
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

      if (url === "/api/pt/clients/client-1/workout-logs?limit=30&offset=0&mode=set&search=bench") {
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

      if (url === "/api/pt/clients/client-1/workout-logs?limit=30&offset=30&mode=set&search=bench") {
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

    render(React.createElement(PTClientLogHistoryPage));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/pt/clients/client-1/workout-logs?limit=30&offset=0",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Set" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/pt/clients/client-1/workout-logs?limit=30&offset=0&mode=set",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "bench" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/pt/clients/client-1/workout-logs?limit=30&offset=0&mode=set&search=bench",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Show older workout entries" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/pt/clients/client-1/workout-logs?limit=30&offset=30&mode=set&search=bench",
        expect.objectContaining({ cache: "no-store" }),
      );
    });
  });

  it("renders the existing empty state when no PT workout logs are returned", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/pt/clients/client-1/workout-logs?limit=30&offset=0" && method === "GET") {
        return jsonResponse(historyPayload({ items: [], count: 0 }));
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTClientLogHistoryPage));

    await waitFor(() => {
      expect(screen.getByText("No logged workouts yet.")).toBeTruthy();
    });
  });

  it("renders the existing error state when the PT workout-history BFF route fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/pt/clients/client-1/workout-logs?limit=30&offset=0" && method === "GET") {
        return jsonResponse({
          ok: false,
          error: {
            code: "upstream_error",
            message: "Unable to load client workout logs.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTClientLogHistoryPage));

    await waitFor(() => {
      expect(screen.getByText("Unable to load client workout logs.")).toBeTruthy();
    });

    expect(screen.getAllByText("Unable to load workout history").length).toBeGreaterThan(0);
  });
});
