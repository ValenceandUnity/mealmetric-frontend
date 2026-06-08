import React from "react";
import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/meal-plans/bookmark",
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

import ClientMealPlansBookmarkPage from "@/app/client/meal-plans/bookmark/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

const bookmarkPayload = {
  ok: true,
  data: {
    items: [{
      id: "folder-1",
      client_user_id: "client-1",
      name: "Favorites",
      description: "Weekly shortlist",
      created_at: "2026-06-07T00:00:00Z",
      updated_at: "2026-06-07T00:00:00Z",
      items: [{
        id: "bookmark-1",
        meal_plan_id: "plan-1",
        note: null,
        created_at: "2026-06-07T00:00:00Z",
        meal_plan: {
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
        },
      }],
    }],
    count: 1,
  },
};

describe("ClientMealPlansBookmarkPage mobile experience", () => {
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

  it("renders the mobile bookmark page from existing bookmark BFF data", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/bookmarks") {
        return jsonResponse(bookmarkPayload);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientMealPlansBookmarkPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Saved meal plans" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/client/bookmarks", { cache: "no-store" });
    expect(screen.getByText("Bookmarks and folders")).toBeTruthy();
    expect(screen.getAllByText("Favorites").length).toBeGreaterThan(0);
    expect(screen.getByText("Weekly shortlist")).toBeTruthy();
    expect(screen.getAllByText("Lean Fuel Week").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Northside Prep | 10001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$59.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2,100 cal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5 meals").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 availability windows").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Back to plans" }).getAttribute("href")).toBe("/client/meal-plans");
    expect(screen.getByRole("link", { name: "View plan" }).getAttribute("href")).toBe("/client/meal-plans/plan-1");
    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });

  it("renders a safe empty state when no bookmark folders exist", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

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

    render(React.createElement(ClientMealPlansBookmarkPage));

    await waitFor(() => {
      expect(screen.getByText("No saved meal plans yet")).toBeTruthy();
    });

    expect(screen.getByText("Start exploring and bookmark plans to see them here")).toBeTruthy();
  });

  it("renders a safe empty state when a folder has no saved meal plans", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

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
              items: [],
            }],
            count: 1,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientMealPlansBookmarkPage));

    await waitFor(() => {
      expect(screen.getByText("No saved plans in this folder")).toBeTruthy();
    });

    expect(screen.getByText("This folder exists, but it does not currently contain any saved meal plans.")).toBeTruthy();
  });

  it("shows bookmark fetch errors without bypassing the existing protected client route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/bookmarks") {
        return jsonResponse({
          ok: false,
          error: {
            code: "bookmark_load_failed",
            message: "Unable to load bookmarks.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientMealPlansBookmarkPage));

    await waitFor(() => {
      expect(screen.getByText("Unable to load bookmarks.")).toBeTruthy();
    });

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(calledUrls).toEqual(["/api/client/bookmarks"]);
  });

  it("does not bypass client session bootstrap before fetching bookmark data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(ClientMealPlansBookmarkPage));

    expect(screen.getByText("Loading saved plans")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
