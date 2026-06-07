import React from "react";
import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pt/metrics",
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

import PTMetricsPage from "@/app/pt/metrics/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("PTMetricsPage mobile experience", () => {
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

  it("renders the PT metrics mobile surface from existing dashboard and roster routes", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/dashboard") {
        return jsonResponse({
          ok: true,
          data: {
            count: 2,
            items: [
              {
                id: "link-1",
                pt_user_id: "pt-1",
                client_user_id: "client-1",
                status: "active",
                started_at: null,
                ended_at: null,
                notes: null,
                created_at: "2026-06-07T00:00:00Z",
                updated_at: "2026-06-07T00:00:00Z",
                client: {
                  id: "client-1",
                  email: "sam.client@example.com",
                  role: "client",
                  created_at: "2026-06-07T00:00:00Z",
                },
                assignment_count: 3,
                workout_log_count: 8,
                latest_workout_log_at: "2026-06-07T14:00:00Z",
                metrics_snapshot: {
                  client_user_id: "client-1",
                  as_of_date: "2026-06-07",
                  week_start_date: "2026-06-01",
                  week_end_date: "2026-06-07",
                  business_timezone: "America/New_York",
                  week_start_day: 1,
                  total_intake_calories: 2100,
                  total_expenditure_calories: 1800,
                  net_calorie_balance: 300,
                  weekly_target_deficit_calories: 1400,
                  deficit_progress_percent: 0.5,
                  current_intake_ceiling_calories: 2100,
                  current_expenditure_floor_calories: 700,
                  has_data: true,
                  freshness: null,
                },
              },
            ],
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
                client_name: "Sam",
                client_email: "sam.client@example.com",
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

    render(React.createElement(PTMetricsPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Progress Reports" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/pt/dashboard", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/clients", { cache: "no-store" });
    expect(screen.getByRole("link", { name: "PT home" }).getAttribute("href")).toBe("/pt");
    expect(screen.getByRole("link", { name: "Open clients" }).getAttribute("href")).toBe("/pt/clients");
    expect(screen.getByText("Linked clients")).toBeTruthy();
    expect(screen.getAllByText("Active clients").length).toBeGreaterThan(0);
    expect(screen.getByText("Comparison readiness")).toBeTruthy();
    expect(screen.getByText("Sam")).toBeTruthy();
    expect(screen.getByText("MVPs")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Client metrics" }).getAttribute("href")).toBe("/pt/clients/client-1/metrics");
  });

  it("renders a safe coming-soon state when no linked clients exist", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/dashboard") {
        return jsonResponse({
          ok: true,
          data: {
            count: 0,
            items: [],
          },
        });
      }

      if (url === "/api/pt/clients") {
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

    render(React.createElement(PTMetricsPage));

    await waitFor(() => {
      expect(screen.getAllByText("PT metrics start with linked clients").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByRole("link", { name: "Open clients" }).length).toBeGreaterThan(0);
  });

  it("does not bypass PT session bootstrap before fetching PT metrics data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(PTMetricsPage));

    expect(screen.getByText("Loading PT metrics")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
