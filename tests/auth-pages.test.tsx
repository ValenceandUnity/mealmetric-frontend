import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replaceMock, fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    React.createElement("a", { href }, children),
}));

vi.mock("@/lib/client/session", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/client/session")>("@/lib/client/session");
  return {
    ...actual,
    useSessionBootstrap: useSessionBootstrapMock,
  };
});

import LandingPage from "@/app/page";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";

describe("auth pages and navigation", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    fetchMock.mockReset();
    useSessionBootstrapMock.mockReset();
    useSessionBootstrapMock.mockReturnValue({
      status: "unauthenticated",
      user: null,
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders landing, login, and register navigation links", () => {
    const { unmount: unmountLanding } = render(React.createElement(LandingPage));
    expect(screen.getByRole("link", { name: "Go to Login" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Create Account" }).getAttribute("href")).toBe(
      "/register",
    );
    unmountLanding();

    const { unmount: unmountLogin } = render(React.createElement(LoginPage));
    expect(screen.getByRole("link", { name: "Create account" }).getAttribute("href")).toBe(
      "/register",
    );
    unmountLogin();

    render(React.createElement(RegisterPage));
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
  });

  it("submits register page data to the local BFF and redirects PT users to the PT dashboard", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        ok: true,
        data: {
          user: {
            id: "user-pt",
            email: "pt@example.com",
            role: "pt",
          },
        },
      }),
    });

    render(React.createElement(RegisterPage));
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "pt@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "pt" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "pt@example.com",
          password: "password123",
          role: "pt",
        }),
      });
    });
    expect(replaceMock).toHaveBeenCalledWith("/pt");
  });

  it("does not expose admin or vendor self-registration choices", () => {
    render(React.createElement(RegisterPage));

    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Client", "PT"]);
    expect(screen.queryByRole("option", { name: "Admin" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Vendor" })).toBeNull();
  });
});
