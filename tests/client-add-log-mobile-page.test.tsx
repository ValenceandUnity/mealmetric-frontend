import React, { type ReactNode } from "react";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
          : "Log a Workout Routine",
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the route and replaces the GO control with the workout timer picker", async () => {
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
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open client header settings" }));
    expect(screen.getByRole("link", { name: "Open settings" }).getAttribute("href")).toBe(
      "/client/settings",
    );
    expect(screen.getByText("Capture a workout quickly")).toBeTruthy();
    expect(screen.getByText("Log A Rep")).toBeTruthy();
    expect(screen.getByText("Log A Set")).toBeTruthy();
    expect(screen.queryByText("Log a General Workout")).toBeNull();
    expect(screen.getByText("Log a Workout Routine")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Log a Workout Routine form" })).toBeTruthy();
    expect(screen.getByText("Goals and Aspirations")).toBeTruthy();

    expect(screen.queryByText(/^GO$/)).toBeNull();
    const timerButton = screen.getByRole("button", { name: "Open workout timer" });
    fireEvent.click(timerButton);
    const timerDialog = screen.getByRole("dialog", { name: "SET TIMER" });
    const searchInput = within(timerDialog).getByRole("searchbox");
    const searchButton = within(timerDialog).getByRole("button", {
      name: "Search timer exercises",
    });
    const filterButton = within(timerDialog).getByRole("button", {
      name: "Open timer exercise filters",
    });
    expect(searchInput).toBeTruthy();
    expect(searchButton).toBeTruthy();
    expect(searchButton.className).toContain("client-add-log-timer-picker__search-button");
    expect(filterButton.className).toContain("client-add-log-timer-picker__filter-button");
    expect(searchButton.parentElement?.className).toContain(
      "client-add-log-timer-picker__search-actions",
    );
    expect(within(timerDialog).queryByRole("button", { name: "Clear timer search" })).toBeNull();
    expect(within(timerDialog).getByRole("button", { name: "Close" })).toBeTruthy();
    expect(
      within(timerDialog).getByRole("button", { name: /Open timer session for Morning Circuit/ }),
    ).toBeTruthy();
    fireEvent.click(within(timerDialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "SET TIMER" })).toBeNull();

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

  it("prioritizes timed exercise rows, caps the picker at five rows, and filters locally", async () => {
    const user = userEvent.setup();
    mockHistoryOnly([
      createHistoryItem({
        id: "log-1",
        mode: "rep",
        exerciseName: "Push Up",
        durationSeconds: null,
        performedAt: "2026-06-10T10:00:00Z",
      }),
      createHistoryItem({
        id: "log-2",
        mode: "rep",
        exerciseName: "Bench Press",
        durationSeconds: 120,
        performedAt: "2026-06-09T10:00:00Z",
      }),
      createHistoryItem({
        id: "log-3",
        mode: "set",
        exerciseName: "Bench Press",
        durationSeconds: 60,
        performedAt: "2026-06-08T10:00:00Z",
      }),
      createHistoryItem({
        id: "log-4",
        mode: "set",
        exerciseName: "Deadlift",
        durationSeconds: 45,
        performedAt: "2026-06-07T10:00:00Z",
      }),
      createHistoryItem({
        id: "log-5",
        mode: "general_workout",
        exerciseName: "Row",
        durationSeconds: null,
        performedAt: "2026-06-06T10:00:00Z",
      }),
      createHistoryItem({
        id: "log-6",
        mode: "rep",
        exerciseName: "Sprint",
        durationSeconds: 30,
        performedAt: "2026-06-05T10:00:00Z",
      }),
    ]);

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open workout timer" })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Open workout timer" }));
    const timerDialog = screen.getByRole("dialog", { name: "SET TIMER" });
    const exerciseButtons = within(timerDialog).getAllByRole("button", {
      name: /Open timer session for/,
    });
    const exerciseButtonNames = exerciseButtons.map((button) => button.getAttribute("aria-label"));

    expect(exerciseButtons).toHaveLength(5);
    expect(exerciseButtonNames.filter((name) => name?.includes("Bench Press"))).toHaveLength(1);
    expect(exerciseButtonNames.slice(0, 3)).toEqual([
      expect.stringContaining("Bench Press"),
      expect.stringContaining("Deadlift"),
      expect.stringContaining("Sprint"),
    ]);
    expect(
      within(exerciseButtons[0]).getByText("Rep").className,
    ).toContain("client-add-log-timer-picker__type-tag");
    expect(
      within(exerciseButtons[1]).getByText("Set").className,
    ).toContain("client-add-log-timer-picker__type-tag");
    expect(within(timerDialog).queryByLabelText(/timer summary/i)).toBeNull();
    expect(within(exerciseButtons[0]).queryByText(/^Sets /)).toBeNull();
    expect(within(exerciseButtons[0]).queryByText(/^Reps /)).toBeNull();
    expect(within(exerciseButtons[0]).queryByText(/^Weight /)).toBeNull();
    expect(within(exerciseButtons[0]).queryByText(/^Time /)).toBeNull();

    const initialHistoryFetches = fetchMock.mock.calls.filter(
      ([url, init]) => String(url) === HISTORY_URL && (init?.method ?? "GET") === "GET",
    );
    await user.click(
      within(timerDialog).getByRole("button", { name: "Open timer exercise filters" }),
    );
    const filterPopover = within(timerDialog).getByRole("dialog", { name: "Filter exercises" });
    const filterCloseButton = within(filterPopover).getByRole("button", {
      name: "Close timer exercise filters",
    });
    expect(within(filterPopover).getByLabelText("All")).toBeTruthy();
    expect(within(filterPopover).getByLabelText("Rep")).toBeTruthy();
    expect(within(filterPopover).getByLabelText("Set")).toBeTruthy();
    expect(within(filterPopover).getByLabelText("Routine")).toBeTruthy();

    await user.click(within(filterPopover).getByLabelText("Set"));
    const setButtons = within(screen.getByRole("dialog", { name: "SET TIMER" })).getAllByRole(
      "button",
      { name: /Open timer session for/ },
    );
    expect(setButtons).toHaveLength(2);
    expect(setButtons[0].getAttribute("aria-label")).toContain("Bench Press");
    expect(setButtons[1].getAttribute("aria-label")).toContain("Deadlift");
    expect(
      within(setButtons[0]).getByText("Set").className,
    ).toContain("client-add-log-timer-picker__type-tag--set");

    await user.click(filterCloseButton);
    expect(within(timerDialog).queryByRole("dialog", { name: "Filter exercises" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "SET TIMER" })).toBeTruthy();
    expect(
      within(screen.getByRole("dialog", { name: "SET TIMER" })).getAllByRole("button", {
        name: /Open timer session for/,
      }),
    ).toHaveLength(2);

    await user.click(
      within(screen.getByRole("dialog", { name: "SET TIMER" })).getByRole("button", {
        name: "Open timer exercise filters",
      }),
    );
    await user.click(within(screen.getByRole("dialog", { name: "SET TIMER" })).getByLabelText("Routine"));
    const routineButtons = within(screen.getByRole("dialog", { name: "SET TIMER" })).getAllByRole(
      "button",
      { name: /Open timer session for/ },
    );
    expect(routineButtons).toHaveLength(1);
    expect(routineButtons[0].getAttribute("aria-label")).toContain("Row");
    expect(
      within(routineButtons[0]).getByText("Routine").className,
    ).toContain("client-add-log-timer-picker__type-tag--routine");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(within(timerDialog).queryByRole("dialog", { name: "Filter exercises" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "SET TIMER" })).toBeTruthy();

    await user.click(
      within(screen.getByRole("dialog", { name: "SET TIMER" })).getByRole("button", {
        name: "Open timer exercise filters",
      }),
    );
    await user.click(
      within(screen.getByRole("dialog", { name: "SET TIMER" })).getByLabelText("All"),
    );
    await user.type(within(timerDialog).getByRole("searchbox"), "Row");
    expect(
      within(timerDialog).getByRole("button", { name: "Clear timer search" }),
    ).toBeTruthy();

    expect(
      within(screen.getByRole("dialog", { name: "SET TIMER" })).getAllByRole("button", {
        name: /Open timer session for/,
      }),
    ).toHaveLength(5);
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) => String(url) === HISTORY_URL && (init?.method ?? "GET") === "GET",
      ),
    ).toHaveLength(initialHistoryFetches.length);

    await user.click(within(timerDialog).getByRole("button", { name: "Search timer exercises" }));

    const filteredButtons = within(screen.getByRole("dialog", { name: "SET TIMER" })).getAllByRole(
      "button",
      { name: /Open timer session for/ },
    );
    expect(filteredButtons).toHaveLength(1);
    expect(filteredButtons[0].getAttribute("aria-label")).toContain("Row");

    await user.click(
      within(
        within(screen.getByRole("dialog", { name: "SET TIMER" })).getByRole("dialog", {
          name: "Filter exercises",
        }),
      ).getByLabelText("Set"),
    );
    await user.click(within(timerDialog).getByRole("button", { name: "Clear timer search" }));
    expect((within(timerDialog).getByRole("searchbox") as HTMLInputElement).value).toBe("");
    const resetButtons = within(screen.getByRole("dialog", { name: "SET TIMER" })).getAllByRole(
      "button",
      { name: /Open timer session for/ },
    );
    expect(resetButtons).toHaveLength(2);
    expect(resetButtons[0].getAttribute("aria-label")).toContain("Bench Press");
    expect(resetButtons[1].getAttribute("aria-label")).toContain("Deadlift");
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) => String(url) === HISTORY_URL && (init?.method ?? "GET") === "GET",
      ),
    ).toHaveLength(initialHistoryFetches.length);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "SET TIMER" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "SET TIMER" })).toBeNull();
  });

  it("opens the timer session, advances the stopwatch, posts CLOCK IT through the existing BFF route, and refreshes history", async () => {
    const user = userEvent.setup();
    mockHistoryAndPost({
      initialItems: mixedHistoryItems,
      refreshedItems: [
        createHistoryItem({
          id: "saved-log-1",
          mode: "rep",
          exerciseName: "Bench Press",
          weight: 135.5,
          durationSeconds: 3,
        }),
      ],
    });

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open workout timer" })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Open workout timer" }));
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Open timer session for Bench Press/ }));
    });

    const timerSession = screen.getByRole("dialog", { name: "SET TIMER" });
    expect(within(timerSession).getByText("00:00:00")).toBeTruthy();
    expect((within(timerSession).getByLabelText("Rep") as HTMLInputElement).value).toBe(
      "Bench Press",
    );
    expect((within(timerSession).getByLabelText("Weight") as HTMLInputElement).value).toBe(
      "135.5",
    );
    const startButton = within(timerSession).getByRole("button", { name: "START" });
    expect(startButton.className).toContain(
      "client-add-log-timer-session__primary-button--start",
    );

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(within(screen.getByRole("dialog", { name: "SET TIMER" })).getByText("00:00:00")).toBeTruthy();

    await act(async () => {
      fireEvent.click(startButton);
    });
    const clockButton = within(screen.getByRole("dialog", { name: "SET TIMER" })).getByRole(
      "button",
      { name: "CLOCK IT" },
    );
    expect(clockButton.className).toContain(
      "client-add-log-timer-session__primary-button--clock",
    );

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(
      within(screen.getByRole("dialog", { name: "SET TIMER" })).getByText("00:00:03"),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.click(clockButton);
    });
    vi.useRealTimers();

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
    expect(requestBody.mode).toBe("rep");
    expect(requestBody.completion_status).toBe("completed");
    expect(requestBody.exercise_entries).toEqual([{
      exercise_name: "Bench Press",
      weight: 135.5,
      duration_seconds: 3,
      position: 0,
    }]);
    expect(requestBody.assignment_id).toBeUndefined();
    expect(requestBody.routine_id).toBeUndefined();
    expect(typeof requestBody.performed_at).toBe("string");

    await waitFor(() => {
      expect(screen.getByText("Timed workout saved.")).toBeTruthy();
    });

    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) => String(url) === HISTORY_URL && (init?.method ?? "GET") === "GET",
      ),
    ).toHaveLength(2);
    expect(screen.queryByRole("dialog", { name: "SET TIMER" })).toBeNull();
  });

  it("closes the active timer session without posting when cancelled or dismissed with Escape", async () => {
    const user = userEvent.setup();
    mockHistoryOnly(mixedHistoryItems);

    render(<AddLogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open workout timer" })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Open workout timer" }));
    await user.click(screen.getByRole("button", { name: /Open timer session for Bench Press/ }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "SET TIMER" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Open workout timer" }));
    await user.click(screen.getByRole("button", { name: /Open timer session for Bench Press/ }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "SET TIMER" })).toBeNull();

    const workoutLogCalls = fetchMock.mock.calls.filter(
      ([url, init]) => String(url) === POST_URL && init?.method === "POST",
    );
    expect(workoutLogCalls).toHaveLength(0);
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

    fireEvent.click(screen.getByRole("button", { name: "Open Log a Workout Routine form" }));
    expect(screen.getByRole("dialog", { name: "Log a Workout Routine" })).toBeTruthy();
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
    const historyPanel = document.getElementById("client-add-log-entry-history-panel");
    expect(screen.getByRole("dialog", { name: "Log A Rep" })).toBe(dialog);
    expect(document.getElementById("client-add-log-entry-log-panel")?.getAttribute("aria-hidden")).toBe("true");
    expect(historyPanel?.getAttribute("aria-hidden")).toBe("false");
    expect(within(historyPanel as HTMLElement).getByRole("heading", { name: "Recent History" })).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Save Log Entry" })).toBeNull();

    fireEvent.click(logTab);
    expect(screen.getByRole("dialog", { name: "Log A Rep" })).toBe(dialog);
    expect(document.getElementById("client-add-log-entry-log-panel")?.getAttribute("aria-hidden")).toBe("false");
    expect(document.getElementById("client-add-log-entry-history-panel")?.getAttribute("aria-hidden")).toBe("true");
    expect(within(dialog).getByLabelText("Rep")).toBeTruthy();
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

    const generalDialog = openEntryModal("Open Log a Workout Routine form");
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

  it("uses the top Rep selector with history autosuggest and omits hidden rep/set fields from the POST payload", async () => {
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
    const repInput = within(dialog).getByLabelText("Rep") as HTMLInputElement;
    expect(repInput.value).toBe("Bench Day");
    expect(repInput.getAttribute("list")).toBe("client-add-log-exercise-suggestions");
    expect(document.querySelector("#client-add-log-exercise-suggestions option[value='Bench Press']")).toBeTruthy();
    expect(within(dialog).queryByLabelText("Exercise name")).toBeNull();
    expect(within(dialog).queryByLabelText("Sets")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Add Exercise" })).toBeNull();
    expect(within(dialog).queryByLabelText("Reps")).toBeNull();
    expect(within(dialog).getByLabelText("Weight")).toBeTruthy();
    expect(within(dialog).getByLabelText("Time (minutes)")).toBeTruthy();
    expect(within(dialog).getByLabelText("Performed at")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Save Log Entry" })).toBeTruthy();

    fireEvent.change(repInput, {
      target: { value: "Bench Press" },
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
        weight: 135.5,
        duration_seconds: 90,
        position: 0,
      }],
    });
    expect(requestBody.exercise_entries[0].sets).toBeUndefined();
    expect(requestBody.exercise_entries[0].reps).toBeUndefined();
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
    expect((screen.getByLabelText("Rep") as HTMLInputElement).value).toBe("Bench Day");
  });

  it("uses the top Set selector with history autosuggest and omits hidden sets from the POST payload", async () => {
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
    const setInput = within(dialog).getByLabelText("Set") as HTMLInputElement;
    expect(setInput.getAttribute("list")).toBe("client-add-log-exercise-suggestions");
    expect(document.querySelector("#client-add-log-exercise-suggestions option[value='Bench Press']")).toBeTruthy();
    expect(within(dialog).queryByLabelText("Exercise name")).toBeNull();
    expect(within(dialog).queryByLabelText("Sets")).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Add Rep" })).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Add Exercise" })).toBeNull();
    expect(within(dialog).getByLabelText("Reps")).toBeTruthy();
    expect(within(dialog).getByLabelText("Weight")).toBeTruthy();
    expect(within(dialog).getByLabelText("Time (minutes)")).toBeTruthy();
    expect(within(dialog).getByLabelText("Performed at")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Save Log Entry" })).toBeTruthy();

    fireEvent.change(setInput, {
      target: { value: "Bench Press" },
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
      exercise_name: "Bench Press",
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
      expect(screen.getByRole("button", { name: "Open Log a Workout Routine form" })).toBeTruthy();
    });

    const dialog = openEntryModal("Open Log a Workout Routine form");
    expect(within(dialog).getByLabelText("Exercise name")).toBeTruthy();
    expect(within(dialog).getByLabelText("Sets")).toBeTruthy();
    expect(within(dialog).getByLabelText("Reps")).toBeTruthy();
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
    fireEvent.change(screen.getByLabelText("Rep"), {
      target: { value: "Bench Press" },
    });
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
