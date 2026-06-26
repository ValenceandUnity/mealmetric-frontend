import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PT_TRAINING_CUSTOM_FITNESS_ATTRIBUTES_STORAGE_KEY,
  PT_TRAINING_CUSTOM_FITNESS_TARGETS_STORAGE_KEY,
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

function mockTrainingFetches() {
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

  it("renders the portfolio and builder sections, keeps old sections absent, and preserves the real folder accordion", async () => {
    mockTrainingFetches();

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
    expect(screen.getByRole("button", { name: "Add an Exercise" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create a Routine" })).toBeTruthy();
    expect(screen.queryByText("Add A Rep")).toBeNull();
    expect(screen.queryByText("Add A Set")).toBeNull();
    expect(screen.queryByText("Goals and Cues")).toBeNull();

    const createFolderButton = screen.getByRole("button", { name: "Create New Folder" });
    expect(createFolderButton.parentElement?.className).toContain("pt-training-create-folder-card-wrap");

    const strengthFolderButton = screen.getByRole("button", { name: "Strength" });
    const recoveryFolderButton = screen.getByRole("button", { name: "Recovery" });
    const fetchCallCount = fetchMock.mock.calls.length;

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
    mockTrainingFetches();

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create New Folder" })).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Create New Folder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Create New Folder" })).toBeTruthy();
    });

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

  it("keeps Add an Exercise local-only and exposes saved exercises to routine autosuggest", async () => {
    mockTrainingFetches();

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add an Exercise" })).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Add an Exercise" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add an Exercise" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save local draft" }));

    await waitFor(() => {
      expect(screen.getByText("Exercise description is required.")).toBeTruthy();
      expect(screen.getByText("Instructions are required.")).toBeTruthy();
      expect(screen.getByText("Main objective is required.")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Exercise description"), {
      target: { value: "Bench Press" },
    });
    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: { value: "Lower with control and drive upward." },
    });
    fireEvent.change(screen.getByLabelText("Main objective"), {
      target: { value: "Upper-body pressing strength" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save local draft" }));

    await waitFor(() => {
      expect(screen.getByText("Local exercise drafts")).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "exercise",
          description: "Bench Press",
          instructions: "Lower with control and drive upward.",
          objective: "Upper-body pressing strength",
        }),
      ]),
    );

    fireEvent.click(screen.getByRole("button", { name: "Create a Routine" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Create a Routine" })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Routine name"), {
      target: { value: "Press Builder" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A pressing-focused routine draft." },
    });
    fireEvent.click(screen.getByLabelText("Biceps"));
    fireEvent.click(screen.getByLabelText("Strength"));
    fireEvent.change(screen.getByLabelText("How many Sets?"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next: Add Exercises" }));

    await waitFor(() => {
      expect(screen.getByText("Routine Exercises")).toBeTruthy();
    });

    const exerciseInput = screen.getByLabelText("Exercise") as HTMLInputElement;
    expect(exerciseInput.getAttribute("list")).toBe("pt-training-routine-exercise-suggestions");
    const datalist = document.getElementById("pt-training-routine-exercise-suggestions");
    expect((datalist as HTMLElement).querySelector('option[value="Bench Press"]')).toBeTruthy();
  });

  it("validates Page 1 targets and attributes, keeps the routine draft queue collapsed by default, and saves the routine draft locally", async () => {
    mockTrainingFetches();

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
    expect(screen.getByText("Fitness Target")).toBeTruthy();
    expect(screen.getByText("Fitness Attributes")).toBeTruthy();
    expect(screen.getByText("Timed by duration")).toBeTruthy();
    expect(screen.getByLabelText("How many Sets?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next: Add Exercises" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review Exercises" })).toBeNull();
    expect(screen.queryByLabelText("Set Amount")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Fitness Target" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Fitness Attributes" })).toBeNull();
    expect(screen.getByText("Which body targets does this routine contribute to?")).toBeTruthy();
    expect(screen.getByText("Which physical attributes does this routine contribute to?")).toBeTruthy();
    expect(screen.getByLabelText("Biceps")).toBeTruthy();
    expect(screen.getByLabelText("Back")).toBeTruthy();
    expect(screen.getByLabelText("Neck")).toBeTruthy();
    expect(screen.getByLabelText("Triceps")).toBeTruthy();
    expect(screen.getByLabelText("Achilles")).toBeTruthy();
    expect(screen.getByLabelText("Knees")).toBeTruthy();
    expect(screen.getByLabelText("Forearm")).toBeTruthy();
    expect(screen.getByLabelText("Lats")).toBeTruthy();
    expect(screen.getByLabelText("Quads")).toBeTruthy();
    expect(screen.getByLabelText("Hands")).toBeTruthy();
    expect(screen.getByLabelText("Hand Eye Coordination")).toBeTruthy();
    expect(screen.getByLabelText("Strength")).toBeTruthy();
    expect(screen.getByLabelText("Endurance")).toBeTruthy();
    expect(screen.getByLabelText("Vertical")).toBeTruthy();
    expect(screen.getByLabelText("Speed")).toBeTruthy();
    expect(screen.getByLabelText("Agility")).toBeTruthy();
    expect(screen.getByLabelText("Heart Rate")).toBeTruthy();
    expect(screen.getByLabelText("Elusiveness")).toBeTruthy();
    expect((screen.getByLabelText("How many Sets?") as HTMLInputElement).getAttribute("type")).toBe("number");

    fireEvent.click(screen.getByRole("button", { name: "Next: Add Exercises" }));

    await waitFor(() => {
      expect(screen.getByText("Routine name is required.")).toBeTruthy();
      expect(screen.getByText("Description is required.")).toBeTruthy();
      expect(screen.getByText("Select at least one Fitness Target.")).toBeTruthy();
      expect(screen.getByText("Select at least one Fitness Attribute.")).toBeTruthy();
      expect(screen.getByText("How many Sets? is required.")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Target" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add Fitness Target" })).toBeTruthy();
    });

    const addTargetDialog = screen.getByRole("dialog", { name: "Add Fitness Target" });
    fireEvent.change(screen.getByLabelText("Body target"), {
      target: { value: "Glutes" },
    });
    fireEvent.click(within(addTargetDialog).getByRole("button", { name: "Add Target" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Glutes")).toBeTruthy();
    });

    expect((screen.getByLabelText("Glutes") as HTMLInputElement).checked).toBe(true);
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_CUSTOM_FITNESS_TARGETS_STORAGE_KEY) ?? "[]"),
    ).toEqual(expect.arrayContaining(["Glutes"]));

    fireEvent.click(screen.getByRole("button", { name: "Add Attribute" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add Fitness Attribute" })).toBeTruthy();
    });

    const addAttributeDialog = screen.getByRole("dialog", { name: "Add Fitness Attribute" });
    fireEvent.change(screen.getByLabelText("Physical attribute"), {
      target: { value: "Balance" },
    });
    fireEvent.click(within(addAttributeDialog).getByRole("button", { name: "Add Attribute" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Balance")).toBeTruthy();
    });

    expect((screen.getByLabelText("Balance") as HTMLInputElement).checked).toBe(true);
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_CUSTOM_FITNESS_ATTRIBUTES_STORAGE_KEY) ?? "[]"),
    ).toEqual(expect.arrayContaining(["Balance"]));

    fireEvent.change(screen.getByLabelText("Routine name"), {
      target: { value: "Full Body Builder" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A reusable total-body session for strength and control." },
    });
    fireEvent.click(within(screen.getByText("Timed by duration").closest("fieldset") as HTMLElement).getByRole("radio", { name: "Yes" }));
    fireEvent.change(screen.getByLabelText("How many Sets?"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next: Add Exercises" }));

    await waitFor(() => {
      expect(screen.getByText("Routine Exercises")).toBeTruthy();
    });

    const pageTwoActions = screen.getByRole("button", { name: "Back" }).closest("div");
    expect(pageTwoActions?.className).toContain("pt-training-modal__actions--centered");
    expect(
      within(pageTwoActions as HTMLElement)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Back", "Cancel", "Save Routine Draft"]);

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Bench Press" },
    });
    fireEvent.change(screen.getByLabelText("Rep Goal"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: { value: "Drive through the floor and keep the bar path stacked." },
    });
    fireEvent.click(within(screen.getByText("Weights Involved?").closest("fieldset") as HTMLElement).getByRole("radio", { name: "Yes" }));

    fireEvent.click(screen.getByRole("button", { name: "Save Routine Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Routine Draft Queue (1)")).toBeTruthy();
    });

    expect(screen.queryByText("Full Body Builder")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show routine draft queue" }));

    await waitFor(() => {
      expect(screen.getByText("Full Body Builder")).toBeTruthy();
    });

    expect(screen.getByText("Fitness targets: Glutes")).toBeTruthy();
    expect(screen.getByText("Fitness attributes: Balance")).toBeTruthy();
    expect(screen.getByText(/Set amount: 12 \| Exercise count: 1/)).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.getByText(/Edited on /)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);

    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "routine",
          routineName: "Full Body Builder",
          fitnessTargets: ["Glutes"],
          fitnessAttributes: ["Balance"],
          timedByDuration: true,
          setAmount: 12,
          publishStatus: "draft",
          editedAt: expect.any(String),
          exercises: expect.arrayContaining([
            expect.objectContaining({
              exerciseName: "Bench Press",
              repGoal: 8,
              instructions: "Drive through the floor and keep the bar path stacked.",
              weightsInvolved: true,
            }),
          ]),
        }),
      ]),
    );
  });

  it("supports Page 2 autosuggest, centers Add Another Exercise, and shows navigation arrows only after multiple exercises exist", async () => {
    mockTrainingFetches();
    window.localStorage.setItem(
      PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "draft-exercise-1",
          type: "exercise",
          description: "Push Up",
          instructions: "Keep a tight plank.",
          objective: "Upper-body endurance",
          createdAt: new Date().toISOString(),
        },
      ]),
    );

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create a Routine" })).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Create a Routine" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Create a Routine" })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Routine name"), {
      target: { value: "Conditioning Builder" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A routine with multiple exercise windows." },
    });
    fireEvent.click(screen.getByLabelText("Back"));
    fireEvent.click(screen.getByLabelText("Endurance"));
    fireEvent.change(screen.getByLabelText("How many Sets?"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next: Add Exercises" }));

    await waitFor(() => {
      expect(screen.getByText("Routine Exercises")).toBeTruthy();
    });

    const exerciseInput = screen.getByLabelText("Exercise") as HTMLInputElement;
    expect(exerciseInput.getAttribute("list")).toBe("pt-training-routine-exercise-suggestions");
    const repGoalInput = screen.getByLabelText("Rep Goal") as HTMLInputElement;
    expect(repGoalInput.getAttribute("type")).toBe("number");
    expect(screen.queryByRole("button", { name: "Previous exercise" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next exercise" })).toBeNull();

    const addAnotherButton = screen.getByRole("button", { name: "Add Another Exercise" });
    expect(addAnotherButton.parentElement?.className).toContain("pt-training-routine-form__add-exercise-wrap");
    const datalist = document.getElementById("pt-training-routine-exercise-suggestions");
    expect((datalist as HTMLElement).querySelector('option[value="Push Up"]')).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Push Up" },
    });
    fireEvent.change(screen.getByLabelText("Rep Goal"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: { value: "Stay rigid through the midline." },
    });

    fireEvent.click(addAnotherButton);

    await waitFor(() => {
      expect(screen.getByText("Exercise 2")).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: "Previous exercise" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next exercise" })).toBeTruthy();
    expect(screen.getByText("Exercise 2 of 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next exercise" }).hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Leg Extension" },
    });
    fireEvent.change(screen.getByLabelText("Rep Goal"), {
      target: { value: "15" },
    });
    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: { value: "Pause at the top and control the lowering phase." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Previous exercise" }));

    await waitFor(() => {
      expect(screen.getByText("Exercise 1 of 2")).toBeTruthy();
    });

    expect((screen.getByLabelText("Exercise") as HTMLInputElement).value).toBe("Push Up");
    expect(screen.getByRole("button", { name: "Previous exercise" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next exercise" }));

    await waitFor(() => {
      expect(screen.getByText("Exercise 2 of 2")).toBeTruthy();
    });

    expect((screen.getByLabelText("Exercise") as HTMLInputElement).value).toBe("Leg Extension");
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
  });

  it("supports edit-mode save draft, review exercises, multi-folder publish staging, and remove confirmation without extra fetches", async () => {
    mockTrainingFetches();
    window.localStorage.setItem(
      PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "routine-draft-1",
          type: "routine",
          routineName: "Original Builder",
          description: "Original draft description",
          fitnessTargets: ["Back"],
          fitnessAttributes: ["Endurance"],
          timedByDuration: false,
          setAmount: 5,
          exercises: [
            {
              id: "exercise-row-1",
              exerciseName: "Push Up",
              repGoal: 12,
              instructions: "Stay braced.",
              weightsInvolved: false,
            },
          ],
          createdAt: "2026-06-01T12:00:00.000Z",
        },
      ]),
    );

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByText("Routine Draft Queue (1)")).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Show routine draft queue" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit routine draft Original Builder" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit routine draft Original Builder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Create a Routine" })).toBeTruthy();
    });

    expect((screen.getByLabelText("Routine name") as HTMLInputElement).value).toBe("Original Builder");
    expect(screen.queryByRole("button", { name: "Next: Add Exercises" })).toBeNull();
    expect(screen.getByRole("button", { name: "Review Exercises" })).toBeTruthy();
    const editModeActions = screen.getByRole("button", { name: "Save Draft" }).closest("div");
    expect(editModeActions?.className).toContain("pt-training-modal__actions--centered");
    expect(
      within(editModeActions as HTMLElement)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Save Draft", "Cancel", "Review Exercises"]);

    fireEvent.change(screen.getByLabelText("Routine name"), {
      target: { value: "Updated Builder" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    expect(screen.getByRole("dialog", { name: "Create a Routine" })).toBeTruthy();
    expect(screen.queryByText("Routine Exercises")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          routineName: "Updated Builder",
          editedAt: expect.any(String),
        }),
      ]),
    );
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Review Exercises" }));

    await waitFor(() => {
      expect(screen.getByText("Routine Exercises")).toBeTruthy();
    });

    const pageTwoActions = screen.getByRole("button", { name: "Back" }).closest("div");
    expect(
      within(pageTwoActions as HTMLElement)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Back", "Cancel", "Save Routine Draft"]);

    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: { value: "Drive through the full range." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Routine Draft" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Create a Routine" })).toBeNull();
    });

    expect(screen.getByText("Routine Draft Queue (1)")).toBeTruthy();
    expect(screen.queryByText("Original Builder")).toBeNull();
    expect(screen.getByText("Updated Builder")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Publish Routine" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Publish Routine" })).toBeTruthy();
    });

    const publishDialog = screen.getByRole("dialog", { name: "Publish Routine" });
    expect(screen.queryByText("Send to")).toBeNull();
    expect(within(publishDialog).getByRole("button", { name: "Select Portfolio Folder" })).toBeTruthy();
    expect(within(publishDialog).queryByLabelText("Local folder name")).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Create a Routine" })).toBeNull();

    fireEvent.click(within(publishDialog).getByRole("button", { name: "Publish Routine" }));

    await waitFor(() => {
      expect(screen.getByText("Select at least one portfolio folder.")).toBeTruthy();
    });

    fireEvent.click(within(publishDialog).getByRole("button", { name: "Select Portfolio Folder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Select Portfolio Folder" })).toBeTruthy();
    });

    const folderPicker = screen.getByRole("dialog", { name: "Select Portfolio Folder" });
    const strengthCheckbox = within(folderPicker).getByRole("checkbox", { name: "Strength" });
    const recoveryCheckbox = within(folderPicker).getByRole("checkbox", { name: "Recovery" });
    fireEvent.click(strengthCheckbox);
    fireEvent.click(recoveryCheckbox);

    fireEvent.click(within(folderPicker).getByRole("button", { name: "Add New Folder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add New Folder" })).toBeTruthy();
    });

    const addNewFolderDialog = screen.getByRole("dialog", { name: "Add New Folder" });
    fireEvent.change(within(addNewFolderDialog).getByLabelText("Folder name"), {
      target: { value: "Mobility Builder" },
    });
    fireEvent.click(within(addNewFolderDialog).getByRole("button", { name: "Add Folder" }));

    await waitFor(() => {
      expect(within(folderPicker).getByRole("checkbox", { name: /Mobility Builder/i })).toBeTruthy();
    });

    expect(within(folderPicker).getByText("Local folder draft")).toBeTruthy();
    expect(
      (within(folderPicker).getByRole("checkbox", { name: /Mobility Builder/i }) as HTMLInputElement).checked,
    ).toBe(true);

    fireEvent.click(within(folderPicker).getByRole("button", { name: "Done" }));
    fireEvent.click(within(publishDialog).getByRole("button", { name: "Publish Routine" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Publish Routine" })).toBeNull();
    });

    expect(screen.getByText("Ready to publish")).toBeTruthy();
    expect(screen.getByText("Portfolio folders: Strength, Recovery, Mobility Builder")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Strength" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Recovery" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove local routine draft Updated Builder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Remove Routine Draft" })).toBeTruthy();
    });

    expect(screen.getByText("Are you sure you want to Remove this Draft")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Updated Builder")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove local routine draft Updated Builder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Remove Routine Draft" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove Draft" }));

    await waitFor(() => {
      expect(screen.queryByText("Updated Builder")).toBeNull();
    });

    expect(screen.queryByText("Routine Draft Queue (1)")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toEqual([]);
  });

  it("renders legacy single-target publish staging safely for older local routine drafts", async () => {
    mockTrainingFetches();
    window.localStorage.setItem(
      PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "legacy-routine-draft-1",
          type: "routine",
          routineName: "Legacy Builder",
          description: "Legacy draft shape",
          fitnessTargets: ["Back"],
          fitnessAttributes: ["Strength"],
          timedByDuration: false,
          setAmount: 4,
          exercises: [
            {
              id: "legacy-exercise-row-1",
              exerciseName: "Row",
              repGoal: 10,
              instructions: "Pull through the elbows.",
              weightsInvolved: true,
            },
          ],
          createdAt: "2026-06-01T12:00:00.000Z",
          publishStatus: "ready",
          publishTargetType: "local-folder-draft",
          publishTargetName: "Legacy Folder",
        },
      ]),
    );

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByText("Routine Draft Queue (1)")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Show routine draft queue" }));

    await waitFor(() => {
      expect(screen.getByText("Legacy Builder")).toBeTruthy();
    });

    expect(screen.getByText("Ready to publish")).toBeTruthy();
    expect(screen.getByText("Portfolio folders: Legacy Folder")).toBeTruthy();
  });

  it("filters real folders locally without issuing new requests", async () => {
    mockTrainingFetches();

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
