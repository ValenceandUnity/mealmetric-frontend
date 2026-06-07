import React from "react";
import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ clientId: "client-1" }),
  usePathname: () => "/pt/clients/client-1/metrics",
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

import PTClientMetricsPage from "@/app/pt/clients/[clientId]/metrics/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("PTClientMetricsPage mobile experience", () => {
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

  it("renders the PT client metrics mobile surface from the existing PT detail and metrics routes", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/clients/client-1") {
        return jsonResponse({
          ok: true,
          data: {
            id: "link-1",
            client_user_id: "client-1",
            status: "active",
            notes: "Review the weekly calorie window before updating training volume.",
            client: {
              id: "client-1",
              email: "sam.client@example.com",
              role: "client",
            },
          },
        });
      }

      if (url === "/api/pt/clients/client-1/metrics") {
        return jsonResponse({
          ok: true,
          data: {
            overview: {
              client_user_id: "client-1",
              as_of_date: "2026-06-07",
              week_start_date: "2026-06-01",
              week_end_date: "2026-06-07",
              business_timezone: "America/New_York",
              total_intake_calories: 2100,
              total_expenditure_calories: 1800,
              net_calorie_balance: 300,
              weekly_target_deficit_calories: 1400,
              deficit_progress_percent: 0.5,
              current_intake_ceiling_calories: 2100,
              current_expenditure_floor_calories: 700,
            },
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTClientMetricsPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Client Metrics" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/pt/clients/client-1", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/clients/client-1/metrics", { cache: "no-store" });
    expect(screen.getAllByText("sam.client@example.com").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Client summary" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Snapshot summary" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Deficit target" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "All metrics" })).toBeTruthy();
    expect(screen.getByText("PT metrics route")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to clients" }).getAttribute("href")).toBe("/pt/clients");
    expect(screen.getByRole("link", { name: "Assign training" }).getAttribute("href")).toBe("/pt/clients/client-1/assign");
    expect(screen.getByRole("link", { name: "Client workspace" }).getAttribute("href")).toBe("/pt/clients/client-1");
    expect(screen.getByRole("link", { name: "Log history" }).getAttribute("href")).toBe(
      "/pt/clients/client-1/log-history?clientEmail=sam.client%40example.com",
    );
  });

  it("renders a degraded but usable snapshot when the PT metrics route fails and the detail payload includes embedded metrics", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/clients/client-1") {
        return jsonResponse({
          ok: true,
          data: {
            id: "link-1",
            client_user_id: "client-1",
            status: "active",
            client: {
              id: "client-1",
              email: "sam.client@example.com",
              role: "client",
            },
            metrics_snapshot: {
              as_of_date: "2026-06-07",
              week_start_date: "2026-06-01",
              week_end_date: "2026-06-07",
              total_intake_calories: 2200,
              total_expenditure_calories: 1700,
              net_calorie_balance: 500,
              weekly_target_deficit_calories: 1400,
              deficit_progress_percent: 0.25,
              current_intake_ceiling_calories: 2200,
              current_expenditure_floor_calories: 700,
            },
          },
        });
      }

      if (url === "/api/pt/clients/client-1/metrics") {
        return jsonResponse({
          ok: false,
          error: {
            message: "Unable to load client metrics.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTClientMetricsPage));

    await waitFor(() => {
      expect(screen.getByText("Metrics route degraded")).toBeTruthy();
    });

    expect(screen.getByText("Embedded detail snapshot")).toBeTruthy();
    expect(screen.getAllByText("500 cal").length).toBeGreaterThan(0);
    expect(screen.getByText(/already present on the PT client detail payload/i)).toBeTruthy();
  });

  it("does not bypass PT session bootstrap before fetching PT client metrics data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(PTClientMetricsPage));

    expect(screen.getByText("Loading client metrics")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
