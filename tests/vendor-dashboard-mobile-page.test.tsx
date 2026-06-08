import React from "react";
import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor",
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

import VendorDashboardPage from "@/app/vendor/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("VendorDashboardPage mobile experience", () => {
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

  it("renders the vendor mobile dashboard from the existing vendor BFF routes", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/vendor/me") {
        return jsonResponse({
          ok: true,
          data: {
            user_id: "vendor-user-1",
            email: "vendor@example.com",
            vendor_ids: ["vendor-1"],
            default_vendor: {
              id: "vendor-1",
              slug: "green-table",
              name: "Green Table Kitchen",
              description: "Prepared meals for local pickup.",
              zip_code: "10001",
              status: "active",
              meal_plan_count: 4,
            },
            vendors: [{
              id: "vendor-1",
              slug: "green-table",
              name: "Green Table Kitchen",
              description: "Prepared meals for local pickup.",
              zip_code: "10001",
              status: "active",
              meal_plan_count: 4,
            }],
          },
        });
      }

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

      if (url === "/api/vendor/meal-plans") {
        return jsonResponse({
          ok: true,
          data: {
            count: 4,
            items: [{
              id: "plan-1",
              vendor_id: "vendor-1",
              vendor_name: "Green Table Kitchen",
              vendor_zip_code: "10001",
              slug: "lean-fuel-week",
              name: "Lean Fuel Week",
              description: "High-protein lunches and dinners.",
              status: "published",
              total_price_cents: 6200,
              total_calories: 2100,
              item_count: 5,
              availability_count: 2,
            }],
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(VendorDashboardPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Vendor Portal" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/vendor/me", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/vendor/metrics", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/vendor/meal-plans", { cache: "no-store" });
    expect(fetchMock.mock.calls.every(([input]) => /^\/api\/vendor\//.test(String(input)))).toBe(true);
    expect(screen.getAllByText("Green Table Kitchen").length).toBeGreaterThan(0);
    expect(screen.getByText("green-table")).toBeTruthy();
    expect(screen.getAllByText("10001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lean Fuel Week").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Account" })[0]?.getAttribute("href")).toBe("/vendor/account");
    expect(screen.getByRole("link", { name: "Catalog" }).getAttribute("href")).toBe("/vendor/meal-plans");
    expect(screen.getAllByRole("link", { name: "Open meal plans" })[0]?.getAttribute("href")).toBe("/vendor/meal-plans");
    expect(screen.getAllByRole("link", { name: "Open metrics" })[0]?.getAttribute("href")).toBe("/vendor/metrics");
    expect(screen.getAllByRole("link", { name: "Open account" })[0]?.getAttribute("href")).toBe("/vendor/account");
    expect(screen.getByRole("link", { name: "Open operations placeholder" }).getAttribute("href")).toBe("/vendor/operations");
    expect(screen.queryByText(/revenue/i)).toBeNull();
    expect(screen.queryByText(/sales/i)).toBeNull();
  });

  it("renders a safe fallback when no default vendor or meal plans are available", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/vendor/me") {
        return jsonResponse({
          ok: true,
          data: {
            user_id: "vendor-user-1",
            email: "vendor@example.com",
            vendor_ids: [],
            default_vendor: null,
            vendors: [],
          },
        });
      }

      if (url === "/api/vendor/metrics") {
        return jsonResponse({
          ok: true,
          data: {
            vendor_id: "vendor-1",
            vendor_name: "Vendor operations",
            zip_code: null,
            total_meal_plans: 0,
            published_meal_plans: 0,
            draft_meal_plans: 0,
            total_availability_entries: 0,
            open_pickup_windows: 0,
          },
        });
      }

      if (url === "/api/vendor/meal-plans") {
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

    render(React.createElement(VendorDashboardPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Vendor Portal" })).toBeTruthy();
    });

    expect(screen.getAllByText("Vendor operations").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Default vendor unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText(/No default vendor is configured/i)).toBeTruthy();
    expect(screen.getAllByText("No vendor meal plans").length).toBeGreaterThan(0);
  });

  it("renders the existing shared error path when any vendor dashboard route fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/vendor/me") {
        return jsonResponse({
          ok: false,
          error: {
            code: "vendor_profile_unavailable",
            message: "Unable to load vendor profile.",
          },
        });
      }

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

      if (url === "/api/vendor/meal-plans") {
        return jsonResponse({
          ok: true,
          data: {
            count: 1,
            items: [],
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(VendorDashboardPage));

    await waitFor(() => {
      expect(screen.getByText("Unable to load vendor dashboard")).toBeTruthy();
    });

    expect(screen.getByText("Unable to load vendor profile.")).toBeTruthy();
  });

  it("does not bypass vendor session bootstrap before fetching dashboard data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(VendorDashboardPage));

    expect(screen.getByText("Loading vendor portal")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
