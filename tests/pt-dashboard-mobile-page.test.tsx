import React from "react";
import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pt",
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

import PTDashboardPage from "@/app/pt/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("PTDashboardPage mobile experience", () => {
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

  it("renders the mobile PT dashboard surface and linked-client cards from the existing dashboard BFF route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/dashboard") {
        return jsonResponse({
          ok: true,
          data: {
            count: 1,
            items: [{
              id: "link-1",
              pt_user_id: "pt-1",
              client_user_id: "client-1",
              status: "active",
              started_at: null,
              ended_at: null,
              notes: "Strength block focus",
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
                total_intake_calories: 0,
                total_expenditure_calories: 0,
                net_calorie_balance: 0,
                weekly_target_deficit_calories: null,
                deficit_progress_percent: null,
                current_intake_ceiling_calories: 2100,
                current_expenditure_floor_calories: 700,
                has_data: true,
                freshness: null,
              },
            }],
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTDashboardPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "PT Command" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/pt/dashboard", { cache: "no-store" });
    expect(screen.getByRole("link", { name: "Open clients" }).getAttribute("href")).toBe("/pt/clients");
    expect(screen.getByText("Linked clients")).toBeTruthy();
    expect(screen.getAllByText("Hi, Sam").length).toBeGreaterThan(0);
    expect(screen.getByText("sam.client@example.com")).toBeTruthy();
    expect(screen.getByText("Link notes: Strength block focus")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Meal plans" }).getAttribute("href")).toBe(
      "/pt/clients/client-1/recommend-meal-plan",
    );
  });

  it("renders a safe empty state when no linked clients exist", async () => {
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

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTDashboardPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "No linked clients yet" })).toBeTruthy();
    });
  });

  it("does not bypass PT session bootstrap before fetching dashboard data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(PTDashboardPage));

    expect(screen.getByText("Loading PT session")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
