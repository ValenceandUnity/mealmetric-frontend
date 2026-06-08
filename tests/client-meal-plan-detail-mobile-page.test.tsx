import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchMock,
  useParamsMock,
  useSessionBootstrapMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useParamsMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: useParamsMock,
  usePathname: () => "/client/meal-plans/plan-1",
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

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    ...rest
  }: {
    alt: string;
    src: string;
  }) => React.createElement("img", { alt, src, ...rest }),
}));

vi.mock("@/lib/client/session", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/client/session")>("@/lib/client/session");
  return {
    ...actual,
    useSessionBootstrap: useSessionBootstrapMock,
  };
});

import ClientMealPlanDetailPage from "@/app/client/meal-plans/[mealPlanId]/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

const mealPlanDetailPayload = {
  ok: true,
  data: {
    id: "plan-1",
    vendor_id: "vendor-1",
    vendor_name: "Northside Prep",
    vendor_zip_code: "10001",
    slug: "lean-fuel-week",
    name: "Lean Fuel Week",
    description: "High-protein lunches for the work week.",
    status: "published",
    total_price_cents: 5900,
    total_calories: 2100,
    item_count: 5,
    availability_count: 2,
    pickup_location: "Chelsea Kitchen",
    pickup_notes: "Bring your order confirmation.",
    protein_grams: 120,
    carbs_grams: 180,
    fat_grams: 70,
    meals: [{
      name: "Chicken Bowl",
      quantity: 1,
      calories: 450,
      total_price_cents: 1299,
      category: "Lunch",
      portion_size: "Standard",
      description: "Lunch pack",
    }],
    availability_windows: [{
      name: "Mon pickup",
      window_label: "Monday 10:00 AM to 12:00 PM",
      status: "open",
      remaining_inventory: 8,
      pickup_location: "Chelsea Kitchen",
      pickup_notes: "Curbside collection",
    }],
  },
};

const emptyBookmarksPayload = {
  ok: true,
  data: {
    items: [],
    count: 0,
  },
};

function bookmarkedPayload() {
  return {
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
}

describe("ClientMealPlanDetailPage mobile experience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    useParamsMock.mockReset();
    useSessionBootstrapMock.mockReset();
    useParamsMock.mockReturnValue({
      mealPlanId: "plan-1",
    });
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

  it("renders the mobile detail surface from existing meal-plan and bookmark BFF data", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/meal-plans/plan-1" && method === "GET") {
        return jsonResponse(mealPlanDetailPayload);
      }

      if (url === "/api/client/bookmarks" && method === "GET") {
        return jsonResponse(bookmarkedPayload());
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientMealPlanDetailPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Meal plan detail" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/client/meal-plans/plan-1", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/client/bookmarks", { cache: "no-store" });
    expect(screen.getAllByText("Lean Fuel Week").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Northside Prep").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$59.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2,100 cal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5 meals").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 availability windows").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chelsea Kitchen").length).toBeGreaterThan(0);
    expect(screen.getByText("Chicken Bowl")).toBeTruthy();
    expect(screen.getByText("Mon pickup")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove bookmark for Lean Fuel Week" })).toBeTruthy();

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(calledUrls.every((url) => url.startsWith("/api/"))).toBe(true);
  });

  it("creates the default folder and saves a bookmark through the existing bookmark BFF routes", async () => {
    let bookmarkRefreshCount = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/meal-plans/plan-1" && method === "GET") {
        return jsonResponse(mealPlanDetailPayload);
      }

      if (url === "/api/client/bookmarks" && method === "GET") {
        bookmarkRefreshCount += 1;
        return jsonResponse(bookmarkRefreshCount === 1 ? emptyBookmarksPayload : bookmarkedPayload());
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

    render(React.createElement(ClientMealPlanDetailPage));

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

  it("removes an existing bookmark through the current bookmark item BFF route", async () => {
    let bookmarkRefreshCount = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/meal-plans/plan-1" && method === "GET") {
        return jsonResponse(mealPlanDetailPayload);
      }

      if (url === "/api/client/bookmarks" && method === "GET") {
        bookmarkRefreshCount += 1;
        return jsonResponse(bookmarkRefreshCount === 1 ? bookmarkedPayload() : emptyBookmarksPayload);
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

    render(React.createElement(ClientMealPlanDetailPage));

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

  it("preserves the existing checkout session payload, success flow, and redirect message", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/meal-plans/plan-1" && method === "GET") {
        return jsonResponse(mealPlanDetailPayload);
      }

      if (url === "/api/client/bookmarks" && method === "GET") {
        return jsonResponse(emptyBookmarksPayload);
      }

      if (url === "/api/client/checkout/session" && method === "POST") {
        return jsonResponse({
          ok: true,
          data: {
            checkout_url: "/checkout/mock-session",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientMealPlanDetailPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Select Lean Fuel Week for checkout" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Select Lean Fuel Week for checkout" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "View ordering options for Lean Fuel Week" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "View ordering options for Lean Fuel Week" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/client/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal_plan_id: "plan-1",
        }),
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("Ordering options are ready. Continue when you want to review the next step."),
      ).toBeTruthy();
    });

    const checkoutLink = screen.getByRole("link", { name: "Secure Checkout" });
    expect(checkoutLink.getAttribute("href")).toBe("/checkout/mock-session");

    fireEvent.click(checkoutLink);

    await waitFor(() => {
      expect(screen.getByText("Redirecting to secure checkout...")).toBeTruthy();
    });
  });

  it("shows checkout failure feedback and safe missing-data states", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/meal-plans/plan-1" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            id: "plan-1",
            name: "Lean Fuel Week",
          },
        });
      }

      if (url === "/api/client/bookmarks" && method === "GET") {
        return jsonResponse(emptyBookmarksPayload);
      }

      if (url === "/api/client/checkout/session" && method === "POST") {
        return jsonResponse({
          ok: false,
          error: {
            code: "checkout_failed",
            message: "Unable to create checkout session.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientMealPlanDetailPage));

    await waitFor(() => {
      expect(screen.getByText("Meal plan vendor")).toBeTruthy();
    });

    expect(screen.getAllByText("ZIP unavailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Price unavailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Calories unavailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Meal count unavailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Availability unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("Included meals are not listed yet")).toBeTruthy();
    expect(screen.getByText("Vendor detail is limited")).toBeTruthy();
    expect(screen.getByText("Pickup windows are not listed yet")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Select Lean Fuel Week for checkout" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "View ordering options for Lean Fuel Week" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "View ordering options for Lean Fuel Week" }));

    await waitFor(() => {
      expect(screen.getByText("We couldn't start checkout. Please try again.")).toBeTruthy();
    });
  });

  it("keeps detail visible when bookmarks fail and disables bookmark mutation safely", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/meal-plans/plan-1" && method === "GET") {
        return jsonResponse(mealPlanDetailPayload);
      }

      if (url === "/api/client/bookmarks" && method === "GET") {
        return jsonResponse({
          ok: false,
          error: {
            code: "bookmark_load_failed",
            message: "Unable to load bookmarks.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientMealPlanDetailPage));

    await waitFor(() => {
      expect(screen.getAllByText("Lean Fuel Week").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("Bookmarks unavailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unable to load bookmarks.").length).toBeGreaterThan(0);
    expect(
      (screen.getByRole("button", { name: "Save plan for Lean Fuel Week" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("does not bypass client session bootstrap before fetching detail data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(ClientMealPlanDetailPage));

    expect(screen.getByText("Loading meal plan")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
