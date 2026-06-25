import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchMock,
  logoutViaBffMock,
  routerRefreshMock,
  routerReplaceMock,
  useSessionBootstrapMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  logoutViaBffMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pt/settings",
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
    children: ReactNode;
    className?: string;
  }) => React.createElement("a", { href, className, ...rest }, children),
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

import PTSettingsPage from "@/app/pt/settings/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("PTSettingsPage mobile experience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    logoutViaBffMock.mockReset();
    routerRefreshMock.mockReset();
    routerReplaceMock.mockReset();
    useSessionBootstrapMock.mockReset();
    logoutViaBffMock.mockResolvedValue(undefined);
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "pt-1",
        email: "pt@example.com",
        role: "pt",
      },
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the mobile PT settings route after PT session bootstrap and preserves the existing /api/me fetch", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/me" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            id: "pt-1",
            email: "pt@example.com",
            role: "pt",
            full_name: "Alex Trainer",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTSettingsPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/me", { cache: "no-store" });
    expect(screen.getByRole("heading", { name: "Header Background" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Default" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dark Grid" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Purple Gradient" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Custom Local Image" })).toBeTruthy();
    expect(screen.getByText("Profile summary")).toBeTruthy();
    expect(screen.getAllByText("pt@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("pt").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alex Trainer").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Edit profile" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("preserves the existing /api/me PATCH payload shape and success feedback", async () => {
    let patchResolved = false;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/me" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            id: "pt-1",
            email: "pt@example.com",
            role: "pt",
            full_name: "Alex Trainer",
          },
        });
      }

      if (url === "/api/me" && method === "PATCH") {
        patchResolved = true;
        return jsonResponse({
          ok: true,
          data: {
            id: "pt-1",
            email: "pt@example.com",
            role: "pt",
            full_name: "Alex Prime",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTSettingsPage));

    await waitFor(() => {
      expect(screen.getByLabelText("Full name")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dark Grid" }));
    await waitFor(() => {
      expect(screen.getByText("Dark Grid saved locally.")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Alex Prime" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: "Alex Prime",
        }),
      });
    });

    expect(patchResolved).toBe(true);

    await waitFor(() => {
      expect(screen.getByText("Profile updated.")).toBeTruthy();
    });

    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("Alex Prime");
  });

  it("preserves the shared sign-out action behavior", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/me" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            id: "pt-1",
            email: "pt@example.com",
            role: "pt",
            name: "Alex Trainer",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTSettingsPage));

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

  it("renders a safe unavailable state when profile data is sparse and does not invent extra settings fields", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/me" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {},
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTSettingsPage));

    await waitFor(() => {
      expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("Profile payload fallback")).toBeTruthy();
    expect(screen.queryByText("Billing")).toBeNull();
    expect(screen.queryByText("Certification")).toBeNull();
    expect(screen.queryByText("Verification")).toBeNull();
    expect(screen.queryByText("Password")).toBeNull();
  });

  it("does not bypass PT session bootstrap before fetching settings data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(PTSettingsPage));

    expect(screen.getByText("Loading settings")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
