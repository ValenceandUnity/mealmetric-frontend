import React from "react";
import type { ReactNode } from "react";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/meal-plans/search",
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

import ClientMealPlansSearchPage from "@/app/client/meal-plans/search/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

const mealPlansPayload = {
  ok: true,
  data: {
    items: [{
      id: "plan-1",
      vendor_id: "vendor-1",
      vendor_name: "Northside Prep",
      vendor_zip_code: "10001",
      slug: "lean-fuel-week",
      name: "Lean Fuel Week",
      description: null,
      status: "published",
      total_price_cents: 5900,
      total_calories: 2100,
      item_count: 5,
      availability_count: 2,
    }],
    count: 1,
  },
};

describe("ClientMealPlansSearchPage mobile experience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    useSessionBootstrapMock.mockReset();
    window.sessionStorage.clear();
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

  it("renders the mobile search page from existing client meal-plan BFF data", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/meal-plans") {
        return jsonResponse(mealPlansPayload);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientMealPlansSearchPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Search meal plans" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/client/meal-plans", { cache: "no-store" });
    expect(screen.getByRole("searchbox", { name: "Search meal plans" })).toBeTruthy();
    expect(screen.getByText("Meal-plan links")).toBeTruthy();
    expect(screen.getAllByText("Lean Fuel Week").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Northside Prep | 10001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$59.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2,100 cal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5 meals").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 availability windows").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "View plan" }).getAttribute("href")).toBe("/client/meal-plans/plan-1");
    expect(screen.queryByRole("button", { name: /save plan/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /remove bookmark/i })).toBeNull();
  });

  it("preserves the existing 250ms debounced search behavior and q plus zip_codes query shape", async () => {
    window.sessionStorage.setItem(
      "mealmetric.client.meal-plans.active-zips",
      JSON.stringify(["10001", "10002"]),
    );

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (
        url === "/api/client/meal-plans?zip_codes=10001%2C10002" ||
        url === "/api/client/meal-plans?q=Lean+Fuel&zip_codes=10001%2C10002"
      ) {
        return jsonResponse(mealPlansPayload);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientMealPlansSearchPage));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/client/meal-plans?zip_codes=10001%2C10002", {
        cache: "no-store",
      });
    });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search meal plans" }), {
      target: { value: "Lean Fuel" },
    });

    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input) === "/api/client/meal-plans?q=Lean+Fuel&zip_codes=10001%2C10002"),
    ).toBe(false);

    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 300);
      });
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/client/meal-plans?q=Lean+Fuel&zip_codes=10001%2C10002", {
        cache: "no-store",
      });
    });
  });

  it("renders a safe empty state when no results are returned", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/meal-plans") {
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

    render(React.createElement(ClientMealPlansSearchPage));

    await waitFor(() => {
      expect(screen.getByText("No meal plans are available")).toBeTruthy();
    });

    expect(screen.getByText("No meal plans are available in the current catalog.")).toBeTruthy();
  });

  it("surfaces search fetch failures safely", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/meal-plans") {
        return jsonResponse({
          ok: false,
          error: {
            code: "meal_plan_search_failed",
            message: "Unable to load meal plans.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientMealPlansSearchPage));

    await waitFor(() => {
      expect(screen.getByText("Unable to load meal plans.")).toBeTruthy();
    });
  });

  it("does not bypass client session bootstrap before fetching search data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(ClientMealPlansSearchPage));

    expect(screen.getByText("Loading meal plan search")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
