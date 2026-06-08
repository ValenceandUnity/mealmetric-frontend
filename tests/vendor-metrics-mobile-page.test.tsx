import React from "react";
import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/metrics",
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

import VendorMetricsPage from "@/app/vendor/metrics/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("VendorMetricsPage mobile experience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    useSessionBootstrapMock.mockReset();
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "vendor-user-1",
        email: "vendor@example.com",
        role: "vendor",
      },
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the vendor mobile metrics page from the existing vendor metrics BFF route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/vendor/metrics") {
        return jsonResponse({
          ok: true,
          data: {
            vendor_id: "vendor-1",
            vendor_name: "Green Table Kitchen",
            zip_code: "10001",
            total_meal_plans: 4,
            published_meal_plans: 3,
            draft_meal_plans: 1,
            total_availability_entries: 7,
            open_pickup_windows: 2,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(VendorMetricsPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Vendor Metrics" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/vendor/metrics", { cache: "no-store" });
    expect(fetchMock.mock.calls.some(([input]) => String(input) === "/api/vendor/me")).toBe(false);
    expect(fetchMock.mock.calls.some(([input]) => String(input) === "/api/vendor/meal-plans")).toBe(false);
    expect(fetchMock.mock.calls.every(([input]) => String(input) === "/api/vendor/metrics")).toBe(true);
    expect(fetchMock.mock.calls.every(([input]) => !/^https?:\/\//.test(String(input)))).toBe(true);
    expect(screen.getAllByText("Green Table Kitchen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7").length).toBeGreaterThan(0);
    expect(screen.getByText("Published coverage")).toBeTruthy();
    expect(screen.getByText("Publication and pickup coverage")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Vendor dashboard" })[0]?.getAttribute("href")).toBe("/vendor");
    expect(screen.getAllByRole("link", { name: "Meal plans" })[0]?.getAttribute("href")).toBe("/vendor/meal-plans");
    expect(screen.getAllByRole("link", { name: "Account" })[0]?.getAttribute("href")).toBe("/vendor/account");
    expect(screen.getByRole("link", { name: "Open dashboard" }).getAttribute("href")).toBe("/vendor");
    expect(screen.getByRole("link", { name: "Open meal plans" }).getAttribute("href")).toBe("/vendor/meal-plans");
    expect(screen.getByRole("link", { name: "Open account" }).getAttribute("href")).toBe("/vendor/account");
    expect(screen.getByRole("link", { name: "Open operations placeholder" }).getAttribute("href")).toBe("/vendor/operations");
    expect(screen.queryByText(/revenue/i)).toBeNull();
    expect(screen.queryByText(/sales/i)).toBeNull();
    expect(screen.queryByText(/orders/i)).toBeNull();
    expect(screen.queryByText(/customer/i)).toBeNull();
    expect(screen.queryByText(/payout/i)).toBeNull();
    expect(screen.queryByText(/conversion/i)).toBeNull();
  });

  it("renders safe unavailable states when the metrics payload is missing", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/vendor/metrics") {
        return jsonResponse({
          ok: true,
          data: null,
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(VendorMetricsPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Vendor Metrics" })).toBeTruthy();
    });

    expect(screen.getByText("Vendor metrics unavailable")).toBeTruthy();
    expect(screen.getByText("Catalog health unavailable")).toBeTruthy();
    expect(screen.getByText(/did not return mobile summary data/i)).toBeTruthy();
  });

  it("renders the existing error state when the vendor metrics route fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/vendor/metrics") {
        return jsonResponse({
          ok: false,
          error: {
            code: "vendor_metrics_unavailable",
            message: "Unable to load vendor metrics.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(VendorMetricsPage));

    await waitFor(() => {
      expect(screen.getByText("Unable to load metrics")).toBeTruthy();
    });

    expect(screen.getByText("Unable to load vendor metrics.")).toBeTruthy();
  });

  it("does not bypass vendor session bootstrap before fetching metrics", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(VendorMetricsPage));

    expect(screen.getByText("Loading vendor metrics")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
