import React from "react";
import type { ReactNode } from "react";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    const user = userEvent.setup();

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
      expect(screen.getByRole("heading", { name: "Metrics" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/client/metrics/overview", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/client/metrics/history", { cache: "no-store" });
    expect(screen.queryByText("Week summary")).toBeNull();
    expect(screen.queryByRole("heading", { name: "My Week" })).toBeNull();
    expect(screen.queryByText("History and log summary")).toBeNull();
    expect(screen.queryByText("No history yet")).toBeNull();
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/client/settings");
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Add log" }).getAttribute("href")).toBe("/client/add-log");
    expect(screen.getAllByText("1,400 cal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jun 1 - Jun 7").length).toBeGreaterThan(0);
    expect(screen.queryByText("May 25 - May 31")).toBeNull();
    expect(screen.queryByText("snapshot")).toBeNull();

    const performanceHistoryButton = screen.getByRole("button", { name: "Full Performance History" });
    expect(performanceHistoryButton).toBeTruthy();

    const intakeButton = screen.getByRole("button", { name: /^intake$/i });
    const expenditureButton = screen.getByRole("button", { name: /^expenditure$/i });
    const deficitButton = screen.getByRole("button", { name: /^deficit$/i });
    const targetButton = screen.getByRole("button", { name: /^target$/i });

    expect(intakeButton.getAttribute("aria-expanded")).toBe("false");
    expect(expenditureButton.getAttribute("aria-expanded")).toBe("false");
    expect(deficitButton.getAttribute("aria-expanded")).toBe("false");
    expect(targetButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /^freshness$/i })).toBeNull();

    await user.click(performanceHistoryButton);

    const dialog = screen.getByRole("dialog", { name: "Full Performance History" });
    const dialogQueries = within(dialog);
    const searchInput = dialogQueries.getByLabelText("Search history");
    const searchButton = dialogQueries.getByRole("button", { name: "Search performance history" });
    const startDateInput = dialogQueries.getByLabelText("Start date");
    const endDateInput = dialogQueries.getByLabelText("End date");

    expect(searchInput).toBeTruthy();
    expect(searchButton).toBeTruthy();
    expect(startDateInput).toBeTruthy();
    expect(endDateInput).toBeTruthy();
    expect(dialogQueries.getByText("May 25 - May 31")).toBeTruthy();
    expect(dialogQueries.getByText("As of May 31")).toBeTruthy();
    expect(dialogQueries.queryByText("snapshot")).toBeNull();

    const fetchCountAfterOpen = fetchMock.mock.calls.length;

    await user.type(searchInput, "May");
    expect(dialogQueries.getByText("May 25 - May 31")).toBeTruthy();
    expect(dialogQueries.getByText("Jun 1 - Jun 7")).toBeTruthy();

    await user.keyboard("{Enter}");
    expect(dialogQueries.getByText("May 25 - May 31")).toBeTruthy();
    expect(dialogQueries.getByText("Jun 1 - Jun 7")).toBeTruthy();

    await user.click(searchButton);
    expect(dialogQueries.getByText("May 25 - May 31")).toBeTruthy();
    expect(dialogQueries.queryByText("Jun 1 - Jun 7")).toBeNull();

    await user.clear(searchInput);
    await user.click(searchButton);
    expect(dialogQueries.getByText("May 25 - May 31")).toBeTruthy();
    expect(dialogQueries.getByText("Jun 1 - Jun 7")).toBeTruthy();

    await user.type(startDateInput, "2026-06-01");
    expect(dialogQueries.queryByText("May 25 - May 31")).toBeNull();
    expect(dialogQueries.getByText("Jun 1 - Jun 7")).toBeTruthy();
    expect(fetchMock.mock.calls.length).toBe(fetchCountAfterOpen);

    await user.click(dialogQueries.getByRole("button", { name: "Clear filters" }));
    expect(dialogQueries.getByText("May 25 - May 31")).toBeTruthy();
    expect(dialogQueries.getByText("Jun 1 - Jun 7")).toBeTruthy();

    await user.type(endDateInput, "2026-05-31");
    expect(dialogQueries.getByText("May 25 - May 31")).toBeTruthy();
    expect(dialogQueries.queryByText("Jun 1 - Jun 7")).toBeNull();
    expect(fetchMock.mock.calls.length).toBe(fetchCountAfterOpen);

    await user.click(dialogQueries.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Full Performance History" })).toBeNull();

    await user.click(performanceHistoryButton);
    expect(screen.getByRole("dialog", { name: "Full Performance History" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Full Performance History" })).toBeNull();

    await user.click(intakeButton);

    expect(intakeButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Total Calorie Intake")).toBeTruthy();
    expect(screen.getByText("Current Intake Ceiling")).toBeTruthy();

    await user.click(expenditureButton);

    expect(intakeButton.getAttribute("aria-expanded")).toBe("false");
    expect(expenditureButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.queryByText("Total Calorie Intake")).toBeNull();
    expect(screen.getByText("Total Calorie Expenditure")).toBeTruthy();
    expect(screen.getByText("Current Expenditure Floor")).toBeTruthy();

    await user.click(deficitButton);

    expect(expenditureButton.getAttribute("aria-expanded")).toBe("false");
    expect(deficitButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Net Calorie Balance")).toBeTruthy();
    expect(screen.getByText("Weekly Target Deficit")).toBeTruthy();
    expect(screen.getByText("Deficit Progress")).toBeTruthy();

    await user.click(targetButton);

    expect(deficitButton.getAttribute("aria-expanded")).toBe("false");
    expect(targetButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Week Range")).toBeTruthy();
    expect(screen.getByText("As Of Date")).toBeTruthy();
    expect(screen.getByText("Timezone")).toBeTruthy();
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
      expect(screen.getByRole("heading", { name: "Metrics" })).toBeTruthy();
    });

    expect(screen.queryByText("Week summary")).toBeNull();
    expect(screen.queryByText("History and log summary")).toBeNull();
    expect(screen.queryByText("No history yet")).toBeNull();
    expect(screen.getByRole("heading", { name: "Deficit progress unavailable" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "No weekly highlights yet" })).toBeTruthy();
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
