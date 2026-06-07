import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, paramsMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  paramsMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/training/assignment-1",
  useParams: () => paramsMock(),
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

import AssignmentDetailPage from "@/app/client/training/[assignmentId]/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

describe("AssignmentDetailPage mobile experience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    paramsMock.mockReset();
    useSessionBootstrapMock.mockReset();
    paramsMock.mockReturnValue({
      assignmentId: "assignment-1",
    });
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

  it("renders package, routine, and checklist detail from the existing assignment BFF route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/client/training/assignments/assignment-1") {
        return jsonResponse({
          ok: true,
          data: {
            id: "assignment-1",
            title: "Strength Block",
            description: "Four-week progression",
            status: "active",
            package_id: "pkg-100",
            start_date: "2026-06-01T00:00:00Z",
            end_date: "2026-06-30T00:00:00Z",
            checklist: [
              { id: "task-1", title: "Warm up", completed: true },
              { id: "task-2", title: "Main lift", completed: false },
            ],
            routines: [{
              id: "routine-1",
              title: "Leg Day",
              label: "Monday",
              exercises: [{
                id: "exercise-1",
                exercise_name: "Back Squat",
                sets: 4,
                reps: 6,
                weight: 225,
              }],
            }],
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(AssignmentDetailPage));

    await waitFor(() => {
      expect(screen.getAllByText("Strength Block").length).toBeGreaterThan(0);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/client/training/assignments/assignment-1", {
      cache: "no-store",
    });
    expect(screen.getByText("Warm up")).toBeTruthy();
    expect(screen.getByText("Back Squat")).toBeTruthy();
    expect(screen.getByLabelText("Routine")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save workout log" })).toBeTruthy();
  });

  it("submits the log-your-reps form through the existing workout-log BFF route", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/assignments/assignment-1" && method === "GET") {
        return jsonResponse({
          ok: true,
          data: {
            id: "assignment-1",
            title: "Strength Block",
            description: "Four-week progression",
            checklist: [{ id: "task-1", title: "Warm up", completed: true }],
            routines: [{
              id: "routine-1",
              title: "Leg Day",
              label: "Monday",
              exercises: [{
                id: "exercise-1",
                exercise_name: "Back Squat",
                sets: 4,
                reps: 6,
              }],
            }],
          },
        });
      }

      if (url === "/api/client/training/workout-logs" && method === "POST") {
        return jsonResponse({
          ok: true,
          data: {
            id: "log-1",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(AssignmentDetailPage));

    await waitFor(() => {
      expect(screen.getByLabelText("Exercise name")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Routine"), {
      target: { value: "routine-1" },
    });
    fireEvent.change(screen.getByLabelText("Exercise name"), {
      target: { value: "Bench Press" },
    });
    fireEvent.change(screen.getByLabelText("Sets"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Reps"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save workout log" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client/training/workout-logs",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
    });

    const workoutLogCall = fetchMock.mock.calls.find(
      ([url, init]) => String(url) === "/api/client/training/workout-logs" && init?.method === "POST",
    );
    expect(workoutLogCall).toBeTruthy();

    const requestBody = JSON.parse(String(workoutLogCall?.[1]?.body));
    expect(requestBody).toEqual(expect.objectContaining({
      assignment_id: "assignment-1",
      routine_id: "routine-1",
      completion_status: "completed",
    }));
    expect(requestBody.exercise_entries?.[0]).toEqual(expect.objectContaining({
      exercise_name: "Bench Press",
      sets: 4,
      reps: 8,
      position: 0,
    }));

    await waitFor(() => {
      expect(screen.getByText("Workout log submitted through the protected client BFF route.")).toBeTruthy();
    });
  });
});
