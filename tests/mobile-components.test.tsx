import React from "react";
import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
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

import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileMealPlanRow } from "@/components/mobile/MobileMealPlanRow";
import { MobileRoutineCard } from "@/components/mobile/MobileRoutineCard";
import { MobileTopHub } from "@/components/mobile/MobileTopHub";

describe("mobile components", () => {
  beforeEach(() => {
    pathnameMock.mockReset();
    pathnameMock.mockReturnValue("/client");
  });

  it("MobileCard renders children", () => {
    render(React.createElement(MobileCard, null, "Foundation layer"));

    expect(screen.getByText("Foundation layer")).toBeTruthy();
  });

  it("MobileTopHub renders title, greeting, and search label", () => {
    render(
      React.createElement(MobileTopHub, {
        greeting: "Good evening",
        title: "Fuel the next session",
        subtitle: "Mobile design system foundation",
        searchLabel: "Search plans",
        searchPlaceholder: "Search meal plans",
        avatarInitials: "MM",
      }),
    );

    expect(screen.getByText("Good evening")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Fuel the next session" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search plans" })).toBeTruthy();
  });

  it("MobileBottomNav renders expected role-aware navigation items for client", () => {
    pathnameMock.mockReturnValue("/client/metrics");

    render(React.createElement(MobileBottomNav, { role: "client" }));

    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/client");
    expect(screen.getByRole("link", { name: "Meal Plans" }).getAttribute("href")).toBe(
      "/client/meal-plans",
    );
    expect(screen.getByRole("link", { name: "Training" }).getAttribute("href")).toBe(
      "/client/training",
    );
    expect(screen.getByRole("link", { name: "Log" }).getAttribute("href")).toBe("/client/add-log");
    expect(screen.getByRole("link", { name: "Metrics" }).getAttribute("href")).toBe(
      "/client/metrics",
    );
  });

  it("MobileBottomNav renders expected role-aware navigation items for pt", () => {
    pathnameMock.mockReturnValue("/pt/clients/client-1/assign");

    render(React.createElement(MobileBottomNav, { role: "pt" }));

    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/pt");
    expect(screen.getByRole("link", { name: "Clients" }).getAttribute("href")).toBe(
      "/pt/clients",
    );
    expect(screen.getByRole("link", { name: "Training" }).getAttribute("href")).toBe(
      "/pt/training",
    );
    expect(screen.getByRole("link", { name: "Metrics" }).getAttribute("href")).toBe(
      "/pt/metrics",
    );
    expect(screen.getByRole("link", { name: "Meal Plans" }).getAttribute("href")).toBe(
      "/pt/meal-plans",
    );
  });

  it("MobileRoutineCard renders title and task info", () => {
    render(
      React.createElement(MobileRoutineCard, {
        title: "Lower body strength",
        subtitle: "Tempo and recovery focus",
        taskCount: 8,
        category: "Routine",
      }),
    );

    expect(screen.getByRole("heading", { name: "Lower body strength" })).toBeTruthy();
    expect(screen.getByText("8 tasks")).toBeTruthy();
  });

  it("MobileMealPlanRow renders plan, vendor, calories, and price", () => {
    render(
      React.createElement(MobileMealPlanRow, {
        name: "Lean Fuel Week",
        vendorName: "Northside Prep",
        calories: 2100,
        price: "$59",
        status: "featured",
      }),
    );

    expect(screen.getByRole("heading", { name: "Lean Fuel Week" })).toBeTruthy();
    expect(screen.getByText("Northside Prep")).toBeTruthy();
    expect(screen.getByText("2100 cal")).toBeTruthy();
    expect(screen.getByText("$59")).toBeTruthy();
  });
});
