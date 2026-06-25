import React from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchMock,
  logoutViaBffMock,
  routerRefreshMock,
  routerReplaceMock,
  setThemeMock,
  useSessionBootstrapMock,
  useThemeMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  logoutViaBffMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  setThemeMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
  useThemeMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/settings",
  useRouter: () => ({
    push: vi.fn(),
    replace: routerReplaceMock,
    refresh: routerRefreshMock,
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

vi.mock("@/components/theme/ThemeProvider", () => ({
  useTheme: useThemeMock,
}));

vi.mock("@/lib/client/session", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/client/session")>("@/lib/client/session");
  return {
    ...actual,
    logoutViaBff: logoutViaBffMock,
    useSessionBootstrap: useSessionBootstrapMock,
  };
});

import ClientSettingsPage from "@/app/client/settings/page";

describe("Client settings mobile experience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    logoutViaBffMock.mockReset();
    routerRefreshMock.mockReset();
    routerReplaceMock.mockReset();
    setThemeMock.mockReset();
    useSessionBootstrapMock.mockReset();
    useThemeMock.mockReset();
    logoutViaBffMock.mockResolvedValue(undefined);
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "client-1",
        email: "client@example.com",
        role: "client",
      },
    });
    useThemeMock.mockReturnValue({
      hydrated: true,
      theme: "dark",
      setTheme: setThemeMock,
      toggleTheme: vi.fn(),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the mobile client settings route after client session bootstrap without introducing /api/me fetches or profile-edit mutations", async () => {
    render(React.createElement(ClientSettingsPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Client Settings" })).toBeTruthy();
    });

    expect(screen.getByRole("heading", { name: "Header Background" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Default" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dark Grid" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Purple Gradient" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Custom Local Image" })).toBeTruthy();
    expect(screen.getByText("Settings overview")).toBeTruthy();
    expect(screen.getAllByText("client@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("client").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Preferences" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "App Controls" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    expect(screen.getAllByText("Notification preview").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    expect(screen.queryByText("Full name")).toBeNull();
    expect(screen.queryByText("Billing")).toBeNull();
    expect(screen.queryByText("Password")).toBeNull();
    expect(screen.queryByText("Privacy")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves local-only preference controls without introducing backend settings routes", async () => {
    render(React.createElement(ClientSettingsPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Light" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Purple Gradient" }));
    await waitFor(() => {
      expect(screen.getByText("Purple Gradient saved locally.")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(setThemeMock).toHaveBeenCalledWith("light");

    const previewToggle = screen.getByRole("button", { name: "Off" });
    fireEvent.click(previewToggle);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "On" })).toBeTruthy();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves the shared sign-out action behavior", async () => {
    render(React.createElement(ClientSettingsPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(logoutViaBffMock).toHaveBeenCalledTimes(1);
    });

    expect(routerReplaceMock).toHaveBeenCalledWith("/login");
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it("preserves client session gating before rendering settings controls", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(ClientSettingsPage));

    expect(screen.getByText("Loading settings")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
