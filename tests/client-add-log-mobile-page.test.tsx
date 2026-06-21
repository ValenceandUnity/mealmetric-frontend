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

const GOAL_TEMPLATE_STORAGE_KEY = "mealmetric:add-log:goal-templates";

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
    window.localStorage.clear();
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

  function mockHistoryPreviewOnly() {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/client/training/workout-logs?limit=5&offset=0" && method === "GET") {
        return jsonResponse(historyPreviewPayload());
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });
  }

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

  it("opens the Goals and Aspirations dialog with the required goal template fields", async () => {
    mockHistoryPreviewOnly();

    render(React.createElement(AddLogPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Goals and Aspirations/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Goals and Aspirations/i }));

    const dialog = screen.getByRole("dialog", { name: "Create Goal Template" });
    expect(within(dialog).getByLabelText("Goal label")).toBeTruthy();
    expect(within(dialog).getByLabelText("Goal target")).toBeTruthy();
    expect(within(dialog).getByLabelText("Goal note")).toBeTruthy();
    expect(within(dialog).getByLabelText("Push-up")).toBeTruthy();
    expect(within(dialog).getByLabelText("Running")).toBeTruthy();
    expect(within(dialog).getByLabelText("Bench press")).toBeTruthy();
    expect(within(dialog).getByLabelText("Jump rope")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Create Goal" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("opens the staple goal quad and prefills the modal from the 100 PUSH UP card", async () => {
    mockHistoryPreviewOnly();

    render(React.createElement(AddLogPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Show staple goal templates" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Show staple goal templates" }));
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("PUSH UP")).toBeTruthy();
    expect(screen.getByText("RUN A")).toBeTruthy();
    expect(screen.getByText("MILE")).toBeTruthy();
    expect(screen.getByText("BENCH")).toBeTruthy();
    expect(screen.getByText("200LBS")).toBeTruthy();
    expect(screen.getByText("10 MINS STRAIGHT")).toBeTruthy();
    expect(screen.getByText("JUMP ROPE")).toBeTruthy();
    expect(screen.queryByText("Template slot open")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Use staple goal 100 PUSH UP" }));

    const dialog = screen.getByRole("dialog", { name: "Create Goal Template" });
    expect(screen.getByDisplayValue("100")).toBeTruthy();
    expect(screen.getByDisplayValue("PUSH UP")).toBeTruthy();
    expect((within(dialog).getByLabelText("Push-up") as HTMLInputElement).checked).toBe(true);
  });

  it("creates a prefilled staple goal template and navigates to page 3", async () => {
    mockHistoryPreviewOnly();

    render(React.createElement(AddLogPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Show staple goal templates" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Show staple goal templates" }));
    fireEvent.click(screen.getByRole("button", { name: "Use staple goal 100 PUSH UP" }));

    const dialog = screen.getByRole("dialog", { name: "Create Goal Template" });
    fireEvent.change(within(dialog).getByLabelText("Goal label"), {
      target: { value: "150" },
    });
    fireEvent.change(within(dialog).getByLabelText("Goal target"), {
      target: { value: "PUSH UPS" },
    });
    fireEvent.change(within(dialog).getByLabelText("Goal note"), {
      target: { value: "Complete after every workout" },
    });
    fireEvent.click(within(dialog).getByLabelText("Coral"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Create Goal" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Create Goal Template" })).toBeNull();
    });

    expect(screen.getByText("150")).toBeTruthy();
    expect(screen.getByText("PUSH UPS")).toBeTruthy();
    expect(screen.getByText("Complete after every workout")).toBeTruthy();
    const starterPageButton = screen.getByRole("button", { name: "Show starter quad" });
    const staplePageButton = screen.getByRole("button", { name: "Show staple goal templates" });
    const firstTemplatePageButton = screen.getByRole("button", { name: "Show goal template page 1" });
    expect(within(starterPageButton).getByText("1")).toBeTruthy();
    expect(within(staplePageButton).getByText("2")).toBeTruthy();
    expect(within(firstTemplatePageButton).getByText("3")).toBeTruthy();
    expect(firstTemplatePageButton.getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("button", { name: "Previous quad page" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next quad page" })).toBeNull();
    expect(screen.getByRole("button", { name: "Create Goal" })).toBeTruthy();

    const storedTemplates = JSON.parse(
      window.localStorage.getItem(GOAL_TEMPLATE_STORAGE_KEY) ?? "[]",
    ) as Array<{ label: string; value: string; theme: string; iconName: string }>;
    expect(storedTemplates[0]).toMatchObject({
      label: "150",
      value: "PUSH UPS",
      theme: "coral",
      iconName: "pushup",
    });
  });

  it("pages goal templates in groups of four while preserving the starter quad", async () => {
    mockHistoryPreviewOnly();

    render(React.createElement(AddLogPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Goals and Aspirations/i })).toBeTruthy();
    });

    const templates = [
      { label: "Goal 1", value: "10 Push Ups", note: "Monday", theme: "emerald" },
      { label: "Goal 2", value: "20 Push Ups", note: "Tuesday", theme: "lime" },
      { label: "Goal 3", value: "30 Push Ups", note: "Wednesday", theme: "amber" },
      { label: "Goal 4", value: "40 Push Ups", note: "Thursday", theme: "orange" },
      { label: "Goal 5", value: "50 Push Ups", note: "Friday", theme: "rose" },
    ] as const;

    templates.forEach((template, index) => {
      fireEvent.click(
        screen.getByRole("button", {
          name: index === 0 ? /Goals and Aspirations/i : "Create Goal",
        }),
      );

      const dialog = screen.getByRole("dialog", { name: "Create Goal Template" });
      fireEvent.change(within(dialog).getByLabelText("Goal label"), {
        target: { value: template.label },
      });
      fireEvent.change(within(dialog).getByLabelText("Goal target"), {
        target: { value: template.value },
      });
      fireEvent.change(within(dialog).getByLabelText("Goal note"), {
        target: { value: template.note },
      });
      fireEvent.click(within(dialog).getByLabelText(template.theme.charAt(0).toUpperCase() + template.theme.slice(1)));
      fireEvent.click(within(dialog).getByRole("button", { name: "Create Goal" }));

      expect(screen.queryByRole("dialog", { name: "Create Goal Template" })).toBeNull();
    });

    const starterPageButton = screen.getByRole("button", { name: "Show starter quad" });
    const staplePageButton = screen.getByRole("button", { name: "Show staple goal templates" });
    const firstTemplatePageButton = screen.getByRole("button", { name: "Show goal template page 1" });
    const secondTemplatePageButton = screen.getByRole("button", { name: "Show goal template page 2" });

    expect(within(starterPageButton).getByText("1")).toBeTruthy();
    expect(within(staplePageButton).getByText("2")).toBeTruthy();
    expect(within(firstTemplatePageButton).getByText("3")).toBeTruthy();
    expect(within(secondTemplatePageButton).getByText("4")).toBeTruthy();
    expect(firstTemplatePageButton.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Goal 5")).toBeTruthy();
    expect(screen.getByText("Goal 4")).toBeTruthy();
    expect(screen.getByText("Goal 3")).toBeTruthy();
    expect(screen.getByText("Goal 2")).toBeTruthy();
    expect(screen.queryByText("Goal 1")).toBeNull();

    fireEvent.click(secondTemplatePageButton);

    expect(secondTemplatePageButton.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Goal 1")).toBeTruthy();
    expect(screen.queryByText("Goal 5")).toBeNull();
    expect(screen.getAllByText("Template slot open").length).toBe(3);

    fireEvent.click(firstTemplatePageButton);
    expect(firstTemplatePageButton.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Goal 5")).toBeTruthy();
    expect(screen.queryByText("Goal 1")).toBeNull();
  });

  it("renders numbered quad page buttons and lets the user switch between starter and placeholder pages", async () => {
    mockHistoryPreviewOnly();

    render(React.createElement(AddLogPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Show starter quad" })).toBeTruthy();
    });

    const starterPageButton = screen.getByRole("button", { name: "Show starter quad" });
    const staplePageButton = screen.getByRole("button", { name: "Show staple goal templates" });

    expect(within(starterPageButton).getByText("1")).toBeTruthy();
    expect(within(staplePageButton).getByText("2")).toBeTruthy();
    expect(starterPageButton.getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("button", { name: "Previous quad page" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next quad page" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Show goal template page 1" })).toBeNull();
    expect(screen.getByText("Log A Rep")).toBeTruthy();

    fireEvent.click(staplePageButton);

    expect(staplePageButton.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("PUSH UP")).toBeTruthy();
    expect(screen.getByText("JUMP ROPE")).toBeTruthy();
    expect(screen.queryByText("Template slot open")).toBeNull();
    expect(screen.queryByText("Log A Rep")).toBeNull();

    fireEvent.click(starterPageButton);

    expect(starterPageButton.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Log A Rep")).toBeTruthy();
    expect(screen.queryByText("Template slot open")).toBeNull();
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
