import React from "react";
import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/meal-plans",
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

import VendorMealPlansPage from "@/app/vendor/meal-plans/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("VendorMealPlansPage mobile experience", () => {
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

  it("renders the vendor mobile meal-plan catalog from the existing vendor meal-plan BFF route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/vendor/meal-plans") {
        return jsonResponse({
          ok: true,
          data: {
            count: 2,
            items: [
              {
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
              },
              {
                id: "plan-2",
                vendor_id: "vendor-1",
                vendor_name: "Green Table Kitchen",
                vendor_zip_code: "10001",
                slug: "recovery-reset",
                name: "Recovery Reset",
                description: "Lower-calorie recovery menu.",
                status: "draft",
                total_price_cents: 5400,
                total_calories: 1850,
                item_count: 4,
                availability_count: 1,
              },
            ],
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(VendorMealPlansPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Vendor Meal Plans" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/vendor/meal-plans", { cache: "no-store" });
    expect(fetchMock.mock.calls.some(([input]) => String(input) === "/api/vendor/me")).toBe(false);
    expect(fetchMock.mock.calls.some(([input]) => String(input) === "/api/vendor/metrics")).toBe(false);
    expect(screen.getAllByText(/Green Table Kitchen/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lean Fuel Week").length).toBeGreaterThan(0);
    expect(screen.getByText("Recovery Reset")).toBeTruthy();
    expect(screen.getAllByText("High-protein lunches and dinners.").length).toBeGreaterThan(0);
    expect(screen.getByText("Lower-calorie recovery menu.")).toBeTruthy();
    expect(screen.getAllByText("10001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$62.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$54.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2,100 cal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1,850 cal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5 meals").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 availability window").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Vendor dashboard" })[0]?.getAttribute("href")).toBe("/vendor");
    expect(screen.getAllByRole("link", { name: "Metrics" })[0]?.getAttribute("href")).toBe("/vendor/metrics");
    expect(screen.queryByText(/revenue/i)).toBeNull();
    expect(screen.queryByText(/sales/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /create/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /publish/i })).toBeNull();
  });

  it("renders a safe empty state when the vendor has no meal plans", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

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

    render(React.createElement(VendorMealPlansPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Vendor Meal Plans" })).toBeTruthy();
    });

    expect(screen.getAllByText("No vendor meal plans").length).toBeGreaterThan(0);
    expect(screen.getByText(/catalog workspace remains empty until inventory exists/i)).toBeTruthy();
  });

  it("renders the existing error state when the vendor meal-plan route fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/vendor/meal-plans") {
        return jsonResponse({
          ok: false,
          error: {
            code: "vendor_meal_plans_unavailable",
            message: "Unable to load vendor meal plans.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(VendorMealPlansPage));

    await waitFor(() => {
      expect(screen.getByText("Unable to load meal plans")).toBeTruthy();
    });

    expect(screen.getByText("Unable to load vendor meal plans.")).toBeTruthy();
  });

  it("does not bypass vendor session bootstrap before fetching meal-plan data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(VendorMealPlansPage));

    expect(screen.getByText("Loading vendor meal plans")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
