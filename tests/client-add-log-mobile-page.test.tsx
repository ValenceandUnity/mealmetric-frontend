import React, { type ReactNode } from "react";

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
const HISTORY_URL = "/api/client/training/workout-logs?limit=5&offset=0";
const POST_URL = "/api/client/training/workout-logs";

type HistoryMode = "rep" | "set" | "general_workout";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

function createHistoryItem(args: {
  id: string;
  mode: HistoryMode;
  exerciseName: string;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  durationSeconds?: number | null;
  performedAt?: string;
}) {
  return {
    id: args.id,
    performed_at: args.performedAt ?? "2026-06-08T10:00:00Z",
    mode: args.mode,
    exercise_entries: [{
      id: `${args.id}-entry-1`,
      exercise_name: args.exerciseName,
      sets: args.sets ?? null,
      reps: args.reps ?? null,
      weight: args.weight ?? null,
      duration_seconds: args.durationSeconds ?? null,
      position: 0,
    }],
  };
}

function historyPayload(items: Array<ReturnType<typeof createHistoryItem>>, hasMore = false) {
  return {
    ok: true,
    data: {
      items,
      count: items.length,
      limit: 5,
      offset: 0,
      next_offset: hasMore ? 5 : null,
      has_more: hasMore,
    },
  };
}

function mockHistoryOnly(items: Array<ReturnType<typeof createHistoryItem>>, hasMore = false) {
  fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url === HISTORY_URL && method === "GET") {
      return jsonResponse(historyPayload(items, hasMore));
    }

    throw new Error(`Unexpected fetch: ${method} ${url}`);
  });
}

function mockHistoryAndPost(args: {
  initialItems: Array<ReturnType<typeof createHistoryItem>>;
  refreshedItems?: Array<ReturnType<typeof createHistoryItem>>;
  postPayload?: unknown;
}) {
  let historyCallCount = 0;

  fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url === HISTORY_URL && method === "GET") {
      historyCallCount += 1;
      return jsonResponse(
        historyPayload(
          historyCallCount === 1
            ? args.initialItems
            : (args.refreshedItems ?? args.initialItems),
        ),
      );
    }

    if (url === POST_URL && method === "POST") {
      return jsonResponse(
        args.postPayload ?? {
          ok: true,
          data: { id: "saved-log-1" },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${method} ${url}`);
  });
}

function openEntryModal(buttonName: string) {
  fireEvent.click(screen.getByRole("button", { name: buttonName }));
  return screen.getByRole("dialog", {
    name:
      buttonName === "Open Log A Rep form"
        ? "Log A Rep"
        : buttonName === "Open Log A Set form"
          ? "Log A Set"
          : "Log a General Workout",
  });
}

function getLatestPostBody() {
  const workoutLogCall = fetchMock.mock.calls.findLast(
    ([url, init]) => String(url) === POST_URL && init?.method === "POST",
  );
  expect(workoutLogCall).toBeTruthy();
  return JSON.parse(String(workoutLogCall?.[1]?.body));
}

describe("AddLogPage mobile experience", () => {
  const mixedHistoryItems = [
    createHistoryItem({
      id: "rep-log-1",
      mode: "rep",
      exerciseName: "Bench Press",
      sets: 4,
      reps: 8,
      weight: 135.5,
      durationSeconds: 90,
      performedAt: "2026-06-08T10:00:00Z",
    }),
    createHistoryItem({
      id: "set-log-1",
      mode: "set",
      exerciseName: "Deadlift",
      sets: 5,
      reps: 3,
      weight: 225,
      durationSeconds: 120,
      performedAt: "2026-06-09T10:00:00Z",
    }),
    createHistoryItem({
      id: "general-log-1",
      mode: "general_workout",
      exerciseName: "Morning Circuit",
      sets: 2,
      reps: 12,
      weight: 40,
      durationSeconds: 1800,
      performedAt: "2026-06-10T10:00:00Z",
    }),
  ];

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

  it("renders the route and preserves the existing history BFF fetch and GO recent-exercises drawer", async () => {
    mockHistoryOnly(mixedHistoryItems, true);

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Log Workout" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      HISTORY_URL,
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe(
      "/client/settings",
    );
    expect(screen.getByText("Capture a workout quickly")).toBeTruthy();
    expect(screen.getByText("Log A Rep")).toBeTruthy();
    expect(screen.getByText("Log A Set")).toBeTruthy();
    expect(screen.getByText("Log a General Workout")).toBeTruthy();
    expect(screen.getByText("Goals and Aspirations")).toBeTruthy();

    const recentExercisesButton = screen.getByRole("button", { name: "Show recent exercises" });
    fireEvent.click(recentExercisesButton);
    const recentExercisesDialog = screen.getByRole("dialog", { name: "Recent Exercises" });
    expect(within(recentExercisesDialog).getByText("Morning Circuit")).toBeTruthy();
    expect(within(recentExercisesDialog).getByRole("button", { name: "Close" })).toBeTruthy();
    fireEvent.click(within(recentExercisesDialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Recent Exercises" })).toBeNull();

    expect(screen.getByRole("link", { name: "Full History" }).getAttribute("href")).toBe(
      "/client/add-log/full-log-history",
    );
    expect(
      screen.getByRole("link", { name: "View Full Log History" }).getAttribute("href"),
    ).toBe("/client/add-log/full-log-history");
    expect(screen.queryByRole("dialog", { name: "Log A Rep" })).toBeNull();
    expect(screen.queryByLabelText("Exercise name")).toBeNull();
  });

  it("preserves client session bootstrap gating before any BFF fetch", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(<AddLogPage />);

    expect(screen.getByText("Loading log workout")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens the starter quad cards as entry-form modals and preserves close behavior", async () => {
    mockHistoryOnly(mixedHistoryItems);

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open Log A Rep form" })).toBeTruthy();
    });

    expect(
      screen.queryByText(
        "For one offs, select Rep. For logging consecutive Reps, select Set. For logging an entire routine with multiple sets, select General Workout",
      ),
    ).toBeNull();
    expect(screen.queryByText("Routine context")).toBeNull();
    expect(screen.queryByText("Workout entry")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open Log A Rep form" }));
    expect(screen.getByRole("dialog", { name: "Log A Rep" })).toBeTruthy();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Log A Rep" })).toBeNull();
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Open Log A Set form" }));
    expect(screen.getByRole("dialog", { name: "Log A Set" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Log A Set" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open Log a General Workout form" }));
    expect(screen.getByRole("dialog", { name: "Log a General Workout" })).toBeTruthy();
  });

  it("replaces the old modal mode pills with Log and Recent History tabs", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams(
        "routineName=Bench%20Day&routineId=routine-1&assignmentId=assignment-9&routineLabel=Bench%20Press",
      ),
    );
    mockHistoryOnly(mixedHistoryItems);

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open Log A Rep form" })).toBeTruthy();
    });

    const dialog = openEntryModal("Open Log A Rep form");
    const tablist = within(dialog).getByRole("tablist", { name: "Add log modal sections" });
    expect(within(tablist).getByText("Log")).toBeTruthy();
    expect(within(tablist).getByText("Recent History")).toBeTruthy();

    const logTab = within(tablist).getByRole("tab", { name: "Show log form" });
    const recentHistoryTab = within(tablist).getByRole("tab", { name: "Show recent history" });

    expect(logTab.getAttribute("aria-selected")).toBe("true");
    expect(recentHistoryTab.getAttribute("aria-selected")).toBe("false");
    expect(within(tablist).queryByRole("tab", { name: "Rep" })).toBeNull();
    expect(within(tablist).queryByRole("tab", { name: "Set" })).toBeNull();
    expect(within(tablist).queryByRole("tab", { name: "General Workout" })).toBeNull();

    fireEvent.click(recentHistoryTab);
    expect(screen.getByRole("dialog", { name: "Log A Rep" })).toBe(dialog);
    expect(within(dialog).getByRole("heading", { name: "Recent History" })).toBeTruthy();
    expect(within(dialog).queryByLabelText("Exercise name")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Save Log Entry" })).toBeNull();

    fireEvent.click(logTab);
    expect(screen.getByRole("dialog", { name: "Log A Rep" })).toBe(dialog);
    expect(within(dialog).getByLabelText("Exercise name")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Save Log Entry" })).toBeTruthy();
  });

  it("filters Recent History by the selected log type", async () => {
    mockHistoryOnly(mixedHistoryItems);

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open Log A Rep form" })).toBeTruthy();
    });

    const repDialog = openEntryModal("Open Log A Rep form");
    fireEvent.click(within(repDialog).getByRole("tab", { name: "Show recent history" }));
    expect(within(repDialog).getByText("Recent rep logs")).toBeTruthy();
    expect(within(repDialog).getByText("Bench Press")).toBeTruthy();
    expect(within(repDialog).queryByText("Deadlift")).toBeNull();
    expect(within(repDialog).queryByText("Morning Circuit")).toBeNull();
    fireEvent.click(within(repDialog).getByRole("button", { name: "Close" }));

    const setDialog = openEntryModal("Open Log A Set form");
    fireEvent.click(within(setDialog).getByRole("tab", { name: "Show recent history" }));
    expect(within(setDialog).getByText("Recent set logs")).toBeTruthy();
    expect(within(setDialog).getByText("Deadlift")).toBeTruthy();
    expect(within(setDialog).queryByText("Bench Press")).toBeNull();
    expect(within(setDialog).queryByText("Morning Circuit")).toBeNull();
    fireEvent.click(within(setDialog).getByRole("button", { name: "Close" }));

    const generalDialog = openEntryModal("Open Log a General Workout form");
    fireEvent.click(within(generalDialog).getByRole("tab", { name: "Show recent history" }));
    expect(within(generalDialog).getByText("Recent general workout logs")).toBeTruthy();
    expect(within(generalDialog).getByText("Morning Circuit")).toBeTruthy();
    expect(within(generalDialog).queryByText("Bench Press")).toBeNull();
    expect(within(generalDialog).queryByText("Deadlift")).toBeNull();
  });

  it("removes Best Performance and the old best-from-history summary from the modal", async () => {
    mockHistoryOnly(mixedHistoryItems);

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open Log A Rep form" })).toBeTruthy();
    });

    const dialog = openEntryModal("Open Log A Rep form");
    expect(within(dialog).queryByText("Best Performance")).toBeNull();
    expect(within(dialog).queryByText("Best from recent logs")).toBeNull();
  });

  it("removes the Sets field and Add Exercise button from rep mode and omits sets from the POST payload", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams(
        "routineName=Bench%20Day&routineId=routine-1&assignmentId=assignment-9&routineLabel=Bench%20Press",
      ),
    );
    mockHistoryAndPost({
      initialItems: mixedHistoryItems,
      refreshedItems: [
        createHistoryItem({
          id: "saved-log-1",
          mode: "rep",
          exerciseName: "Bench Press",
          reps: 8,
          weight: 135.5,
          durationSeconds: 90,
        }),
      ],
    });

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open Log A Rep form" })).toBeTruthy();
    });

    const dialog = openEntryModal("Open Log A Rep form");
    expect(within(dialog).getByDisplayValue("Bench Day")).toHaveProperty("readOnly", true);
    expect(within(dialog).queryByLabelText("Sets")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Add Exercise" })).toBeNull();
    expect(within(dialog).getByLabelText("Exercise name")).toBeTruthy();
    expect(within(dialog).getByLabelText("Reps")).toBeTruthy();
    expect(within(dialog).getByLabelText("Weight")).toBeTruthy();
    expect(within(dialog).getByLabelText("Time (minutes)")).toBeTruthy();
    expect(within(dialog).getByLabelText("Performed at")).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText("Exercise name"), {
      target: { value: "Bench Press" },
    });
    fireEvent.change(within(dialog).getByLabelText("Reps"), {
      target: { value: "8" },
    });
    fireEvent.change(within(dialog).getByLabelText("Weight"), {
      target: { value: "135.5" },
    });
    fireEvent.change(within(dialog).getByLabelText("Time (minutes)"), {
      target: { value: "1.5" },
    });

    fireEvent.submit(document.getElementById("client-workout-entry-form") as HTMLFormElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        POST_URL,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
    });

    const requestBody = getLatestPostBody();
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
        reps: 8,
        weight: 135.5,
        duration_seconds: 90,
        position: 0,
      }],
    });
    expect(requestBody.exercise_entries[0].sets).toBeUndefined();
    expect(requestBody.exercise_entries[0].notes).toBeUndefined();

    await waitFor(() => {
      expect(
        screen.getByText(
          "The workout was saved through the protected BFF route and confirmed in refreshed log history.",
        ),
      ).toBeTruthy();
    });

    expect(scrollIntoViewMock).toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Log A Rep" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open Log A Rep form" }));
    expect((screen.getByLabelText("Exercise name") as HTMLInputElement).value).toBe("");
  });

  it("removes the Sets field from set mode and omits sets from the POST payload", async () => {
    mockHistoryAndPost({
      initialItems: mixedHistoryItems,
      refreshedItems: [
        createHistoryItem({
          id: "saved-log-1",
          mode: "set",
          exerciseName: "Deadlift",
          reps: 3,
          weight: 225,
          durationSeconds: 120,
        }),
      ],
    });

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open Log A Set form" })).toBeTruthy();
    });

    const dialog = openEntryModal("Open Log A Set form");
    expect(within(dialog).queryByLabelText("Sets")).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Add Rep" })).toBeTruthy();
    expect(within(dialog).getByLabelText("Exercise name")).toBeTruthy();
    expect(within(dialog).getByLabelText("Reps")).toBeTruthy();
    expect(within(dialog).getByLabelText("Weight")).toBeTruthy();
    expect(within(dialog).getByLabelText("Time (minutes)")).toBeTruthy();
    expect(within(dialog).getByLabelText("Performed at")).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText("Exercise name"), {
      target: { value: "Deadlift" },
    });
    fireEvent.change(within(dialog).getByLabelText("Reps"), {
      target: { value: "3" },
    });
    fireEvent.change(within(dialog).getByLabelText("Weight"), {
      target: { value: "225" },
    });
    fireEvent.change(within(dialog).getByLabelText("Time (minutes)"), {
      target: { value: "2" },
    });

    fireEvent.submit(document.getElementById("client-workout-entry-form") as HTMLFormElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        POST_URL,
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    const requestBody = getLatestPostBody();
    expect(requestBody.mode).toBe("set");
    expect(requestBody.exercise_entries).toEqual([{
      exercise_name: "Deadlift",
      reps: 3,
      weight: 225,
      duration_seconds: 120,
      position: 0,
    }]);
    expect(requestBody.exercise_entries[0].sets).toBeUndefined();
  });

  it("preserves General Workout sets, Add Exercise behavior, and the protected POST route", async () => {
    mockHistoryAndPost({
      initialItems: mixedHistoryItems,
      refreshedItems: [
        createHistoryItem({
          id: "saved-log-1",
          mode: "general_workout",
          exerciseName: "Morning Circuit",
          sets: 2,
          reps: 12,
          weight: 40,
          durationSeconds: 1800,
        }),
      ],
    });

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open Log a General Workout form" })).toBeTruthy();
    });

    const dialog = openEntryModal("Open Log a General Workout form");
    expect(within(dialog).getByLabelText("Sets")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Add Exercise" })).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText("Exercise name"), {
      target: { value: "Morning Circuit" },
    });
    fireEvent.change(within(dialog).getByLabelText("Sets"), {
      target: { value: "2" },
    });
    fireEvent.change(within(dialog).getByLabelText("Reps"), {
      target: { value: "12" },
    });
    fireEvent.change(within(dialog).getByLabelText("Weight"), {
      target: { value: "40" },
    });
    fireEvent.change(within(dialog).getByLabelText("Time (minutes)"), {
      target: { value: "30" },
    });

    fireEvent.submit(document.getElementById("client-workout-entry-form") as HTMLFormElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        POST_URL,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
    });

    const requestBody = getLatestPostBody();
    expect(requestBody.mode).toBe("general_workout");
    expect(requestBody.exercise_entries).toEqual([{
      exercise_name: "Morning Circuit",
      sets: 2,
      reps: 12,
      weight: 40,
      duration_seconds: 1800,
      position: 0,
    }]);
  });

  it("preserves server error feedback without introducing a different mutation path", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === HISTORY_URL && method === "GET") {
        return jsonResponse(historyPayload(mixedHistoryItems));
      }

      if (url === POST_URL && method === "POST") {
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

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open Log A Rep form" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open Log A Rep form" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Log Entry" }));

    await waitFor(() => {
      expect(screen.getByText("Unable to submit workout log.")).toBeTruthy();
    });

    expect(screen.getByRole("dialog", { name: "Log A Rep" })).toBeTruthy();

    const workoutLogCalls = fetchMock.mock.calls.filter(
      ([url, init]) => String(url) === POST_URL && init?.method === "POST",
    );
    expect(workoutLogCalls).toHaveLength(1);
  });

  it("opens the Goals and Aspirations dialog with the required goal template fields", async () => {
    mockHistoryOnly(mixedHistoryItems);

    render(<AddLogPage />);

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
    mockHistoryOnly(mixedHistoryItems);

    render(<AddLogPage />);

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

  it("creates a local goal template and navigates to the template quad page", async () => {
    mockHistoryOnly(mixedHistoryItems);

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Goals and Aspirations/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Goals and Aspirations/i }));

    const dialog = screen.getByRole("dialog", { name: "Create Goal Template" });
    fireEvent.change(within(dialog).getByLabelText("Goal label"), {
      target: { value: "Running" },
    });
    fireEvent.change(within(dialog).getByLabelText("Goal target"), {
      target: { value: "1 Mile Run" },
    });
    fireEvent.change(within(dialog).getByLabelText("Goal note"), {
      target: { value: "Complete every Monday and Thursday" },
    });
    fireEvent.click(within(dialog).getByLabelText("Coral"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Create Goal" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Create Goal Template" })).toBeNull();
    });

    expect(screen.getByText("Running")).toBeTruthy();
    expect(screen.getByText("1 Mile Run")).toBeTruthy();
    expect(screen.getByText("Complete every Monday and Thursday")).toBeTruthy();
    const starterPageButton = screen.getByRole("button", { name: "Show starter quad" });
    const staplePageButton = screen.getByRole("button", { name: "Show staple goal templates" });
    const firstTemplatePageButton = screen.getByRole("button", { name: "Show goal template page 1" });
    expect(within(starterPageButton).getByText("1")).toBeTruthy();
    expect(within(staplePageButton).getByText("2")).toBeTruthy();
    expect(within(firstTemplatePageButton).getByText("3")).toBeTruthy();
    expect(firstTemplatePageButton.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Create Goal" })).toBeTruthy();

    const storedTemplates = JSON.parse(
      window.localStorage.getItem(GOAL_TEMPLATE_STORAGE_KEY) ?? "[]",
    ) as Array<{ label: string; value: string; theme: string; iconName: string }>;
    expect(storedTemplates[0]).toMatchObject({
      label: "Running",
      value: "1 Mile Run",
      theme: "coral",
      iconName: "pushup",
    });
  });

  it("creates a prefilled staple goal template and navigates to page 3", async () => {
    mockHistoryOnly(mixedHistoryItems);

    render(<AddLogPage />);

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

  it("pages goal templates in groups of four while preserving local-browser template behavior", async () => {
    mockHistoryOnly(mixedHistoryItems);

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Goals and Aspirations/i })).toBeTruthy();
    });

    const templates = [
      { label: "Goal 1", value: "10 Push Ups", note: "Monday", theme: "Emerald" },
      { label: "Goal 2", value: "20 Push Ups", note: "Tuesday", theme: "Lime" },
      { label: "Goal 3", value: "30 Push Ups", note: "Wednesday", theme: "Amber" },
      { label: "Goal 4", value: "40 Push Ups", note: "Thursday", theme: "Orange" },
      { label: "Goal 5", value: "50 Push Ups", note: "Friday", theme: "Rose" },
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
      fireEvent.click(within(dialog).getByLabelText(template.theme));
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
  });

  it("renders numbered quad page buttons and lets the user switch between starter and placeholder pages", async () => {
    mockHistoryOnly(mixedHistoryItems);

    render(<AddLogPage />);

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
});
