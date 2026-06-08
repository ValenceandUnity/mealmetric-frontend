import React from "react";
import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/operations",
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

import VendorOperationsPage from "@/app/vendor/operations/page";

describe("VendorOperationsPage mobile experience", () => {
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

  it("renders the vendor operations placeholder on the mobile foundation without page-level BFF calls", () => {
    render(React.createElement(VendorOperationsPage));

    expect(screen.getByRole("heading", { name: "Vendor Operations" })).toBeTruthy();
    expect(screen.getByText("Operations are not wired on this route yet")).toBeTruthy();
    expect(screen.getByText("Route intentionally held at placeholder level")).toBeTruthy();
    expect(screen.getByText(/Operational vendor tooling is intentionally blocked in UI-1/i)).toBeTruthy();
    expect(screen.getByText("Placeholder-only operational capabilities")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves supported vendor route links while keeping capability cards non-interactive", () => {
    render(React.createElement(VendorOperationsPage));

    expect(screen.getAllByRole("link", { name: "Vendor dashboard" })[0]?.getAttribute("href")).toBe("/vendor");
    expect(screen.getAllByRole("link", { name: "Metrics" })[0]?.getAttribute("href")).toBe("/vendor/metrics");
    expect(screen.getAllByRole("link", { name: "Meal plans" })[0]?.getAttribute("href")).toBe("/vendor/meal-plans");
    expect(screen.getAllByRole("link", { name: "Back to vendor" })[0]?.getAttribute("href")).toBe("/vendor");
    expect(screen.getByRole("link", { name: "Open dashboard" }).getAttribute("href")).toBe("/vendor");
    expect(screen.getByRole("link", { name: "Open meal plans" }).getAttribute("href")).toBe("/vendor/meal-plans");
    expect(screen.getByRole("link", { name: "Open metrics" }).getAttribute("href")).toBe("/vendor/metrics");
    expect(screen.getByRole("link", { name: "Open account" }).getAttribute("href")).toBe("/vendor/account");
    expect(screen.queryByRole("link", { name: "Pickup operations" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Fulfillment workflow" })).toBeNull();
  });

  it("does not introduce operational mutation controls or fake live operations data", () => {
    render(React.createElement(VendorOperationsPage));

    expect(screen.getByText("Pickup operations")).toBeTruthy();
    expect(screen.getByText("Fulfillment workflow")).toBeTruthy();
    expect(screen.getByText("Vendor order queue")).toBeTruthy();
    expect(screen.getByText("Inventory readiness")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /mark order ready/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /update pickup/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /assign staff/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /update inventory/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /dispatch/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    expect(screen.queryByText(/live order count/i)).toBeNull();
    expect(screen.queryByText(/pickup queue total/i)).toBeNull();
    expect(screen.queryByText(/inventory status: healthy/i)).toBeNull();
  });

  it("preserves the shared vendor loading and redirect states before any operations UI renders", () => {
    useSessionBootstrapMock.mockReturnValueOnce({
      status: "loading",
      user: null,
    });

    const { rerender } = render(React.createElement(VendorOperationsPage));

    expect(screen.getByText("Loading vendor operations")).toBeTruthy();
    expect(screen.getByText("Validating your authenticated MealMetric shell.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    useSessionBootstrapMock.mockReturnValueOnce({
      status: "unauthenticated",
      user: null,
    });

    rerender(React.createElement(VendorOperationsPage));

    expect(screen.getByText("Redirecting")).toBeTruthy();
    expect(screen.getByText("This route requires an authenticated session for the matching role.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
