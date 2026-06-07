import React from "react";
import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/metrics",
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

import ClientMetricsPage from "@/app/client/metrics/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("ClientMetricsPage mobile experience", () => {
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

  it("renders the mobile client metrics surface from the existing overview and history BFF routes", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/metrics/overview") {
        return jsonResponse({
          ok: true,
          data: {
            as_of_date: "2026-06-07",
            week_start_date: "2026-06-01",
            week_end_date: "2026-06-07",
            business_timezone: "America/New_York",
            total_intake_calories: 2100,
            total_expenditure_calories: 1800,
            net_calorie_balance: 300,
            weekly_target_deficit_calories: 1400,
            deficit_progress_percent: 0.5,
            current_intake_ceiling_calories: 2200,
            current_expenditure_floor_calories: 700,
            has_data: true,
            freshness: {
              source: "snapshot",
              computed_at: "2026-06-07T15:00:00Z",
              source_window_start: "2026-06-01",
              source_window_end: "2026-06-07",
              version: "v1",
            },
          },
        });
      }

      if (url === "/api/client/metrics/history") {
        return jsonResponse({
          ok: true,
          data: {
            weeks: [
              {
                week_start_date: "2026-06-01",
                week_end_date: "2026-06-07",
                as_of_date: "2026-06-07",
                total_intake_calories: 2100,
                total_expenditure_calories: 1800,
                net_calorie_balance: 300,
                deficit_progress_percent: 0.5,
              },
              {
                week_start_date: "2026-05-25",
                week_end_date: "2026-05-31",
                as_of_date: "2026-05-31",
                total_intake_calories: 2050,
                total_expenditure_calories: 1750,
                net_calorie_balance: 300,
                deficit_progress_percent: 0.45,
              },
            ],
            count: 2,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientMetricsPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "My Week" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/client/metrics/overview", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/client/metrics/history", { cache: "no-store" });
    expect(screen.getByRole("link", { name: "Client home" }).getAttribute("href")).toBe("/client");
    expect(screen.getByRole("link", { name: "Add log" }).getAttribute("href")).toBe("/client/add-log");
    expect(screen.getAllByText("2,100 cal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1,400 cal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jun 1 - Jun 7").length).toBeGreaterThan(0);
    expect(screen.getAllByText("May 25 - May 31").length).toBeGreaterThan(0);
    expect(screen.getByText("snapshot")).toBeTruthy();
  });

  it("renders safe empty states when overview and history are empty", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/metrics/overview") {
        return jsonResponse({
          ok: true,
          data: {},
        });
      }

      if (url === "/api/client/metrics/history") {
        return jsonResponse({
          ok: true,
          data: {
            weeks: [],
            count: 0,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientMetricsPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "No overview yet" })).toBeTruthy();
    });

    expect(screen.getByRole("heading", { name: "Deficit progress unavailable" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "No weekly highlights yet" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "No history yet" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "No metrics available yet" })).toBeTruthy();
  });

  it("does not bypass client session bootstrap before fetching client metrics", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(ClientMetricsPage));

    expect(screen.getByText("Loading metrics workspace")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
