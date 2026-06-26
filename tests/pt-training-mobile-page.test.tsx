import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY,
  PT_TRAINING_FOLDER_DRAFTS_STORAGE_KEY,
  PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY,
} from "@/lib/client/pt-training-drafts";

const { fetchMock, useSessionBootstrapMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionBootstrapMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pt/training",
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

import PTTrainingPage from "@/app/pt/training/page";

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    json: async () => payload,
  });
}

function mockEmptyTrainingFetches() {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "/api/pt/folders" || url === "/api/pt/packages" || url === "/api/pt/routines") {
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
}

describe("PTTrainingPage mobile experience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    useSessionBootstrapMock.mockReset();
    window.localStorage.clear();
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

  it("renders the updated portfolio and builder sections, keeps old sections absent, and preserves the real folder accordion", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/folders") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "folder-1",
                name: "Strength",
                description: "Barbell-first programming",
                sort_order: 1,
              },
              {
                id: "folder-2",
                name: "Recovery",
                description: "Mobility and reset work",
                sort_order: 2,
              },
            ],
            count: 2,
          },
        });
      }

      if (url === "/api/pt/packages") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "package-1",
                folder_id: "folder-1",
                title: "Strength Camp",
                description: "Four-week progressive overload block",
                status: "active",
                duration_days: 28,
                is_template: false,
              },
              {
                id: "package-2",
                folder_id: "folder-2",
                title: "Recovery Reset",
                description: "Lower-load deload cycle",
                status: "draft",
                duration_days: 14,
                is_template: true,
              },
            ],
            count: 2,
          },
        });
      }

      if (url === "/api/pt/routines") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "routine-1",
                folder_id: "folder-1",
                title: "Deadlift Primer",
                description: "Posterior-chain prep",
                difficulty: "advanced",
                estimated_minutes: 55,
                is_archived: false,
              },
              {
                id: "routine-2",
                folder_id: "folder-2",
                title: "Recovery Flow",
                description: "Breathing and mobility sequence",
                difficulty: "easy",
                estimated_minutes: 20,
                is_archived: false,
              },
            ],
            count: 2,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Training Portfolio" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/pt/folders", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/packages", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/pt/routines", { cache: "no-store" });
    expect(screen.getByRole("heading", { name: "PT Training" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/pt/settings");
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 })[0]?.textContent).toBe("Training Portfolio");
    expect(screen.queryByRole("heading", { name: "Training overview" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Portfolio cards" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Routine cards" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Management status" })).toBeNull();

    const createFolderButton = screen.getByRole("button", { name: "Create New Folder" });
    expect(createFolderButton.parentElement?.className).toContain("pt-training-create-folder-card-wrap");
    expect(screen.getByRole("heading", { name: "Build Training Routine" })).toBeTruthy();
    expect(screen.queryByText("Add A Rep")).toBeNull();
    expect(screen.queryByText("Add A Set")).toBeNull();
    expect(screen.queryByText("Goals and Cues")).toBeNull();
    expect(screen.getByRole("button", { name: "Add an Exercise" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create a Routine" })).toBeTruthy();

    const strengthFolderButton = screen.getByRole("button", { name: "Strength" });
    const recoveryFolderButton = screen.getByRole("button", { name: "Recovery" });
    const fetchCallCount = fetchMock.mock.calls.length;

    expect(strengthFolderButton.getAttribute("aria-expanded")).toBe("false");
    expect(recoveryFolderButton.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(strengthFolderButton);

    await waitFor(() => {
      expect(strengthFolderButton.getAttribute("aria-expanded")).toBe("true");
    });

    expect(screen.getByText("Strength Camp")).toBeTruthy();
    expect(screen.getByText("Deadlift Primer")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);

    fireEvent.click(recoveryFolderButton);

    await waitFor(() => {
      expect(recoveryFolderButton.getAttribute("aria-expanded")).toBe("true");
    });

    expect(strengthFolderButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Strength Camp")).toBeNull();
    expect(screen.getByText("Recovery Reset")).toBeTruthy();
    expect(screen.getByText("Recovery Flow")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
  });

  it("keeps Create New Folder local-only and separate from the real folder accordion", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/folders") {
        return jsonResponse({
          ok: true,
          data: {
            items: [{ id: "folder-1", name: "Strength", description: "Power block", sort_order: 1 }],
            count: 1,
          },
        });
      }

      if (url === "/api/pt/packages" || url === "/api/pt/routines") {
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

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create New Folder" })).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Create New Folder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Create New Folder" })).toBeTruthy();
    });

    expect(
      screen.getByText(/Folder creation is not connected to the PT folders save route yet/i),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Folder name"), {
      target: { value: "Mobility Builder" },
    });
    fireEvent.change(screen.getByLabelText("Folder note"), {
      target: { value: "Local-only staging note" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save local draft" }));

    await waitFor(() => {
      expect(screen.getByText("Local folder drafts")).toBeTruthy();
    });

    expect(screen.getByText("Mobility Builder")).toBeTruthy();
    expect(screen.getByText("Local-only staging note")).toBeTruthy();
    expect(screen.getByText("Local draft")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mobility Builder" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_FOLDER_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Mobility Builder",
          note: "Local-only staging note",
        }),
      ]),
    );
  });

  it("validates and saves Add an Exercise drafts locally without new fetches", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/folders") {
        return jsonResponse({
          ok: true,
          data: {
            items: [{ id: "folder-1", name: "Strength", description: "Power block", sort_order: 1 }],
            count: 1,
          },
        });
      }

      if (url === "/api/pt/packages" || url === "/api/pt/routines") {
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

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add an Exercise" })).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Add an Exercise" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add an Exercise" })).toBeTruthy();
    });

    expect(screen.getByLabelText("Exercise description")).toBeTruthy();
    expect(screen.getByLabelText("Instructions")).toBeTruthy();
    expect(screen.getByLabelText("Main objective")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save local draft" }));

    await waitFor(() => {
      expect(screen.getByText("Exercise description is required.")).toBeTruthy();
      expect(screen.getByText("Instructions are required.")).toBeTruthy();
      expect(screen.getByText("Main objective is required.")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Exercise description"), {
      target: { value: "Bench press with shoulder blades anchored" },
    });
    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: { value: "Lower the bar to mid-chest, pause, then drive through the floor." },
    });
    fireEvent.change(screen.getByLabelText("Main objective"), {
      target: { value: "Upper-body pressing strength" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save local draft" }));

    await waitFor(() => {
      expect(screen.getByText("Local exercise drafts")).toBeTruthy();
    });

    expect(screen.getByText("Bench press with shoulder blades anchored")).toBeTruthy();
    expect(screen.getByText("Main objective: Upper-body pressing strength")).toBeTruthy();
    expect(
      screen.getByText("Lower the bar to mid-chest, pause, then drive through the floor."),
    ).toBeTruthy();
    expect(screen.getByText("Local draft")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Bench press with shoulder blades anchored" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "exercise",
          description: "Bench press with shoulder blades anchored",
          instructions: "Lower the bar to mid-chest, pause, then drive through the floor.",
          objective: "Upper-body pressing strength",
        }),
      ]),
    );
  });

  it("validates the two-page Create a Routine flow, keeps numeric inputs numeric-only, and saves locally", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/folders") {
        return jsonResponse({
          ok: true,
          data: {
            items: [{ id: "folder-1", name: "Strength", description: "Power block", sort_order: 1 }],
            count: 1,
          },
        });
      }

      if (url === "/api/pt/packages" || url === "/api/pt/routines") {
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

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create a Routine" })).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Create a Routine" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Create a Routine" })).toBeTruthy();
    });

    expect(screen.getByText("Routine Details")).toBeTruthy();
    expect(screen.getByLabelText("Routine name")).toBeTruthy();
    expect(screen.getByLabelText("Description")).toBeTruthy();
    expect(screen.getByLabelText("Fitness Target")).toBeTruthy();
    expect(screen.getByText("Timed by duration")).toBeTruthy();

    const setAmountInput = screen.getByLabelText("Set Amount") as HTMLInputElement;
    expect(setAmountInput.getAttribute("type")).toBe("number");

    fireEvent.click(screen.getByRole("button", { name: "Next: Exercises" }));

    await waitFor(() => {
      expect(screen.getByText("Routine name is required.")).toBeTruthy();
      expect(screen.getByText("Description is required.")).toBeTruthy();
      expect(screen.getByText("Fitness Target is required.")).toBeTruthy();
      expect(screen.getByText("Set Amount is required.")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Routine name"), {
      target: { value: "Full Body Builder" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A reusable total-body session for strength and control." },
    });
    fireEvent.change(screen.getByLabelText("Fitness Target"), {
      target: { value: "Chest, back, legs, and overall work capacity" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    fireEvent.change(setAmountInput, {
      target: { value: "12" },
    });
    expect(setAmountInput.value).toBe("12");

    fireEvent.click(screen.getByRole("button", { name: "Next: Exercises" }));

    await waitFor(() => {
      expect(screen.getByText("Routine Exercises")).toBeTruthy();
    });

    expect(screen.getByLabelText("Exercise")).toBeTruthy();
    const repGoalInput = screen.getByLabelText("Rep Goal") as HTMLInputElement;
    expect(repGoalInput.getAttribute("type")).toBe("number");
    fireEvent.change(repGoalInput, {
      target: { value: "8" },
    });
    expect(repGoalInput.value).toBe("8");
    expect(screen.getByLabelText("Instructions")).toBeTruthy();

    const weightsFieldset = screen.getByText("Weights Involved?").closest("fieldset");
    expect(weightsFieldset).toBeTruthy();
    if (!weightsFieldset) {
      throw new Error("Expected weights fieldset");
    }
    expect(within(weightsFieldset).queryByRole("textbox")).toBeNull();
    expect(within(weightsFieldset).getByRole("radio", { name: "Yes" })).toBeTruthy();
    expect(within(weightsFieldset).getByRole("radio", { name: "No" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add exercise row" }));

    await waitFor(() => {
      expect(screen.getByText("Exercise 2")).toBeTruthy();
    });

    fireEvent.change(screen.getAllByLabelText("Exercise")[0] as HTMLInputElement, {
      target: { value: "Bench Press" },
    });
    fireEvent.change(screen.getAllByLabelText("Instructions")[0] as HTMLTextAreaElement, {
      target: { value: "Drive through the floor and keep the bar path stacked." },
    });
    fireEvent.click(within(weightsFieldset).getByRole("radio", { name: "Yes" }));

    fireEvent.change(screen.getAllByLabelText("Exercise")[1] as HTMLInputElement, {
      target: { value: "Leg Extension" },
    });
    fireEvent.change(screen.getAllByLabelText("Rep Goal")[1] as HTMLInputElement, {
      target: { value: "15" },
    });
    fireEvent.change(screen.getAllByLabelText("Instructions")[1] as HTMLTextAreaElement, {
      target: { value: "Pause at the top and control the lowering phase." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save local routine draft" }));

    await waitFor(() => {
      expect(screen.getByText("Local routine drafts")).toBeTruthy();
    });

    expect(screen.getByText("Full Body Builder")).toBeTruthy();
    expect(screen.getByText("Fitness target: Chest, back, legs, and overall work capacity")).toBeTruthy();
    expect(screen.getByText(/Set amount: 12 \| Exercise count: 2/)).toBeTruthy();
    expect(screen.getByText("Local draft")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Full Body Builder" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "routine",
          routineName: "Full Body Builder",
          fitnessTarget: "Chest, back, legs, and overall work capacity",
          timedByDuration: true,
          setAmount: 12,
          exercises: expect.arrayContaining([
            expect.objectContaining({
              exerciseName: "Bench Press",
              repGoal: 8,
              instructions: "Drive through the floor and keep the bar path stacked.",
              weightsInvolved: true,
            }),
            expect.objectContaining({
              exerciseName: "Leg Extension",
              repGoal: 15,
              instructions: "Pause at the top and control the lowering phase.",
              weightsInvolved: false,
            }),
          ]),
        }),
      ]),
    );
  });

  it("filters real folders locally without issuing new requests", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/folders") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              { id: "folder-1", name: "Strength", description: "Power block", sort_order: 1 },
              { id: "folder-2", name: "Recovery", description: "Mobility block", sort_order: 2 },
            ],
            count: 2,
          },
        });
      }

      if (url === "/api/pt/packages") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "package-1",
                folder_id: "folder-1",
                title: "Strength Camp",
                description: "Barbell cycle",
                status: "active",
                duration_days: 28,
                is_template: false,
              },
              {
                id: "package-2",
                folder_id: "folder-2",
                title: "Recovery Reset",
                description: "Deload cycle",
                status: "draft",
                duration_days: 14,
                is_template: true,
              },
            ],
            count: 2,
          },
        });
      }

      if (url === "/api/pt/routines") {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: "routine-1",
                folder_id: "folder-1",
                title: "Deadlift Primer",
                description: "Heavy pulling prep",
                difficulty: "advanced",
                estimated_minutes: 55,
                is_archived: false,
              },
              {
                id: "routine-2",
                folder_id: "folder-2",
                title: "Recovery Flow",
                description: "Mobility sequence",
                difficulty: "easy",
                estimated_minutes: 20,
                is_archived: false,
              },
            ],
            count: 2,
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Strength" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Recovery" })).toBeTruthy();
    });

    const searchbox = screen.getByRole("searchbox", { name: "Search PT training" });
    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.change(searchbox, {
      target: { value: "Recovery" },
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Strength" })).toBeNull();
      expect(screen.getByRole("button", { name: "Recovery" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
  });

  it("renders safe empty and unavailable states for the real folder surface", async () => {
    mockEmptyTrainingFetches();

    const { unmount } = render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "No training folders yet." })).toBeTruthy();
    });

    unmount();
    fetchMock.mockReset();

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/pt/folders") {
        return jsonResponse({
          ok: false,
          error: {
            code: "internal_error",
            message: "Unavailable: /api/pt/folders",
          },
        });
      }

      if (url === "/api/pt/packages" || url === "/api/pt/routines") {
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

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getAllByText("Training Portfolio unavailable").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("Unavailable: /api/pt/folders")).toBeTruthy();
  });

  it("does not bypass PT session bootstrap before fetching PT training data", () => {
    useSessionBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(React.createElement(PTTrainingPage));

    expect(screen.getByText("Loading PT training")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
