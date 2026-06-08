import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pt/meal-plans",
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

import PTMealPlansPage from "@/app/pt/meal-plans/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("PTMealPlansPage mobile experience", () => {
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

  it("renders the PT meal-plans mobile hub from the existing PT search route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/meal-plans/search") {
        return jsonResponse({
          ok: true,
          data: {
            items: [{
              id: "plan-1",
              vendor_id: "vendor-1",
              vendor_name: "Northside Prep",
              vendor_zip_code: "10001",
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
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTMealPlansPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "PT Meal Plans" })).toBeTruthy();
    });

    const ptHomeLinks = screen.getAllByRole("link", { name: "PT home" });

    expect(fetchMock).toHaveBeenCalledWith("/api/pt/meal-plans/search", { cache: "no-store" });
    expect(screen.getByRole("searchbox", { name: "Filter PT meal plans" })).toBeTruthy();
    expect(screen.getAllByText("Lean Fuel Week").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Northside Prep").length).toBeGreaterThan(0);
    expect(screen.getByText("10001")).toBeTruthy();
    expect(screen.getByText("$59.00")).toBeTruthy();
    expect(screen.getByText("2,100 cal")).toBeTruthy();
    expect(screen.getByText("5 meals")).toBeTruthy();
    expect(screen.getByText("2 availability windows")).toBeTruthy();
    expect(screen.getAllByText("published").length).toBeGreaterThan(0);
    expect(ptHomeLinks.some((link) => link.getAttribute("href") === "/pt")).toBe(true);
    expect(screen.getAllByRole("link", { name: "Open clients" })[0]?.getAttribute("href")).toBe("/pt/clients");
    expect(screen.queryByRole("button", { name: /create recommendation/i })).toBeNull();
  });

  it("filters already-loaded PT meal plans locally without changing the protected request shape", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/meal-plans/search") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "plan-1",
                vendor_id: "vendor-1",
                vendor_name: "Northside Prep",
                vendor_zip_code: "10001",
                name: "Lean Fuel Week",
                status: "published",
                total_price_cents: 5900,
                total_calories: 2100,
                item_count: 5,
                availability_count: 2,
              },
              {
                id: "plan-2",
                vendor_id: "vendor-2",
                vendor_name: "Recovery Kitchen",
                vendor_zip_code: "10002",
                name: "Recovery Reset",
                status: "draft",
                total_price_cents: 4300,
                total_calories: 1800,
                item_count: 4,
                availability_count: 1,
              },
            ],
            count: 2,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTMealPlansPage));

    await waitFor(() => {
      expect(screen.getByText("Lean Fuel Week")).toBeTruthy();
      expect(screen.getByText("Recovery Reset")).toBeTruthy();
    });

    const searchbox = screen.getByRole("searchbox", { name: "Filter PT meal plans" });
    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.change(searchbox, {
      target: { value: "Recovery" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Lean Fuel Week")).toBeNull();
      expect(screen.getByText("Recovery Reset")).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(fetchMock.mock.calls.every(([input]) => String(input) === "/api/pt/meal-plans/search")).toBe(true);
  });

  it("renders safe empty and missing-data states when the PT search route returns limited catalog data", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/meal-plans/search") {
        return jsonResponse({
          ok: true,
          data: {
            items: [{
              id: "plan-1",
              vendor_id: "vendor-1",
              vendor_name: "Northside Prep",
              name: "Lean Fuel Week",
            }],
            count: 1,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTMealPlansPage));

    await waitFor(() => {
      expect(screen.getByText("ZIP unavailable")).toBeTruthy();
    });

    expect(screen.getByText("Price unavailable")).toBeTruthy();
    expect(screen.getByText("Calories unavailable")).toBeTruthy();
    expect(screen.getByText("Meal count unavailable")).toBeTruthy();
    expect(screen.getByText("Availability unavailable")).toBeTruthy();
  });

  it("renders a safe empty state when the PT search route returns no results", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/meal-plans/search") {
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

    render(React.createElement(PTMealPlansPage));

    await waitFor(() => {
      expect(screen.getByText("No PT meal plans are available")).toBeTruthy();
    });

    expect(screen.getByText("The PT meal-plan search route did not return any discoverable meal plans.")).toBeTruthy();
  });

  it("does not bypass PT session bootstrap before fetching PT meal-plan data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(PTMealPlansPage));

    expect(screen.getByText("Loading PT meal plans")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
