import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchMock,
  scrollIntoViewMock,
  searchParamsMock,
  useSessionBootstrapMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  scrollIntoViewMock: vi.fn(),
  searchParamsMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/add-log",
  useSearchParams: () => searchParamsMock(),
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

import AddLogPage from "@/app/client/add-log/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

function historyPreviewPayload(args?: {
  id?: string;
  hasMore?: boolean;
  exerciseName?: string;
}) {
  return {
    ok: true,
    data: {
      items: args?.id
        ? [{
            id: args.id,
            performed_at: "2026-06-08T10:00:00Z",
            mode: "rep",
            exercise_entries: [{
              id: "entry-1",
              exercise_name: args.exerciseName ?? "Bench Press",
              sets: 4,
              reps: 8,
              weight: 135.5,
              duration_seconds: 90,
              position: 0,
            }],
          }]
        : [],
      count: args?.id ? 1 : 0,
      limit: 5,
      offset: 0,
      next_offset: args?.hasMore ? 5 : null,
      has_more: args?.hasMore ?? false,
    },
  };
}

describe("AddLogPage mobile experience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    scrollIntoViewMock.mockReset();
    searchParamsMock.mockReset();
    useSessionBootstrapMock.mockReset();
    searchParamsMock.mockReturnValue(new URLSearchParams());
    useSessionBootstrapMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "client-1",
        email: "client@example.com",
        role: "client",
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
  });

  it("renders the mobile add-log route and preserves the existing history BFF fetch", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/workout-logs?limit=5&offset=0" && method === "GET") {
        return jsonResponse(historyPreviewPayload({ id: "log-1", hasMore: true }));
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(AddLogPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Log Workout" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/client/training/workout-logs?limit=5&offset=0",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe(
      "/client/settings",
    );
    expect(screen.getByText("Capture a workout quickly")).toBeTruthy();
    expect(
      screen.queryByText(
        "This page keeps the existing client workout-log mutation, form fields, and recent-history preview on the protected frontend BFF.",
      ),
    ).toBeNull();
    expect(screen.queryByText("Workout log")).toBeNull();
    expect(screen.getByText("Log A Rep")).toBeTruthy();
    expect(screen.getByText("Log Singular Reps here")).toBeTruthy();
    expect(screen.getByText("Log A Set")).toBeTruthy();
    expect(screen.getByText("Log multiple Reps")).toBeTruthy();
    expect(screen.getByText("Log a General Workout")).toBeTruthy();
    expect(screen.getByText("Log Your Entire Routine")).toBeTruthy();
    expect(screen.getByText("Goals and Aspirations")).toBeTruthy();
    expect(screen.getByText("Establish and track your goals and progress")).toBeTruthy();
    const recentExercisesButton = screen.getByRole("button", { name: "Show recent exercises" });
    expect(recentExercisesButton).toBeTruthy();
    fireEvent.click(recentExercisesButton);
    const recentExercisesDialog = screen.getByRole("dialog", { name: "Recent Exercises" });
    expect(within(recentExercisesDialog).getByText("Bench Press")).toBeTruthy();
    expect(within(recentExercisesDialog).getByRole("button", { name: "Close" })).toBeTruthy();
    fireEvent.click(within(recentExercisesDialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Recent Exercises" })).toBeNull();
    expect(screen.getByRole("link", { name: "Full History" }).getAttribute("href")).toBe(
      "/client/add-log/full-log-history",
    );
    expect(
      screen.getByRole("link", { name: "View Full Log History" }).getAttribute("href"),
    ).toBe("/client/add-log/full-log-history");
    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "New Entry" })).toBeNull();
  });

  it("preserves client session bootstrap gating before any BFF fetch", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(AddLogPage));

    expect(screen.getByText("Loading log workout")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders the existing form fields and rep context when opened from prefilled routine navigation", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams(
        "routineName=Bench%20Day&routineId=routine-1&assignmentId=assignment-9&routineLabel=Bench%20Press",
      ),
    );
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/workout-logs?limit=5&offset=0" && method === "GET") {
        return jsonResponse(historyPreviewPayload());
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(AddLogPage));

    await waitFor(() => {
      expect(screen.getByLabelText("Performed at")).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: "Rep" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Set" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "General Workout" })).toBeTruthy();
    expect(screen.getByLabelText("Rep")).toBeTruthy();
    expect(screen.getByDisplayValue("Bench Day")).toHaveProperty("readOnly", true);
    expect(screen.getByLabelText("Exercise name")).toBeTruthy();
    expect(screen.getByLabelText("Sets")).toBeTruthy();
    expect(screen.getByLabelText("Reps")).toBeTruthy();
    expect(screen.getByLabelText("Weight")).toBeTruthy();
    expect(screen.getByLabelText("Time (minutes)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Exercise" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save Log Entry" })).toBeTruthy();
    expect(screen.queryByText("Workout log")).toBeNull();
  });

  it("submits the exact existing workout-log payload shape and preserves success confirmation", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams(
        "routineName=Bench%20Day&routineId=routine-1&assignmentId=assignment-9&routineLabel=Bench%20Press",
      ),
    );

    let historyCallCount = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/workout-logs?limit=5&offset=0" && method === "GET") {
        historyCallCount += 1;
        return jsonResponse(
          historyCallCount === 1
            ? historyPreviewPayload()
            : historyPreviewPayload({ id: "log-1", exerciseName: "Bench Press" }),
        );
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

    render(React.createElement(AddLogPage));

    await waitFor(() => {
      expect(screen.getByLabelText("Exercise name")).toBeTruthy();
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
    fireEvent.change(screen.getByLabelText("Weight"), {
      target: { value: "135.5" },
    });
    fireEvent.change(screen.getByLabelText("Time (minutes)"), {
      target: { value: "1.5" },
    });
    const saveButton = screen.getByRole("button", { name: "Save Log Entry" }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    fireEvent.submit(document.getElementById("client-workout-entry-form") as HTMLFormElement);

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
    expect(typeof requestBody.performed_at).toBe("string");
    expect(new Date(requestBody.performed_at).toISOString()).toBe(requestBody.performed_at);
    expect(requestBody).toEqual({
      assignment_id: "assignment-9",
      routine_id: "routine-1",
      mode: "rep",
      performed_at: requestBody.performed_at,
      completion_status: "completed",
      exercise_entries: [{
        exercise_name: "Bench Press",
        sets: 4,
        reps: 8,
        weight: 135.5,
        duration_seconds: 90,
        position: 0,
      }],
    });
    expect(requestBody.exercise_entries[0].notes).toBeUndefined();

    await waitFor(() => {
      expect(
        screen.getByText(
          "The workout was saved through the protected BFF route and confirmed in refreshed log history.",
        ),
      ).toBeTruthy();
    });

    expect(scrollIntoViewMock).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save Log Entry" })).toBeTruthy();
    expect((screen.getByLabelText("Exercise name") as HTMLInputElement).value).toBe("");
  });

  it("preserves server error feedback without introducing a different mutation path", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/workout-logs?limit=5&offset=0" && method === "GET") {
        return jsonResponse(historyPreviewPayload());
      }

      if (url === "/api/client/training/workout-logs" && method === "POST") {
        return jsonResponse({
          ok: false,
          error: {
            code: "bad_request",
            message: "Unable to submit workout log.",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(React.createElement(AddLogPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save Log Entry" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Log Entry" }));

    await waitFor(() => {
      expect(screen.getByText("Unable to submit workout log.")).toBeTruthy();
    });

    const workoutLogCalls = fetchMock.mock.calls.filter(
      ([url, init]) => String(url) === "/api/client/training/workout-logs" && init?.method === "POST",
    );
    expect(workoutLogCalls).toHaveLength(1);
  });
});
