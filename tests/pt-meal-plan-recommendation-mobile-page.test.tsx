import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ clientId: "client-1" }),
  usePathname: () => "/pt/clients/client-1/recommend-meal-plan",
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

import PTRecommendMealPlanPage from "@/app/pt/clients/[clientId]/recommend-meal-plan/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("PTRecommendMealPlanPage mobile experience", () => {
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

  it("renders the recommendation mobile workflow from the existing PT meal-plan and recommendation routes", async () => {
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
              description: "High-protein work-week plan.",
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

      if (url === "/api/pt/clients/client-1/meal-plan-recommendations") {
        return jsonResponse({
          ok: true,
          data: [{
            id: "recommendation-1",
            meal_plan_id: "plan-1",
            status: "active",
            rationale: "Protein target support",
            recommended_at: "2026-06-07T14:00:00Z",
            expires_at: "2026-06-14T14:00:00Z",
          }],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTRecommendMealPlanPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Recommend meal plan" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/pt/meal-plans/search", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/clients/client-1/meal-plan-recommendations", { cache: "no-store" });
    expect(fetchMock.mock.calls.some(([input]) => String(input) === "/api/pt/clients/client-1")).toBe(false);
    expect(screen.getByRole("searchbox", { name: "Filter recommendable meal plans" })).toBeTruthy();
    expect(screen.getAllByText("Client client-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Email unavailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lean Fuel Week").length).toBeGreaterThan(0);
    expect(screen.getByText("Protein target support")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Client overview" })[0]?.getAttribute("href")).toBe("/pt/clients/client-1");
    expect(screen.getAllByRole("link", { name: "Back to clients" })[0]?.getAttribute("href")).toBe("/pt/clients");
  });

  it("filters already-loaded meal plans locally without changing the existing PT search request shape", async () => {
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
              },
              {
                id: "plan-2",
                vendor_id: "vendor-2",
                vendor_name: "Recovery Kitchen",
                vendor_zip_code: "10002",
                name: "Recovery Reset",
              },
            ],
            count: 2,
          },
        });
      }

      if (url === "/api/pt/clients/client-1/meal-plan-recommendations") {
        return jsonResponse({ ok: true, data: [] });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTRecommendMealPlanPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Select Recovery Reset" })).toBeTruthy();
    });

    const searchbox = screen.getByRole("searchbox", { name: "Filter recommendable meal plans" });
    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.change(searchbox, {
      target: { value: "Recovery" },
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Selected Lean Fuel Week" })).toBeNull();
      expect(screen.getByRole("button", { name: "Select Recovery Reset" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("?"))).toBe(false);
  });

  it("preserves selection behavior, create route, payload shape, and success feedback", async () => {
    let recommendationFetches = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/pt/meal-plans/search" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "plan-1",
                vendor_id: "vendor-1",
                vendor_name: "Northside Prep",
                name: "Lean Fuel Week",
              },
              {
                id: "plan-2",
                vendor_id: "vendor-2",
                vendor_name: "Recovery Kitchen",
                name: "Recovery Reset",
              },
            ],
            count: 2,
          },
        });
      }

      if (url === "/api/pt/clients/client-1/meal-plan-recommendations" && method === "GET") {
        recommendationFetches += 1;
        return jsonResponse({
          ok: true,
          data: recommendationFetches === 1
            ? []
            : [{
                id: "recommendation-1",
                meal_plan_id: "plan-2",
                status: "active",
              }],
        });
      }

      if (url === "/api/pt/clients/client-1/meal-plan-recommendations/create" && method === "POST") {
        return jsonResponse({
          ok: true,
          data: {
            id: "recommendation-1",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTRecommendMealPlanPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Select Recovery Reset" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Select Recovery Reset" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Selected Recovery Reset" })).toBeTruthy();
      expect((screen.getByLabelText("Meal plan") as HTMLSelectElement).value).toBe("plan-2");
    });

    fireEvent.change(screen.getByLabelText("Recommendation rationale"), {
      target: { value: "Increase adherence" },
    });
    fireEvent.change(screen.getByLabelText("Recommended at"), {
      target: { value: "2026-06-07T10:30" },
    });
    fireEvent.change(screen.getByLabelText("Expires at"), {
      target: { value: "2026-06-14T10:30" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create recommendation" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/pt/clients/client-1/meal-plan-recommendations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal_plan_id: "plan-2",
          rationale: "Increase adherence",
          recommended_at: "2026-06-07T14:30:00.000Z",
          expires_at: "2026-06-14T14:30:00.000Z",
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Meal recommendation created successfully.")).toBeTruthy();
    });
  });

  it("preserves recommendation error feedback from the existing create route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/pt/meal-plans/search" && method === "GET") {
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

      if (url === "/api/pt/clients/client-1/meal-plan-recommendations" && method === "GET") {
        return jsonResponse({ ok: true, data: [] });
      }

      if (url === "/api/pt/clients/client-1/meal-plan-recommendations/create" && method === "POST") {
        return jsonResponse({
          ok: false,
          error: {
            code: "create_failed",
            message: "Unable to create meal recommendation.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTRecommendMealPlanPage));

    await waitFor(() => {
      expect((screen.getByRole("button", { name: "Create recommendation" }) as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: "Create recommendation" }));

    await waitFor(() => {
      expect(screen.getByText("Unable to create meal recommendation.")).toBeTruthy();
    });
  });

  it("does not bypass PT session bootstrap before fetching recommendation data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(PTRecommendMealPlanPage));

    expect(screen.getByText("Loading meal recommendation page")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
