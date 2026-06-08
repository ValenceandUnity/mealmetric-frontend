import React from "react";
import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/account",
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

import VendorAccountPage from "@/app/vendor/account/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("VendorAccountPage mobile experience", () => {
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

  it("renders the vendor mobile account page from the existing vendor profile route", async () => {
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

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(VendorAccountPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Vendor Account" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/vendor/me", { cache: "no-store" });
    expect(fetchMock.mock.calls.some(([input]) => String(input) === "/api/vendor/metrics")).toBe(false);
    expect(fetchMock.mock.calls.some(([input]) => String(input) === "/api/vendor/meal-plans")).toBe(false);
    expect(fetchMock.mock.calls.every(([input]) => String(input) === "/api/vendor/me")).toBe(true);
    expect(fetchMock.mock.calls.every(([input]) => !/^https?:\/\//.test(String(input)))).toBe(true);
    expect(screen.getAllByText("vendor@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vendor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Green Table Kitchen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("green-table").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("active").length).toBeGreaterThan(0);
    expect(screen.getByText("Read-only account state")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Vendor dashboard" })[0]?.getAttribute("href")).toBe("/vendor");
    expect(screen.getAllByRole("link", { name: "Metrics" })[0]?.getAttribute("href")).toBe("/vendor/metrics");
    expect(screen.getAllByRole("link", { name: "Meal plans" })[0]?.getAttribute("href")).toBe("/vendor/meal-plans");
    expect(screen.getByRole("link", { name: "Open dashboard" }).getAttribute("href")).toBe("/vendor");
    expect(screen.getByRole("link", { name: "Open meal plans" }).getAttribute("href")).toBe("/vendor/meal-plans");
    expect(screen.getByRole("link", { name: "Open metrics" }).getAttribute("href")).toBe("/vendor/metrics");
    expect(screen.getByRole("link", { name: "Open operations placeholder" }).getAttribute("href")).toBe("/vendor/operations");
    expect(screen.queryByText(/verification/i)).toBeNull();
    expect(screen.queryByText(/payout/i)).toBeNull();
    expect(screen.queryByText(/banking/i)).toBeNull();
    expect(screen.queryByText(/tax/i)).toBeNull();
    expect(screen.queryByText(/onboarding/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
  });

  it("renders a safe default-vendor fallback when account data is sparse", async () => {
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

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(VendorAccountPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Vendor Account" })).toBeTruthy();
    });

    expect(screen.getAllByText("Default vendor unavailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No default vendor is configured for this account/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vendor operations").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ZIP unavailable").length).toBeGreaterThan(0);
  });

  it("renders the vendor profile error state when the BFF route fails", async () => {
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

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(VendorAccountPage));

    await waitFor(() => {
      expect(screen.getByText("Unable to load vendor profile")).toBeTruthy();
    });

    expect(screen.getByText("Unable to load vendor profile.")).toBeTruthy();
  });

  it("preserves the existing vendor auth loading state before any account fetch runs", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(VendorAccountPage));

    expect(screen.getByText("Loading vendor account")).toBeTruthy();
    expect(screen.getByText("Validating your authenticated MealMetric shell.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
