import React from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/orders",
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
    children: React.ReactNode;
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

import ClientOrdersPage from "@/app/client/orders/page";
import ClientPickupsPage from "@/app/client/pickups/page";
import ClientSubscriptionsPage from "@/app/client/subscriptions/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

type RouteCase = {
  emptyMessage: string;
  emptyTitle: string;
  expectedTexts: string[];
  fetchPath: string;
  Page: () => React.JSX.Element;
  payload: unknown[];
  redirectMessage: string;
  subtitle: string;
  title: string;
};

const ROUTES: RouteCase[] = [
  {
    Page: ClientOrdersPage,
    title: "Orders",
    subtitle: "Read-only order activity returned through the protected client workspace.",
    fetchPath: "/api/client/orders",
    emptyTitle: "No orders returned",
    emptyMessage:
      "Order history will appear here when the client orders route returns structured records.",
    redirectMessage: "Orders require an authenticated client session.",
    payload: [
      {
        id: "order-1",
        status: "paid",
        meal_plan_name: "Lean Fuel Week",
        created_at: "2026-06-08",
        updated_at: "2026-06-09",
        total_price_cents: 5900,
      },
    ],
    expectedTexts: ["Lean Fuel Week", "paid", "2026-06-08", "$59.00"],
  },
  {
    Page: ClientPickupsPage,
    title: "Pickups",
    subtitle: "Read-only pickup activity returned through the protected client workspace.",
    fetchPath: "/api/client/pickups",
    emptyTitle: "No pickups returned",
    emptyMessage: "Pickup scheduling details will appear here when the BFF returns structured records.",
    redirectMessage: "Pickups require an authenticated client session.",
    payload: [
      {
        id: "pickup-1",
        status: "scheduled",
        meal_plan_name: "Lean Fuel Week",
        pickup_at: "2026-06-10 18:00",
        location: "Northside Prep",
        confirmation_code: "ABC123",
      },
    ],
    expectedTexts: ["Lean Fuel Week", "scheduled", "2026-06-10 18:00", "Northside Prep"],
  },
  {
    Page: ClientSubscriptionsPage,
    title: "Subscriptions",
    subtitle: "Read-only subscription activity returned through the protected client workspace.",
    fetchPath: "/api/client/subscriptions",
    emptyTitle: "No subscriptions returned",
    emptyMessage: "Subscription details will appear here when the BFF returns structured records.",
    redirectMessage: "Subscriptions require an authenticated client session.",
    payload: [
      {
        id: "subscription-1",
        status: "active",
        meal_plan_name: "Lean Fuel Week",
        cadence: "weekly",
        next_billing_at: "2026-06-15",
        total_price_cents: 5900,
      },
    ],
    expectedTexts: ["Lean Fuel Week", "active", "weekly", "2026-06-15", "$59.00"],
  },
];

describe("Client commerce routes mobile experience", () => {
  beforeEach(() => {
    vi.useRealTimers();
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

  for (const route of ROUTES) {
    it(`renders ${route.fetchPath} on the mobile foundation and preserves its existing read-only BFF fetch`, async () => {
      fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === route.fetchPath && method === "GET") {
          return jsonResponse({
            ok: true,
            data: route.payload,
          });
        }

        throw new Error(`Unexpected fetch: ${method} ${url}`);
      });

      render(React.createElement(route.Page));

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: route.title })).toBeTruthy();
      });

      expect(fetchMock).toHaveBeenCalledWith(route.fetchPath, { cache: "no-store" });
      expect(screen.getByText(route.subtitle)).toBeTruthy();
      expect(screen.getByText("No mutations")).toBeTruthy();
      expect(screen.getByText(route.fetchPath)).toBeTruthy();

      for (const expectedText of route.expectedTexts) {
        expect(screen.getAllByText(expectedText).length).toBeGreaterThan(0);
      }

      const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
      expect(requestedUrls).toEqual([route.fetchPath]);
      expect(requestedUrls.every((url) => url.startsWith("/api/client/"))).toBe(true);

      const mutationCalls = fetchMock.mock.calls.filter(
        ([, init]) => (init?.method ?? "GET").toUpperCase() !== "GET",
      );
      expect(mutationCalls).toHaveLength(0);

      expect(screen.queryByRole("button", {
        name: /checkout|cancel|refund|renew|pause|resume|reschedule|create order/i,
      })).toBeNull();
    });
  }

  for (const route of ROUTES) {
    it(`preserves client session gating for ${route.fetchPath}`, () => {
      useSessionBootstrapMock.mockReturnValue({
        status: "unauthenticated",
        user: null,
      });

      render(React.createElement(route.Page));

      expect(screen.getByText(route.redirectMessage)).toBeTruthy();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  }

  for (const route of ROUTES) {
    it(`renders the existing empty state for ${route.fetchPath}`, async () => {
      fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === route.fetchPath && method === "GET") {
          return jsonResponse({
            ok: true,
            data: [],
          });
        }

        throw new Error(`Unexpected fetch: ${method} ${url}`);
      });

      render(React.createElement(route.Page));

      await waitFor(() => {
        expect(screen.getByText(route.emptyTitle)).toBeTruthy();
      });

      expect(screen.getByText(route.emptyMessage)).toBeTruthy();
    });
  }
});
