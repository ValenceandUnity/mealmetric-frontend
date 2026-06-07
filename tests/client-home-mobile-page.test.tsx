import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client",
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

import ClientDashboardPage from "@/app/client/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("ClientDashboardPage mobile home", () => {
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

  it("renders the mobile client home from the existing /api/client/home BFF route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/home") {
        return jsonResponse({
          ok: true,
          data: {
            overview: {
              total_intake_calories: 2100,
              total_expenditure_calories: 1800,
              net_calorie_balance: 300,
              current_intake_ceiling_calories: 2200,
            },
            assignments: [{
              id: "assignment-1",
              title: "Lower body strength",
              description: "Tempo and recovery focus",
              pt_name: "Coach Rivera",
              status: "active",
              checklist: [{ title: "Warm up" }, { title: "Main lift" }],
              routines: [{ id: "routine-1", title: "Leg Day" }],
            }],
            mealPlans: [{
              id: "plan-1",
              name: "Lean Fuel Week",
              vendor_name: "Northside Prep",
              total_calories: 2100,
              total_price_cents: 5900,
              status: "featured",
            }],
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientDashboardPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Fuel the next session" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/client/home", { cache: "no-store" });
    expect(screen.getByRole("searchbox", { name: "Search client home" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bookmarks" }).getAttribute("href")).toBe("/client/bookmarks");
    expect(screen.getByRole("link", { name: "Add log" }).getAttribute("href")).toBe("/client/add-log");
    expect(screen.getByRole("heading", { name: "Lower body strength" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Lean Fuel Week" })).toBeTruthy();
    expect(screen.getByText("Northside Prep")).toBeTruthy();
    expect(screen.getByText("Target 2,200 cal")).toBeTruthy();
  });

  it("filters routines and meal plans locally from the top-hub search field", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/home") {
        return jsonResponse({
          ok: true,
          data: {
            overview: {
              total_intake_calories: 2100,
            },
            assignments: [{
              id: "assignment-1",
              title: "Lower body strength",
              description: "Tempo and recovery focus",
              checklist: [{ title: "Warm up" }],
            }],
            mealPlans: [{
              id: "plan-1",
              name: "Lean Fuel Week",
              vendor_name: "Northside Prep",
              total_calories: 2100,
              total_price_cents: 5900,
              status: "featured",
            }],
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientDashboardPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Lower body strength" })).toBeTruthy();
    });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search client home" }), {
      target: { value: "lean" },
    });

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Lower body strength" })).toBeNull();
    });

    expect(screen.getByRole("heading", { name: "Lean Fuel Week" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear search" })).toBeTruthy();
  });
});
