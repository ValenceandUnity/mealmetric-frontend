import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ clientId: "client-1" }),
  usePathname: () => "/pt/clients/client-1/assign",
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

import PTClientAssignPage from "@/app/pt/clients/[clientId]/assign/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("PTClientAssignPage mobile experience", () => {
  beforeEach(() => {
    vi.useRealTimers();
    fetchMock.mockReset();
    useSessionBootstrapMock.mockReset();
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

  it("renders the mobile assignment workspace from the existing PT BFF routes", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/packages") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "package-1",
                title: "Strength Camp",
                description: "Four-week barbell progression.",
              },
            ],
            count: 1,
          },
        });
      }

      if (url === "/api/pt/clients/client-1/assignments") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "assignment-1",
                status: "active",
                training_package_id: "package-1",
                start_date: "2026-06-01",
                end_date: "2026-06-30",
              },
            ],
            count: 1,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTClientAssignPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Assignment workspace" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/pt/packages", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/clients/client-1/assignments", { cache: "no-store" });
    expect(screen.getByRole("heading", { name: "Assign Training" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Client overview" }).getAttribute("href")).toBe(
      "/pt/clients/client-1",
    );
    expect(screen.getByRole("link", { name: "Back to clients" }).getAttribute("href")).toBe("/pt/clients");
    expect(screen.getByText("Client ID: client-1")).toBeTruthy();
    expect(screen.getAllByText("Strength Camp").length).toBeGreaterThan(0);
    expect(screen.getAllByText("package-1").length).toBeGreaterThan(0);

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.every((url) => url.startsWith("/api/pt/"))).toBe(true);
  });

  it("renders safe empty states when the PT package and assignment routes return no items", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/packages" || url === "/api/pt/clients/client-1/assignments") {
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

    render(React.createElement(PTClientAssignPage));

    await waitFor(() => {
      expect(screen.getByText("No packages returned")).toBeTruthy();
    });

    expect(screen.getByText("No assignments returned")).toBeTruthy();
    expect(screen.getByText("Assignments payload fallback")).toBeTruthy();
  });

  it("submits the existing assignment-create payload shape, shows loading feedback, and refreshes assignments", async () => {
    let assignmentFetchCount = 0;
    let resolveCreate: (() => void) | null = null;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/pt/packages" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "package-1",
                title: "Strength Camp",
                description: "Barbell block",
              },
              {
                id: "package-2",
                title: "Conditioning Reset",
                description: "Cardio and movement",
              },
            ],
            count: 2,
          },
        });
      }

      if (url === "/api/pt/clients/client-1/assignments" && method === "GET") {
        assignmentFetchCount += 1;
        return jsonResponse({
          ok: true,
          data: {
            items: assignmentFetchCount > 1
              ? [
                  {
                    id: "assignment-1",
                    status: "active",
                    training_package_id: "package-2",
                    start_date: "2026-06-10",
                    end_date: "2026-07-10",
                  },
                ]
              : [],
            count: assignmentFetchCount > 1 ? 1 : 0,
          },
        });
      }

      if (url === "/api/pt/clients/client-1/assignments/create" && method === "POST") {
        return new Promise((resolve) => {
          resolveCreate = () => {
            resolve({
              json: async () => ({
                ok: true,
                data: {
                  id: "assignment-1",
                },
              }),
            });
          };
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTClientAssignPage));

    const trainingPackageField = await screen.findByLabelText("Training package");

    await waitFor(() => {
      expect((trainingPackageField as HTMLSelectElement).value).toBe("package-1");
    });

    fireEvent.change(trainingPackageField, {
      target: { value: "package-2" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-06-10" },
    });
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-07-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create assignment" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Creating assignment..." })).toBeTruthy();
    });

    const createCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url) === "/api/pt/clients/client-1/assignments/create" && init?.method === "POST",
    );
    expect(createCall).toBeTruthy();
    expect(createCall?.[1]).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      training_package_id: "package-2",
      start_date: "2026-06-10",
      end_date: "2026-07-10",
    });

    resolveCreate?.();

    await waitFor(() => {
      expect(screen.getByText("Assignment created successfully.")).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/pt/clients/client-1/assignments", { cache: "no-store" });
    expect((screen.getByLabelText("Start date") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("End date") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Training package") as HTMLSelectElement).value).toBe("package-2");
    expect(screen.getByText("2026-06-10 to 2026-07-10")).toBeTruthy();
  });

  it("preserves assignment creation error feedback without introducing a different mutation path", async () => {
    let resolveCreate: (() => void) | null = null;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/pt/packages" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "package-1",
                title: "Strength Camp",
                description: "Barbell block",
              },
            ],
            count: 1,
          },
        });
      }

      if (url === "/api/pt/clients/client-1/assignments" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [],
            count: 0,
          },
        });
      }

      if (url === "/api/pt/clients/client-1/assignments/create" && method === "POST") {
        return new Promise((resolve) => {
          resolveCreate = () => {
            resolve({
              json: async () => ({
                ok: false,
                error: {
                  code: "bad_request",
                  message: "Unable to create assignment.",
                },
              }),
            });
          };
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTClientAssignPage));

    const trainingPackageField = await screen.findByLabelText("Training package");

    await waitFor(() => {
      expect((trainingPackageField as HTMLSelectElement).value).toBe("package-1");
    });

    fireEvent.change(trainingPackageField, {
      target: { value: "package-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create assignment" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Creating assignment..." })).toBeTruthy();
    });

    const createCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        String(url) === "/api/pt/clients/client-1/assignments/create" && init?.method === "POST",
    );
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(String(createCalls[0]?.[1]?.body))).toEqual({
      training_package_id: "package-1",
      start_date: null,
      end_date: null,
    });

    resolveCreate?.();

    await waitFor(() => {
      expect(screen.getByText("Unable to create assignment.")).toBeTruthy();
    });
  });

  it("does not bypass PT session bootstrap before fetching PT assignment data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(PTClientAssignPage));

    expect(screen.getByText("Loading assignment page")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
