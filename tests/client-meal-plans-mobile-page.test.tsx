import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/meal-plans",
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

import ClientMealPlansPage from "@/app/client/meal-plans/page";

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

describe("ClientMealPlansPage mobile experience", () => {
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

  it("renders the mobile MP Directory surface and budget controls from existing client BFF data", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/meal-plans") {
        return jsonResponse(mealPlansPayload);
      }

      if (url === "/api/client/bookmarks") {
        return jsonResponse({
          ok: true,
          data: {
            items: [{
              id: "folder-1",
              client_user_id: "client-1",
              name: "Favorites",
              description: null,
              created_at: "2026-06-07T00:00:00Z",
              updated_at: "2026-06-07T00:00:00Z",
              items: [{
                id: "bookmark-1",
                meal_plan_id: "plan-1",
                note: null,
                created_at: "2026-06-07T00:00:00Z",
                meal_plan: mealPlansPayload.data.items[0],
              }],
            }],
            count: 1,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientMealPlansPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "MP Directory" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/client/meal-plans", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/client/bookmarks", { cache: "no-store" });
    expect(screen.getByRole("searchbox", { name: "Filter loaded meal plans" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Marketplace links" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Budget-aware discovery" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Catalog cards" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Schedule" })[0]?.getAttribute("href")).toBe("/client/meal-plans/schedule");
    expect(screen.getAllByRole("link", { name: "Search" })[0]?.getAttribute("href")).toBe("/client/meal-plans/search");
    expect(screen.getAllByRole("link", { name: "Bookmark" })[0]?.getAttribute("href")).toBe("/client/meal-plans/bookmark");
    expect(screen.getByText("Budget open")).toBeTruthy();
    expect(screen.getAllByText("Lean Fuel Week").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Northside Prep | 10001").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Open budget marker editor" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Budget max ($)")).toBeTruthy();
    });
    expect(screen.getByLabelText("Budget duration")).toBeTruthy();
    expect(screen.getByLabelText("Add ZIP code or city")).toBeTruthy();
  });

  it("removes an existing bookmark through the current bookmark item BFF route", async () => {
    let bookmarkRefreshCount = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/meal-plans" && method === "GET") {
        return jsonResponse(mealPlansPayload);
      }

      if (url === "/api/client/bookmarks" && method === "GET") {
        bookmarkRefreshCount += 1;

        if (bookmarkRefreshCount === 1) {
          return jsonResponse({
            ok: true,
            data: {
              items: [{
                id: "folder-1",
                client_user_id: "client-1",
                name: "Favorites",
                description: null,
                created_at: "2026-06-07T00:00:00Z",
                updated_at: "2026-06-07T00:00:00Z",
                items: [{
                  id: "bookmark-1",
                  meal_plan_id: "plan-1",
                  note: null,
                  created_at: "2026-06-07T00:00:00Z",
                  meal_plan: mealPlansPayload.data.items[0],
                }],
              }],
              count: 1,
            },
          });
        }

        return jsonResponse({
          ok: true,
          data: {
            items: [],
            count: 0,
          },
        });
      }

      if (url === "/api/client/bookmarks/folder-1/items/bookmark-1" && method === "DELETE") {
        return jsonResponse({
          ok: true,
          data: {
            deleted: true,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientMealPlansPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Remove bookmark for Lean Fuel Week" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove bookmark for Lean Fuel Week" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/client/bookmarks/folder-1/items/bookmark-1", {
        method: "DELETE",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Bookmark removed")).toBeTruthy();
    });
  });

  it("creates the default folder and saves a bookmark through the existing bookmark BFF routes", async () => {
    let bookmarkRefreshCount = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/meal-plans" && method === "GET") {
        return jsonResponse(mealPlansPayload);
      }

      if (url === "/api/client/bookmarks" && method === "GET") {
        bookmarkRefreshCount += 1;

        if (bookmarkRefreshCount === 1) {
          return jsonResponse({
            ok: true,
            data: {
              items: [],
              count: 0,
            },
          });
        }

        return jsonResponse({
          ok: true,
          data: {
            items: [{
              id: "folder-1",
              client_user_id: "client-1",
              name: "Favorites",
              description: null,
              created_at: "2026-06-07T00:00:00Z",
              updated_at: "2026-06-07T00:00:00Z",
              items: [{
                id: "bookmark-1",
                meal_plan_id: "plan-1",
                note: null,
                created_at: "2026-06-07T00:00:00Z",
                meal_plan: mealPlansPayload.data.items[0],
              }],
            }],
            count: 1,
          },
        });
      }

      if (url === "/api/client/bookmarks" && method === "POST") {
        return jsonResponse({
          ok: true,
          data: {
            id: "folder-1",
            client_user_id: "client-1",
            name: "Favorites",
            description: null,
            created_at: "2026-06-07T00:00:00Z",
            updated_at: "2026-06-07T00:00:00Z",
            items: [],
          },
        });
      }

      if (url === "/api/client/bookmarks/folder-1/items" && method === "POST") {
        return jsonResponse({
          ok: true,
          data: {
            id: "bookmark-1",
            meal_plan_id: "plan-1",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientMealPlansPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save plan for Lean Fuel Week" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save plan for Lean Fuel Week" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/client/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Favorites" }),
      });
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/client/bookmarks/folder-1/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal_plan_id: "plan-1" }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Bookmark saved")).toBeTruthy();
    });
  });

  it("renders a safe empty state when no meal plans exist", async () => {
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

      if (url === "/api/client/bookmarks") {
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

    render(React.createElement(ClientMealPlansPage));

    await waitFor(() => {
      expect(screen.getAllByText("No meal plans returned").length).toBeGreaterThan(0);
    });
  });

  it("does not bypass client session bootstrap before fetching meal-plan data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(ClientMealPlansPage));

    expect(screen.getByText("Loading meal plans")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
