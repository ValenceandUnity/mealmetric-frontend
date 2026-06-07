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
  usePathname: () => "/pt/clients/client-1",
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

import PTClientDetailPage from "@/app/pt/clients/[clientId]/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("PTClientDetailPage mobile experience", () => {
  beforeEach(() => {
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

  it("renders the mobile PT client-detail surface from the existing PT BFF routes", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/clients/client-1") {
        return jsonResponse({
          ok: true,
          data: {
            id: "link-1",
            client_user_id: "client-1",
            status: "active",
            notes: "Keep the nutrition review focused on consistency.",
            assignment_count: 2,
            workout_log_count: 1,
            latest_workout_log_at: "2026-06-07T15:00:00Z",
            client: {
              id: "client-1",
              email: "sam.client@example.com",
              role: "client",
              created_at: "2026-06-07T00:00:00Z",
            },
            current_assignments: [
              {
                id: "assignment-1",
                training_package_name: "Strength Block",
                status: "active",
                start_date: "2026-06-01",
                end_date: "2026-06-30",
              },
            ],
            metrics_snapshot: {
              as_of_date: "2026-06-07",
              net_calorie_balance: 250,
              current_intake_ceiling_calories: 2200,
              current_expenditure_floor_calories: 700,
              weekly_target_deficit_calories: 1400,
              deficit_progress_percent: 0.5,
            },
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
                training_package_name: "Strength Block",
                status: "active",
                start_date: "2026-06-01",
                end_date: "2026-06-30",
              },
            ],
            count: 1,
          },
        });
      }

      if (url === "/api/pt/clients/client-1/metrics") {
        return jsonResponse({
          ok: true,
          data: {
            overview: {
              as_of_date: "2026-06-07",
              net_calorie_balance: 250,
              current_intake_ceiling_calories: 2200,
              current_expenditure_floor_calories: 700,
              weekly_target_deficit_calories: 1400,
              deficit_progress_percent: 0.5,
            },
          },
        });
      }

      if (url === "/api/pt/clients/client-1/workout-logs") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "log-1",
                performed_at: "2026-06-07T15:00:00Z",
                routine_name: "Upper Day",
                duration_minutes: 44,
                completion_status: "completed",
                client_notes: "Felt strong today.",
                pt_notes: "Increase tempo next week.",
                exercise_entries: [
                  {
                    id: "entry-1",
                    exercise_name: "Bench Press",
                    sets: 4,
                    reps: 8,
                    position: 0,
                  },
                ],
              },
            ],
            count: 1,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTClientDetailPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Client Workspace" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/pt/clients/client-1", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/clients/client-1/assignments", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/clients/client-1/metrics", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/clients/client-1/workout-logs", { cache: "no-store" });
    expect(screen.getAllByText("sam.client@example.com").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Client summary" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "PT client action cards" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Assignment summary" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Metrics snapshot" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Workout log preview" })).toBeTruthy();
    expect(screen.getAllByText("Strength Block").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Upper Day").length).toBeGreaterThan(0);
    expect(screen.getByText("Increase tempo next week.")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Open metrics" })[0]?.getAttribute("href")).toBe("/pt/clients/client-1/metrics");
    expect(screen.getByRole("link", { name: "Recommend meal plan" }).getAttribute("href")).toBe(
      "/pt/clients/client-1/recommend-meal-plan",
    );
    expect(screen.getByRole("link", { name: "Log history" }).getAttribute("href")).toContain(
      "/pt/clients/client-1/log-history?clientEmail=sam.client%40example.com",
    );
  });

  it("renders safe empty states when assignments, metrics, and workout logs are unavailable", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/clients/client-1") {
        return jsonResponse({
          ok: true,
          data: {
            id: "link-1",
            client_user_id: "client-1",
            status: "active",
            client: {
              id: "client-1",
              email: "sam.client@example.com",
              role: "client",
              created_at: "2026-06-07T00:00:00Z",
            },
          },
        });
      }

      if (
        url === "/api/pt/clients/client-1/assignments" ||
        url === "/api/pt/clients/client-1/workout-logs"
      ) {
        return jsonResponse({
          ok: true,
          data: {
            items: [],
            count: 0,
          },
        });
      }

      if (url === "/api/pt/clients/client-1/metrics") {
        return jsonResponse({
          ok: true,
          data: {},
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTClientDetailPage));

    await waitFor(() => {
      expect(screen.getByText("No assignments yet")).toBeTruthy();
    });

    expect(screen.getAllByText("No metrics snapshot yet").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No workout logs yet").length).toBeGreaterThan(0);
  });

  it("preserves PT note updates through the existing PT note BFF route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/pt/clients/client-1") {
        return jsonResponse({
          ok: true,
          data: {
            id: "link-1",
            client_user_id: "client-1",
            status: "active",
            client: {
              id: "client-1",
              email: "sam.client@example.com",
              role: "client",
              created_at: "2026-06-07T00:00:00Z",
            },
          },
        });
      }

      if (url === "/api/pt/clients/client-1/assignments" || url === "/api/pt/clients/client-1/metrics") {
        return jsonResponse({
          ok: true,
          data: {
            items: [],
            count: 0,
          },
        });
      }

      if (url === "/api/pt/clients/client-1/workout-logs" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "log-1",
                performed_at: "2026-06-07T15:00:00Z",
                routine_name: "Upper Day",
                duration_minutes: 44,
                completion_status: "completed",
                client_notes: "Felt strong today.",
                pt_notes: null,
                exercise_entries: [],
              },
            ],
            count: 1,
          },
        });
      }

      if (url === "/api/pt/workout-logs/log-1/pt-notes" && method === "PATCH") {
        return jsonResponse({
          ok: true,
          data: {
            id: "log-1",
            performed_at: "2026-06-07T15:00:00Z",
            routine_name: "Upper Day",
            duration_minutes: 44,
            completion_status: "completed",
            client_notes: "Felt strong today.",
            pt_notes: "Keep bracing at the bottom.",
            exercise_entries: [],
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(PTClientDetailPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add PT note" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add PT note" }));
    fireEvent.change(screen.getByLabelText("PT note"), {
      target: { value: "Keep bracing at the bottom." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save PT note" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/pt/workout-logs/log-1/pt-notes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pt_notes: "Keep bracing at the bottom." }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("PT note saved.")).toBeTruthy();
    });
    expect(screen.getByText("Keep bracing at the bottom.")).toBeTruthy();
  });

  it("does not bypass PT session bootstrap before fetching PT client-detail data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(PTClientDetailPage));

    expect(screen.getByText("Loading client workspace")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
