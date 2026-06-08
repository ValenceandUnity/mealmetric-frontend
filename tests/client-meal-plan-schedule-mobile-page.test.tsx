import React from "react";
import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/meal-plans/schedule",
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

import ClientMealPlansSchedulePage from "@/app/client/meal-plans/schedule/page";

describe("ClientMealPlansSchedulePage mobile experience", () => {
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

  it("renders the mobile schedule placeholder after client session bootstrap", () => {
    render(React.createElement(ClientMealPlansSchedulePage));

    const homeLinks = screen.getAllByRole("link", { name: "Home" });

    expect(screen.getByRole("heading", { name: "Meal plan schedule" })).toBeTruthy();
    expect(screen.getByText("Meal-plan links")).toBeTruthy();
    expect(screen.getByText("Placeholder only")).toBeTruthy();
    expect(screen.getByText("Schedule view is not wired yet")).toBeTruthy();
    expect(screen.getByText("No upcoming meals are available here yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to plans" }).getAttribute("href")).toBe("/client/meal-plans");
    expect(homeLinks.some((link) => link.getAttribute("href") === "/client/meal-plans")).toBe(true);
    expect(screen.getByRole("link", { name: "Schedule" }).getAttribute("href")).toBe("/client/meal-plans/schedule");
    expect(screen.getByRole("link", { name: "Search" }).getAttribute("href")).toBe("/client/meal-plans/search");
    expect(screen.getByRole("link", { name: "Bookmark" }).getAttribute("href")).toBe("/client/meal-plans/bookmark");
    expect(screen.getByRole("link", { name: "Browse meal plans" }).getAttribute("href")).toBe("/client/meal-plans");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves the loading session gate and does not fetch schedule data early", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(ClientMealPlansSchedulePage));

    expect(screen.getByText("Loading meal plan schedule")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves the redirect state when the client session is unavailable", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "unauthenticated",
      user: null,
    });

    render(React.createElement(ClientMealPlansSchedulePage));

    expect(screen.getByText("Meal plan schedule requires an authenticated client session.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
