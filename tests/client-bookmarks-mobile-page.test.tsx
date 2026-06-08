import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/bookmarks",
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

import ClientBookmarksPage from "@/app/client/bookmarks/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

function bookmarkPayloadWithItems() {
  return {
    ok: true,
    data: {
      items: [{
        id: "folder-1",
        client_user_id: "client-1",
        name: "Favorites",
        description: "Weekly shortlist",
        created_at: "2026-06-07T00:00:00Z",
        updated_at: "2026-06-08T00:00:00Z",
        items: [{
          id: "bookmark-1",
          meal_plan_id: "plan-1",
          note: null,
          created_at: "2026-06-08T10:00:00Z",
          meal_plan: {
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
          },
        }],
      }],
      count: 1,
    },
  };
}

describe("ClientBookmarksPage mobile experience", () => {
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

  it("renders the mobile bookmark-management route from the existing bookmark BFF fetch and preserves links", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/bookmarks") {
        return jsonResponse(bookmarkPayloadWithItems());
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientBookmarksPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Bookmarks" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/client/bookmarks", { cache: "no-store" });
    expect(screen.getByText("Saved-items workspace")).toBeTruthy();
    expect(screen.getByText("Saved overview")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Create folder" })).toBeTruthy();
    expect(screen.getAllByText("Favorites").length).toBeGreaterThan(0);
    expect(screen.getByText("Weekly shortlist")).toBeTruthy();
    expect(screen.getAllByText("Lean Fuel Week").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Northside Prep").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$59.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5 meals").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10001").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Browse meal plans" }).getAttribute("href")).toBe("/client/meal-plans");
    expect(screen.getByRole("link", { name: "Review metrics" }).getAttribute("href")).toBe("/client/metrics");
    expect(
      screen.getAllByRole("link", { name: "View plan" }).some((link) => link.getAttribute("href") === "/client/meal-plans/plan-1"),
    ).toBe(true);
    expect(screen.queryByRole("link", { name: "Bookmark page" })).toBeNull();
    expect(
      screen.getAllByRole("link").some((link) => link.getAttribute("href") === "/client/meal-plans/bookmark"),
    ).toBe(false);

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(calledUrls).toEqual(["/api/client/bookmarks"]);
    expect(calledUrls.every((url) => url.startsWith("/api/"))).toBe(true);
  });

  it("preserves folder creation through POST /api/client/bookmarks with the existing payload shape and refresh behavior", async () => {
    let bookmarksFetchCount = 0;
    let resolveCreate: (() => void) | null = null;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/bookmarks" && method === "GET") {
        bookmarksFetchCount += 1;
        return jsonResponse(
          bookmarksFetchCount === 1
            ? {
                ok: true,
                data: {
                  items: [],
                  count: 0,
                },
              }
            : bookmarkPayloadWithItems(),
        );
      }

      if (url === "/api/client/bookmarks" && method === "POST") {
        return new Promise((resolve) => {
          resolveCreate = () => {
            resolve({
              json: async () => ({
                ok: true,
                data: {
                  id: "folder-1",
                  client_user_id: "client-1",
                  name: "Favorites",
                  description: null,
                  created_at: "2026-06-08T00:00:00Z",
                  updated_at: "2026-06-08T00:00:00Z",
                  items: [],
                },
              }),
            });
          };
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientBookmarksPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create folder" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Create folder" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Creating folder..." })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/client/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Favorites" }),
    });

    resolveCreate?.();

    await waitFor(() => {
      expect(screen.getByText("Folder created")).toBeTruthy();
    });

    expect(screen.getByText("Favorites is ready for saved meal plans.")).toBeTruthy();
    expect((screen.getByLabelText("Folder name") as HTMLInputElement).value).toBe("");
    expect(fetchMock).toHaveBeenCalledWith("/api/client/bookmarks", { cache: "no-store" });
  });

  it("preserves folder deletion through the existing bookmark-folder DELETE route and confirm step", async () => {
    let bookmarksFetchCount = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/bookmarks" && method === "GET") {
        bookmarksFetchCount += 1;
        return jsonResponse(
          bookmarksFetchCount === 1
            ? {
                ok: true,
                data: {
                  items: [{
                    id: "folder-1",
                    client_user_id: "client-1",
                    name: "Favorites",
                    description: "Weekly shortlist",
                    created_at: "2026-06-07T00:00:00Z",
                    updated_at: "2026-06-08T00:00:00Z",
                    items: [],
                  }],
                  count: 1,
                },
              }
            : {
                ok: true,
                data: {
                  items: [],
                  count: 0,
                },
              },
        );
      }

      if (url === "/api/client/bookmarks/folder-1" && method === "DELETE") {
        return jsonResponse({
          ok: true,
          data: {
            deleted: true,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(ClientBookmarksPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete folder" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete folder" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirm delete" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/client/bookmarks/folder-1", {
        method: "DELETE",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Folder deleted")).toBeTruthy();
    });
  });

  it("preserves saved-item removal through the existing bookmark-item DELETE route and confirm step", async () => {
    let bookmarksFetchCount = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/bookmarks" && method === "GET") {
        bookmarksFetchCount += 1;
        return jsonResponse(
          bookmarksFetchCount === 1
            ? bookmarkPayloadWithItems()
            : {
                ok: true,
                data: {
                  items: [{
                    id: "folder-1",
                    client_user_id: "client-1",
                    name: "Favorites",
                    description: "Weekly shortlist",
                    created_at: "2026-06-07T00:00:00Z",
                    updated_at: "2026-06-08T00:00:00Z",
                    items: [],
                  }],
                  count: 1,
                },
              },
        );
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

    render(React.createElement(ClientBookmarksPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Remove from folder" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove from folder" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirm remove" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Confirm remove" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/client/bookmarks/folder-1/items/bookmark-1", {
        method: "DELETE",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Saved plan removed")).toBeTruthy();
    });
  });

  it("renders safe empty states for no folders and for folders with no items", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/bookmarks") {
        return jsonResponse({
          ok: true,
          data: {
            items: [{
              id: "folder-1",
              client_user_id: "client-1",
              name: "Favorites",
              description: null,
              created_at: "2026-06-07T00:00:00Z",
              updated_at: "2026-06-08T00:00:00Z",
              items: [],
            }],
            count: 1,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientBookmarksPage));

    await waitFor(() => {
      expect(screen.getByText("No saved plan yet")).toBeTruthy();
    });

    expect(screen.getByText("Folder is empty")).toBeTruthy();
    expect(screen.getByText("Use the bookmark action on a meal plan to populate this folder.")).toBeTruthy();
  });

  it("renders a safe empty state when no bookmark folders exist", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/bookmarks") {
        return jsonResponse({
          ok: true,
          data: {
            items: [],
            count: 0,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(ClientBookmarksPage));

    await waitFor(() => {
      expect(screen.getByText("No bookmark folders yet")).toBeTruthy();
    });

    expect(screen.getByText("Create a folder, then save meal plans from the discovery page.")).toBeTruthy();
  });

  it("does not bypass client session bootstrap before fetching bookmark data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(ClientBookmarksPage));

    expect(screen.getByText("Loading bookmarks")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
