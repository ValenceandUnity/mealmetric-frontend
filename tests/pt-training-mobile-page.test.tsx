import React from "react";
import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY,
  PT_TRAINING_LOCAL_PORTFOLIO_FOLDERS_STORAGE_KEY,
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

function mockTrainingFetchesWithManyFolders() {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "/api/pt/folders") {
      return jsonResponse({
        ok: true,
        data: {
          items: [
            { id: "folder-1", name: "Strength", description: "Barbell-first programming", sort_order: 1 },
            { id: "folder-2", name: "Recovery", description: "Mobility and reset work", sort_order: 2 },
            { id: "folder-3", name: "Conditioning", description: "Intervals and repeatability", sort_order: 3 },
            { id: "folder-4", name: "Power", description: "Speed-strength sessions", sort_order: 4 },
            { id: "folder-5", name: "Hypertrophy", description: "Volume-driven work", sort_order: 5 },
            { id: "folder-6", name: "Durability", description: "Joint and tissue resilience", sort_order: 6 },
          ],
          count: 6,
        },
      });
    }

    if (url === "/api/pt/packages") {
      return jsonResponse({
        ok: true,
        data: {
          items: [
            { id: "package-1", folder_id: "folder-1", title: "Strength Camp", description: "Four-week progressive overload block", status: "active", duration_days: 28, is_template: false },
            { id: "package-2", folder_id: "folder-2", title: "Recovery Reset", description: "Lower-load deload cycle", status: "draft", duration_days: 14, is_template: true },
            { id: "package-3", folder_id: "folder-3", title: "Conditioning Builder", description: "Engine work", status: "active", duration_days: 21, is_template: false },
          ],
          count: 3,
        },
      });
    }

    if (url === "/api/pt/routines") {
      return jsonResponse({
        ok: true,
        data: {
          items: [
            { id: "routine-1", folder_id: "folder-1", title: "Deadlift Primer", description: "Posterior-chain prep", difficulty: "advanced", estimated_minutes: 55, is_archived: false },
            { id: "routine-2", folder_id: "folder-2", title: "Recovery Flow", description: "Breathing and mobility sequence", difficulty: "easy", estimated_minutes: 20, is_archived: false },
            { id: "routine-3", folder_id: "folder-4", title: "Power Steps", description: "Fast-twitch preparation", difficulty: "medium", estimated_minutes: 35, is_archived: false },
          ],
          count: 3,
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

  it("renders the portfolio directory under the header, removes header search/actions, and keeps routine builder access", async () => {
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
    expect(screen.queryByRole("link", { name: "Open clients" })).toBeNull();
    expect(screen.queryByRole("searchbox", { name: "Search PT training" })).toBeNull();
    expect(screen.queryByText("GO")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 2 })[0]?.textContent).toBe("Training Portfolio");
    expect(screen.queryByRole("heading", { name: "Training overview" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Portfolio cards" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Routine cards" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Management status" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add an Exercise" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create a Routine" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search training portfolios" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit training portfolio display" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" })).toBeTruthy();
    expect(screen.queryByText("Add A Rep")).toBeNull();
    expect(screen.queryByText("Add A Set")).toBeNull();
    expect(screen.queryByText("Goals and Cues")).toBeNull();
    expect(screen.queryByText("Local folder drafts")).toBeNull();
    expect(screen.queryByText("Local draft")).toBeNull();

    const strengthFolderButton = screen.getByRole("button", { name: "Open training portfolio Strength" });
    expect(strengthFolderButton.className).toContain("pt-training-folder-row");
    expect(strengthFolderButton.querySelector(".pt-training-folder-row__thumbnail-placeholder")).toBeTruthy();
    expect(strengthFolderButton.querySelector(".pt-training-folder-row__action")).toBeTruthy();
    expect(screen.getAllByText(/Updated /).length).toBeGreaterThan(0);
  });

  it("creates local portfolio folders from the display modal and does not label them as drafts", async () => {
    mockTrainingFetches();

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit training portfolio display" })).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Edit training portfolio display" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Edit Training Portfolio Display" })).toBeTruthy();
    });

    const displayDialog = screen.getByRole("dialog", { name: "Edit Training Portfolio Display" });
    fireEvent.click(within(displayDialog).getByRole("button", { name: "Create New Folder" }));
    fireEvent.change(within(displayDialog).getByLabelText("Folder name"), {
      target: { value: "Mobility Builder" },
    });
    fireEvent.click(within(displayDialog).getByRole("button", { name: "Add Folder" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Mobility Builder" })).toBeTruthy();
    });

    expect(screen.getByText("Stored locally")).toBeTruthy();
    expect(screen.queryByText("Local folder drafts")).toBeNull();
    expect(screen.queryByText("Local draft")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_LOCAL_PORTFOLIO_FOLDERS_STORAGE_KEY) ?? "[]"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "local",
          title: "Mobility Builder",
        }),
      ]),
    );
  });

  it("publishes rep drafts into existing local folders and keeps the folder picker actions scoped", async () => {
    mockTrainingFetches();

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit training portfolio display" })).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Edit training portfolio display" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Edit Training Portfolio Display" })).toBeTruthy();
    });

    const displayDialog = screen.getByRole("dialog", { name: "Edit Training Portfolio Display" });
    fireEvent.click(within(displayDialog).getByRole("button", { name: "Create New Folder" }));
    fireEvent.change(within(displayDialog).getByLabelText("Folder name"), {
      target: { value: "TEST33" },
    });
    fireEvent.click(within(displayDialog).getByRole("button", { name: "Add Folder" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio TEST33" })).toBeTruthy();
    });

    fireEvent.click(within(displayDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Edit Training Portfolio Display" })).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add an Exercise" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add an Exercise" })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "1 mile run" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Exercise Draft" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add an Exercise" })).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Show training draft queue" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Publish Exercise" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish Exercise" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Publish Exercise" })).toBeTruthy();
    });

    let publishDialog = screen.getByRole("dialog", { name: "Publish Exercise" });
    fireEvent.click(within(publishDialog).getByRole("button", { name: "Select Portfolio Folder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Select Portfolio Folder" })).toBeTruthy();
    });

    let folderPicker = screen.getByRole("dialog", { name: "Select Portfolio Folder" });
    expect(within(folderPicker).getByRole("button", { name: "Close" })).toBeTruthy();
    expect(within(folderPicker).getByRole("button", { name: "Add New Folder" })).toBeTruthy();
    expect(within(folderPicker).getByRole("button", { name: "Done" })).toBeTruthy();
    expect(within(publishDialog).queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(within(publishDialog).queryByRole("button", { name: "Publish Exercise" })).toBeNull();

    fireEvent.click(within(folderPicker).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Select Portfolio Folder" })).toBeNull();
    });

    publishDialog = screen.getByRole("dialog", { name: "Publish Exercise" });
    expect(within(publishDialog).getByRole("button", { name: "Publish Exercise" })).toBeTruthy();

    fireEvent.click(within(publishDialog).getByRole("button", { name: "Select Portfolio Folder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Select Portfolio Folder" })).toBeTruthy();
    });

    folderPicker = screen.getByRole("dialog", { name: "Select Portfolio Folder" });
    fireEvent.click(within(folderPicker).getByRole("checkbox", { name: "TEST33" }));
    fireEvent.click(within(folderPicker).getByRole("button", { name: "Done" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Select Portfolio Folder" })).toBeNull();
    });

    publishDialog = screen.getByRole("dialog", { name: "Publish Exercise" });
    expect(within(publishDialog).getByText("Selected folders: TEST33")).toBeTruthy();
    fireEvent.click(within(publishDialog).getByRole("button", { name: "Publish Exercise" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Publish Exercise" })).toBeNull();
    });

    await waitFor(() => {
      expect(screen.queryByText("Training Draft Queue (1)")).toBeNull();
    });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search training portfolios" }), {
      target: { value: "1 mile run" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio TEST33" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open training portfolio TEST33" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "TEST33" })).toBeTruthy();
    });

    const test33Dialog = screen.getByRole("dialog", { name: "TEST33" });
    expect(within(test33Dialog).getByRole("button", { name: "Open Rep asset 1 mile run" })).toBeTruthy();
    fireEvent.click(within(test33Dialog).getByRole("button", { name: "Open Rep asset 1 mile run" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "1 mile run" })).toBeTruthy();
    });

    const repDetailDialog = screen.getByRole("dialog", { name: "1 mile run" });
    expect(within(repDetailDialog).getAllByText("Rep").length).toBeGreaterThan(0);
    fireEvent.click(within(repDetailDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "1 mile run" })).toBeNull();
    });

    fireEvent.click(within(test33Dialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "TEST33" })).toBeNull();
    });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search training portfolios" }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "All Singular Exercises" })).toBeTruthy();
    });

    const singularDialog = screen.getByRole("dialog", { name: "All Singular Exercises" });
    expect(within(singularDialog).getByRole("button", { name: "Open Rep asset 1 mile run" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
  });

  it("keeps Add an Exercise local-only and exposes saved exercises to routine autosuggest", async () => {
    mockTrainingFetches();

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add an Exercise" })).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    expect(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add an Exercise" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add an Exercise" })).toBeTruthy();
    });

    expect(screen.getByLabelText("Exercise")).toBeTruthy();
    expect(screen.queryByText("Page 2")).toBeNull();
    expect(screen.queryByLabelText("Rep Goal")).toBeNull();
    expect(screen.getByLabelText("Instructions (optional)")).toBeTruthy();
    expect(screen.getByText("Weights Involved?")).toBeTruthy();
    expect(screen.getByText("Fitness Target")).toBeTruthy();
    expect(screen.getByText("Fitness Attributes")).toBeTruthy();
    expect(screen.getByLabelText("Tags")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Target" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Attribute" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
    expect(screen.getByText("Media")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Media" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save Exercise Draft" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.queryByText("Exercise description")).toBeNull();
    expect(screen.queryByText("Main objective")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Another Exercise" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Previous exercise" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next exercise" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Weights Involved?" })).toBeNull();
    expect((screen.getByLabelText("Exercise") as HTMLInputElement).getAttribute("list")).toBe(
      "pt-training-exercise-suggestions",
    );
    expect(screen.getByLabelText("Biceps")).toBeTruthy();
    expect(screen.getByLabelText("Strength")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add Target" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add Fitness Target" })).toBeTruthy();
    });

    const addExerciseTargetDialog = screen.getByRole("dialog", { name: "Add Fitness Target" });
    fireEvent.change(within(addExerciseTargetDialog).getByLabelText("Body target"), {
      target: { value: "Chest" },
    });
    fireEvent.click(within(addExerciseTargetDialog).getByRole("button", { name: "Add Target" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Chest")).toBeTruthy();
    });

    expect((screen.getByLabelText("Chest") as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Add Attribute" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add Fitness Attribute" })).toBeTruthy();
    });

    const addExerciseAttributeDialog = screen.getByRole("dialog", { name: "Add Fitness Attribute" });
    fireEvent.change(within(addExerciseAttributeDialog).getByLabelText("Physical attribute"), {
      target: { value: "Power Output" },
    });
    fireEvent.click(within(addExerciseAttributeDialog).getByRole("button", { name: "Add Attribute" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Power Output")).toBeTruthy();
    });

    expect((screen.getByLabelText("Power Output") as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByLabelText("Biceps"));
    fireEvent.click(screen.getByLabelText("Strength"));
    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "Explosive" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByText("Explosive")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Explosive"));
    expect(screen.getByText("Explosive")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove Explosive tag" }));

    await waitFor(() => {
      expect(screen.queryByText("Explosive")).toBeNull();
    });

    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "Explosive" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "Barbell" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    fireEvent.click(screen.getByRole("button", { name: "Add Media" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add Media" })).toBeTruthy();
    });

    const mediaDialog = screen.getByRole("dialog", { name: "Add Media" });
    const imageInput = within(mediaDialog).getByLabelText("Upload image or GIF") as HTMLInputElement;
    const videoInput = within(mediaDialog).getByLabelText("Upload video") as HTMLInputElement;
    expect(imageInput.accept).toBe("image/png,image/jpeg,image/webp,image/gif");
    expect(videoInput.accept).toBe("video/mp4,video/webm");

    fireEvent.change(imageInput, {
      target: {
        files: [new File(["bad"], "bad.txt", { type: "text/plain" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Upload a PNG, JPEG, WEBP, GIF, MP4, or WEBM file.")).toBeTruthy();
    });

    fireEvent.change(imageInput, {
      target: {
        files: [new File(["demo-image"], "bench-demo.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText(/bench-demo\.png/).length).toBeGreaterThan(0);
    });

    fireEvent.click(within(mediaDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add Media" })).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Exercise Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Exercise is required.")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Bench Press" },
    });
    fireEvent.click(screen.getByLabelText("Yes"));
    fireEvent.click(screen.getByRole("button", { name: "Save Exercise Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Training Draft Queue (1)")).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    const savedExerciseDrafts = JSON.parse(
      window.localStorage.getItem(PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY) ?? "[]",
    );
    expect(savedExerciseDrafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "rep",
          title: "Bench Press",
          exerciseName: "Bench Press",
          instructions: "",
          weightsInvolved: true,
          fitnessTargets: expect.arrayContaining(["Biceps", "Chest"]),
          fitnessAttributes: expect.arrayContaining(["Strength", "Power Output"]),
          tags: expect.arrayContaining(["Explosive", "Barbell"]),
          media: expect.objectContaining({
            kind: "image",
            name: "bench-demo.png",
            mimeType: "image/png",
          }),
        }),
      ]),
    );
    expect(savedExerciseDrafts[0]?.repGoal).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Show training draft queue" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit rep draft Bench Press" })).toBeTruthy();
    });

    const repDraftButton = screen.getByRole("button", { name: "Edit rep draft Bench Press" });
    const repDraftCard = repDraftButton.closest("article") as HTMLElement;
    expect(within(repDraftCard).getByText("Rep")).toBeTruthy();
    expect(within(repDraftCard).queryByText("Routine")).toBeNull();
    expect(within(repDraftCard).getByText(/Fitness targets: /)).toBeTruthy();
    expect(within(repDraftCard).getByText(/Fitness attributes: /)).toBeTruthy();
    expect(within(repDraftCard).getByText(/Tags: /)).toBeTruthy();

    fireEvent.click(repDraftButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add an Exercise" })).toBeTruthy();
    });

    expect((screen.getByLabelText("Exercise") as HTMLInputElement).value).toBe("Bench Press");
    expect((screen.getByLabelText("Instructions (optional)") as HTMLTextAreaElement).value).toBe("");
    fireEvent.change(screen.getByLabelText("Instructions (optional)"), {
      target: { value: "Lower with control and drive upward." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Exercise Draft" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add an Exercise" })).toBeNull();
    });

    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exerciseName: "Bench Press",
          instructions: "Lower with control and drive upward.",
          fitnessTargets: expect.arrayContaining(["Biceps", "Chest"]),
          fitnessAttributes: expect.arrayContaining(["Strength", "Power Output"]),
          tags: expect.arrayContaining(["Explosive", "Barbell"]),
          media: expect.objectContaining({
            name: "bench-demo.png",
          }),
          editedAt: expect.any(String),
        }),
      ]),
    );
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Publish Exercise" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Publish Exercise" })).toBeTruthy();
    });

    const publishDialog = screen.getByRole("dialog", { name: "Publish Exercise" });
    fireEvent.click(within(publishDialog).getByRole("button", { name: "Publish Exercise" }));

    await waitFor(() => {
      expect(screen.getByText("Select at least one portfolio folder.")).toBeTruthy();
    });

    fireEvent.click(within(publishDialog).getByRole("button", { name: "Select Portfolio Folder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Select Portfolio Folder" })).toBeTruthy();
    });

    const folderPicker = screen.getByRole("dialog", { name: "Select Portfolio Folder" });
    fireEvent.click(within(folderPicker).getByRole("checkbox", { name: "Strength" }));
    fireEvent.click(within(folderPicker).getByRole("button", { name: "Done" }));
    fireEvent.click(within(publishDialog).getByRole("button", { name: "Publish Exercise" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Publish Exercise" })).toBeNull();
    });

    await waitFor(() => {
      expect(screen.queryByText("Training Draft Queue (1)")).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "All Singular Exercises" })).toBeTruthy();
    });

    const singularDialog = screen.getByRole("dialog", { name: "All Singular Exercises" });
    expect(within(singularDialog).getByRole("button", { name: "Open Rep asset Bench Press" })).toBeTruthy();
    expect(within(singularDialog).queryByText("Draft")).toBeNull();
    expect(within(singularDialog).queryByRole("button", { name: "Edit Folder" })).toBeNull();
    fireEvent.click(within(singularDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "All Singular Exercises" })).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open training portfolio Strength" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Strength" })).toBeTruthy();
    });

    const strengthDialog = screen.getByRole("dialog", { name: "Strength" });
    expect(within(strengthDialog).getByRole("button", { name: "Open Rep asset Bench Press" })).toBeTruthy();

    fireEvent.click(within(strengthDialog).getByRole("button", { name: "Open Rep asset Bench Press" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Bench Press" })).toBeTruthy();
    });

    const benchPressDialog = screen.getByRole("dialog", { name: "Bench Press" });
    expect(within(benchPressDialog).getAllByText("Rep").length).toBeGreaterThan(0);
    expect(within(benchPressDialog).getByText("Instructions: Lower with control and drive upward.")).toBeTruthy();
    expect(within(benchPressDialog).getByText("Weights involved: Yes")).toBeTruthy();
    expect(within(benchPressDialog).getByText(/Fitness targets: /)).toBeTruthy();
    expect(within(benchPressDialog).getByText(/Fitness attributes: /)).toBeTruthy();
    expect(within(benchPressDialog).getByText("Explosive")).toBeTruthy();
    expect(within(benchPressDialog).getByText("Barbell")).toBeTruthy();
    expect(within(benchPressDialog).getByText("Media: bench-demo.png")).toBeTruthy();
    expect(within(benchPressDialog).getByRole("button", { name: "Edit Exercise" })).toBeTruthy();
    expect(within(benchPressDialog).queryByText(/Rep Goal:/i)).toBeNull();
    expect(within(benchPressDialog).queryByText(/Main objective/i)).toBeNull();
    fireEvent.click(within(benchPressDialog).getByRole("button", { name: "Edit Exercise" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save local changes" })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Incline Bench Press" },
    });
    fireEvent.change(screen.getByLabelText("Instructions (optional)"), {
      target: { value: "Drive through the incline path." },
    });
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    fireEvent.click(screen.getByLabelText("Back"));
    fireEvent.click(screen.getByLabelText("Speed"));
    fireEvent.click(screen.getByText("Barbell"));
    expect(screen.getByText("Barbell")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove Barbell tag" }));
    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "Tempo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Save local changes" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Incline Bench Press" })).toBeTruthy();
    });

    const inclineBenchDialog = screen.getByRole("dialog", { name: "Incline Bench Press" });
    expect(within(inclineBenchDialog).getByText("Exercise: Incline Bench Press")).toBeTruthy();
    expect(within(inclineBenchDialog).getByText("Instructions: Drive through the incline path.")).toBeTruthy();
    expect(within(inclineBenchDialog).getByText("Weights involved: No")).toBeTruthy();
    expect(within(inclineBenchDialog).getByText("Tempo")).toBeTruthy();
    expect(within(inclineBenchDialog).queryByText("Barbell")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);

    fireEvent.click(within(inclineBenchDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Incline Bench Press" })).toBeNull();
    });

    fireEvent.click(within(strengthDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Strength" })).toBeNull();
    });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search training portfolios" }), {
      target: { value: "Tempo" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" })).toBeTruthy();
    });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search training portfolios" }), {
      target: { value: "Chest" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" })).toBeTruthy();
    });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search training portfolios" }), {
      target: { value: "Power Output" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "All Singular Exercises" })).toBeTruthy();
    });

    const updatedSingularDialog = screen.getByRole("dialog", { name: "All Singular Exercises" });
    expect(within(updatedSingularDialog).getByRole("button", { name: "Open Rep asset Incline Bench Press" })).toBeTruthy();
    fireEvent.click(within(updatedSingularDialog).getByRole("button", { name: "Open Rep asset Incline Bench Press" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Incline Bench Press" })).toBeTruthy();
    });

    const syncedRepDialog = screen.getByRole("dialog", { name: "Incline Bench Press" });
    expect(within(syncedRepDialog).getByText("Tempo")).toBeTruthy();
    expect(within(syncedRepDialog).getByText("Instructions: Drive through the incline path.")).toBeTruthy();
    fireEvent.click(within(syncedRepDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Incline Bench Press" })).toBeNull();
    });

    fireEvent.click(within(updatedSingularDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "All Singular Exercises" })).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Create a Routine" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Create a Routine" })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Routine name"), {
      target: { value: "Press Builder" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next: Add Exercises" }));

    await waitFor(() => {
      expect(screen.getByText("Routine Exercises")).toBeTruthy();
    });

    const exerciseInput = screen.getByLabelText("Exercise") as HTMLInputElement;
    expect(exerciseInput.getAttribute("list")).toBe("pt-training-routine-exercise-suggestions");
    expect(screen.getByLabelText("Rep Goal")).toBeTruthy();
    expect(screen.getByText("Media")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Media" })).toBeTruthy();
    const datalist = document.getElementById("pt-training-routine-exercise-suggestions");
    expect((datalist as HTMLElement).querySelector('option[value="Incline Bench Press"]')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
  }, 10000);

  it("keeps routine page-one fields optional, adds tags/media, and saves local drafts with only routine name required", async () => {
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
    expect(screen.getByLabelText("Tags")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
    expect(screen.getByText("Media")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Media" })).toBeTruthy();
    expect(screen.getByText("Timed by duration")).toBeTruthy();
    expect(screen.queryByLabelText("How many Sets?")).toBeNull();
    expect(screen.queryByText("How many Sets? is required.")).toBeNull();
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

    fireEvent.click(screen.getByRole("button", { name: "Next: Add Exercises" }));

    await waitFor(() => {
      expect(screen.getByText("Routine name is required.")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Routine name"), {
      target: { value: "Full Body Builder" },
    });
    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "Circuit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByText("Circuit")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Circuit"));
    expect(screen.getByText("Circuit")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove Circuit tag" }));

    await waitFor(() => {
      expect(screen.queryByText("Circuit")).toBeNull();
    });

    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "Circuit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    fireEvent.click(screen.getByRole("button", { name: "Add Media" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add Media" })).toBeTruthy();
    });

    const routineDialog = screen.getByRole("dialog", { name: "Create a Routine" });
    const routinePageOneMediaDialog = screen.getByRole("dialog", { name: "Add Media" });
    expect(routineDialog).toBeTruthy();
    expect(routinePageOneMediaDialog.parentElement?.className).toContain("pt-training-media-picker-backdrop");
    expect(routinePageOneMediaDialog.className).toContain("pt-training-media-picker-dialog");
    expect(routinePageOneMediaDialog.className).toContain("pt-training-media-picker-dialog--active");
    expect(routinePageOneMediaDialog.parentElement).not.toBe(routineDialog.parentElement);
    expect(within(routinePageOneMediaDialog).getByLabelText("Upload image or GIF")).toBeTruthy();
    expect(within(routinePageOneMediaDialog).getByLabelText("Upload video")).toBeTruthy();
    const routinePageOneMediaInput =
      within(routinePageOneMediaDialog).getByLabelText("Upload image or GIF") as HTMLInputElement;
    fireEvent.change(routinePageOneMediaInput, {
      target: {
        files: [new File(["routine-cover"], "routine-cover.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText(/routine-cover\.png/).length).toBeGreaterThan(0);
    });

    fireEvent.click(within(routinePageOneMediaDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add Media" })).toBeNull();
    });

    expect(screen.getByRole("dialog", { name: "Create a Routine" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next: Add Exercises" }));

    await waitFor(() => {
      expect(screen.getByText("Routine Exercises")).toBeTruthy();
    });

    expect(screen.getByLabelText("Tags")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
    const pageTwoActions = screen.getByRole("button", { name: "Back" }).closest("div");
    expect(pageTwoActions?.className).toContain("pt-training-modal__actions--centered");
    expect(
      within(pageTwoActions as HTMLElement)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Back", "Cancel", "Save Routine Draft"]);

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);

    fireEvent.click(screen.getByRole("button", { name: "Save Routine Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Training Draft Queue (1)")).toBeTruthy();
    });

    expect(screen.queryByText("Full Body Builder")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show training draft queue" }));

    await waitFor(() => {
      expect(screen.getByText("Full Body Builder")).toBeTruthy();
    });

    expect(screen.getByText("Fitness targets: None selected")).toBeTruthy();
    expect(screen.getByText("Fitness attributes: None selected")).toBeTruthy();
    expect(screen.getByText("Tags: Circuit")).toBeTruthy();
    expect(screen.getByText(/Exercise count: 0/)).toBeTruthy();
    expect(screen.getByText("Media: routine-cover.png")).toBeTruthy();
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
          description: "",
          fitnessTargets: [],
          fitnessAttributes: [],
          tags: ["Circuit"],
          media: expect.objectContaining({
            kind: "image",
            name: "routine-cover.png",
            mimeType: "image/png",
          }),
          timedByDuration: false,
          publishStatus: "draft",
          editedAt: expect.any(String),
          exercises: [],
        }),
      ]),
    );
  });

  it("closes any open routine media picker when the parent routine dialog closes", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Add Media" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add Media" })).toBeTruthy();
    });

    const routineDialog = screen.getByRole("dialog", { name: "Create a Routine" });
    expect(screen.getByRole("dialog", { name: "Add Media" })).toBeTruthy();

    fireEvent.click(within(routineDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Create a Routine" })).toBeNull();
    });

    expect(screen.queryByRole("dialog", { name: "Add Media" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
  });

  it("adds page-two exercise tags locally, keeps them scoped per exercise row, and saves them with routine drafts", async () => {
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

    fireEvent.change(screen.getByLabelText("Routine name"), {
      target: { value: "Tagged Builder" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next: Add Exercises" }));

    await waitFor(() => {
      expect(screen.getByText("Routine Exercises")).toBeTruthy();
    });

    expect(screen.getByLabelText("Exercise")).toBeTruthy();
    expect(screen.getByLabelText("Rep Goal")).toBeTruthy();
    expect(screen.getByLabelText("Instructions")).toBeTruthy();
    expect(screen.getByText("Weights Involved?")).toBeTruthy();
    expect(screen.getByText("Media")).toBeTruthy();
    const exerciseTagInput = screen.getByLabelText("Tags") as HTMLInputElement;
    expect(exerciseTagInput.placeholder).toBe("Add exercise tag");
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Bench Press" },
    });
    fireEvent.change(exerciseTagInput, {
      target: { value: "Chest" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByText("Chest")).toBeTruthy();
    });

    expect(exerciseTagInput.value).toBe("");
    expect(screen.queryByRole("button", { name: "Chest" })).toBeNull();
    fireEvent.click(screen.getByText("Chest"));
    fireEvent.click(screen.getByText("Chest").closest(".pt-training-routine-exercise-tags__tag") as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText("Chest")).toBeTruthy();
    });

    fireEvent.change(exerciseTagInput, {
      target: { value: "chest" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getAllByText("Chest")).toHaveLength(1);
    expect(exerciseTagInput.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Add Another Exercise" }));

    await waitFor(() => {
      expect(screen.getByText("Exercise 2")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Squat" },
    });
    const secondExerciseTagInput = screen.getByLabelText("Tags") as HTMLInputElement;
    fireEvent.change(secondExerciseTagInput, {
      target: { value: "Legs" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByText("Legs")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Previous exercise" }));

    await waitFor(() => {
      expect(screen.getByText("Exercise 1 of 2")).toBeTruthy();
    });

    expect((screen.getByLabelText("Exercise") as HTMLInputElement).value).toBe("Bench Press");
    expect(screen.getByText("Chest")).toBeTruthy();
    expect(screen.queryByText("Legs")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next exercise" }));

    await waitFor(() => {
      expect(screen.getByText("Exercise 2 of 2")).toBeTruthy();
    });

    expect((screen.getByLabelText("Exercise") as HTMLInputElement).value).toBe("Squat");
    expect(screen.getByText("Legs")).toBeTruthy();
    expect(screen.queryByText("Chest")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Remove Legs tag" }));

    await waitFor(() => {
      expect(screen.queryByText("Legs")).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove exercise row" }));

    await waitFor(() => {
      expect(screen.queryByText("Exercise 2 of 2")).toBeNull();
    });

    expect((screen.getByLabelText("Exercise") as HTMLInputElement).value).toBe("Bench Press");
    expect(screen.getByText("Chest")).toBeTruthy();
    expect(screen.queryByText("Legs")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Save Routine Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Training Draft Queue (1)")).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          routineName: "Tagged Builder",
          exercises: [
            expect.objectContaining({
              exerciseName: "Bench Press",
              tags: ["Chest"],
            }),
          ],
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
      expect(screen.getByText("Training Draft Queue (1)")).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Show training draft queue" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit routine draft Original Builder" })).toBeTruthy();
    });

    const initialDraftEditButton = screen.getByRole("button", { name: "Edit routine draft Original Builder" });
    expect(initialDraftEditButton.querySelector("button")).toBeNull();
    expect(within(initialDraftEditButton).getByText("Routine")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit routine draft Original Builder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Create a Routine" })).toBeTruthy();
    });

    expect((screen.getByLabelText("Routine name") as HTMLInputElement).value).toBe("Original Builder");
    expect(screen.queryByRole("button", { name: "Next: Add Exercises" })).toBeNull();
    expect(screen.getByRole("button", { name: "Review Exercises" })).toBeTruthy();
    expect(screen.queryByLabelText("How many Sets?")).toBeNull();
    expect(screen.getByLabelText("Tags")).toBeTruthy();
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
    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "Mobility" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByText("Mobility")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Media" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add Media" })).toBeTruthy();
    });

    const routineEditDialog = screen.getByRole("dialog", { name: "Create a Routine" });
    const routinePageOneMediaDialog = screen.getByRole("dialog", { name: "Add Media" });
    expect(routineEditDialog).toBeTruthy();
    expect(routinePageOneMediaDialog.parentElement?.className).toContain("pt-training-media-picker-backdrop");
    expect(routinePageOneMediaDialog.className).toContain("pt-training-media-picker-dialog");
    const routinePageOneMediaInput =
      within(routinePageOneMediaDialog).getByLabelText("Upload image or GIF") as HTMLInputElement;
    fireEvent.change(routinePageOneMediaInput, {
      target: {
        files: [new File(["routine-cover"], "builder-cover.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText(/builder-cover\.png/).length).toBeGreaterThan(0);
    });

    fireEvent.click(within(routinePageOneMediaDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add Media" })).toBeNull();
    });

    expect(screen.getByRole("dialog", { name: "Create a Routine" })).toBeTruthy();

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
          tags: ["Mobility"],
          media: expect.objectContaining({
            kind: "image",
            name: "builder-cover.png",
            mimeType: "image/png",
          }),
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
    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "Pressing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByText("Pressing")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Media" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Add Media" })).toBeTruthy();
    });

    const routineMediaDialog = screen.getByRole("dialog", { name: "Add Media" });
    expect(screen.getByRole("dialog", { name: "Create a Routine" })).toBeTruthy();
    expect(routineMediaDialog.parentElement?.className).toContain("pt-training-media-picker-backdrop");
    expect(routineMediaDialog.className).toContain("pt-training-media-picker-dialog");
    const routineMediaInput = within(routineMediaDialog).getByLabelText("Upload image or GIF") as HTMLInputElement;
    fireEvent.change(routineMediaInput, {
      target: {
        files: [new File(["routine-image"], "push-up-demo.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText(/push-up-demo\.png/).length).toBeGreaterThan(0);
    });

    fireEvent.click(within(routineMediaDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add Media" })).toBeNull();
    });

    expect(screen.getByRole("dialog", { name: "Create a Routine" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save Routine Draft" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Create a Routine" })).toBeNull();
    });

    expect(screen.getByText("Training Draft Queue (1)")).toBeTruthy();
    expect(screen.queryByText("Original Builder")).toBeNull();
    expect(screen.getByText("Updated Builder")).toBeTruthy();
    expect(
      JSON.parse(window.localStorage.getItem(PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY) ?? "[]"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exercises: expect.arrayContaining([
            expect.objectContaining({
              tags: ["Pressing"],
              media: expect.objectContaining({
                kind: "image",
                name: "push-up-demo.png",
                mimeType: "image/png",
              }),
            }),
          ]),
        }),
      ]),
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove local routine draft Updated Builder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Remove Routine Draft" })).toBeTruthy();
    });

    expect(screen.getByText("Are you sure you want to Remove this Draft")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Create a Routine" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
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

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Edit routine draft Updated Builder" })).toBeNull();
    });

    expect(screen.queryByText("Training Draft Queue (1)")).toBeNull();
    expect(screen.getByRole("button", { name: "Open training portfolio Mobility Builder" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open training portfolio Mobility Builder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Mobility Builder" })).toBeTruthy();
    });

    const mobilityFolderDialog = screen.getByRole("dialog", { name: "Mobility Builder" });
    expect(within(mobilityFolderDialog).getByText("Portfolio Folder")).toBeTruthy();
    expect(within(mobilityFolderDialog).getByRole("button", { name: "Edit Folder" })).toBeTruthy();
    expect(within(mobilityFolderDialog).getByRole("button", { name: "Open Routine asset Updated Builder" })).toBeTruthy();
    expect(within(mobilityFolderDialog).getByText("Routine")).toBeTruthy();
    expect(within(mobilityFolderDialog).queryByRole("button", { name: "Open Rep asset Push Up" })).toBeNull();
    expect(within(mobilityFolderDialog).queryByRole("button", { name: "Open Rep asset Leg Extension" })).toBeNull();

    fireEvent.click(within(mobilityFolderDialog).getByRole("button", { name: "Open Routine asset Updated Builder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Updated Builder" })).toBeTruthy();
    });

    const updatedBuilderDialog = screen.getByRole("dialog", { name: "Updated Builder" });
    expect(within(updatedBuilderDialog).getAllByText("Routine").length).toBeGreaterThan(0);
    expect(within(updatedBuilderDialog).getByText("Fitness targets: Back")).toBeTruthy();
    expect(within(updatedBuilderDialog).getByText("Fitness attributes: Endurance")).toBeTruthy();
    expect(within(updatedBuilderDialog).getByText("Mobility")).toBeTruthy();
    expect(within(updatedBuilderDialog).getByText("Push Up")).toBeTruthy();
    expect(within(updatedBuilderDialog).getByText("Rep goal: 12")).toBeTruthy();
    expect(within(updatedBuilderDialog).getByText("Drive through the full range.")).toBeTruthy();
    expect(within(updatedBuilderDialog).getByText("Pressing")).toBeTruthy();
    expect(within(updatedBuilderDialog).getByText(/builder-cover\.png/)).toBeTruthy();
    expect(within(updatedBuilderDialog).getByText("Media: push-up-demo.png")).toBeTruthy();
    expect(within(updatedBuilderDialog).queryByText(/Set amount:/)).toBeNull();
    fireEvent.click(within(updatedBuilderDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Updated Builder" })).toBeNull();
    });

    fireEvent.click(within(screen.getByRole("dialog", { name: "Mobility Builder" })).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Mobility Builder" })).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "All Singular Exercises" })).toBeTruthy();
    });

    const allSingularDialog = screen.getByRole("dialog", { name: "All Singular Exercises" });
    expect(within(allSingularDialog).queryByRole("button", { name: "Open Routine asset Updated Builder" })).toBeNull();
    fireEvent.click(within(allSingularDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "All Singular Exercises" })).toBeNull();
    });

    const searchbox = screen.getByRole("searchbox", { name: "Search training portfolios" });
    fireEvent.change(searchbox, {
      target: { value: "Updated Builder" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Mobility Builder" })).toBeTruthy();
    });

    fireEvent.change(searchbox, {
      target: { value: "Push Up" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Mobility Builder" })).toBeTruthy();
    });

    fireEvent.change(searchbox, {
      target: { value: "Back" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Mobility Builder" })).toBeTruthy();
    });

    fireEvent.change(searchbox, {
      target: { value: "Endurance" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Mobility Builder" })).toBeTruthy();
    });

    fireEvent.change(searchbox, {
      target: { value: "Mobility" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Mobility Builder" })).toBeTruthy();
    });

    fireEvent.change(searchbox, {
      target: { value: "Pressing" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Mobility Builder" })).toBeTruthy();
    });

    fireEvent.change(searchbox, {
      target: { value: "builder-cover.png" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Mobility Builder" })).toBeTruthy();
    });
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
      expect(screen.getByRole("button", { name: "Open training portfolio Legacy Folder" })).toBeTruthy();
    });

    expect(screen.queryByText("Training Draft Queue (1)")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open training portfolio Legacy Folder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Legacy Folder" })).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: "Open Routine asset Legacy Builder" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Routine asset Legacy Builder" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Legacy Builder" })).toBeTruthy();
    });

    expect(screen.getByText("Row")).toBeTruthy();
    expect(screen.getByText("Rep goal: 10")).toBeTruthy();
  });

  it("shows 5 most recent folders by default, supports pinned display, and enforces the 5-folder pin limit", async () => {
    mockTrainingFetchesWithManyFolders();

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Strength" })).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;
    expect(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open training portfolio Durability" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit training portfolio display" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Edit Training Portfolio Display" })).toBeTruthy();
    });

    const displayDialog = screen.getByRole("dialog", { name: "Edit Training Portfolio Display" });
    fireEvent.click(within(displayDialog).getByRole("radio", { name: "Pinned" }));

    fireEvent.click(within(displayDialog).getByRole("checkbox", { name: "Strength" }));
    fireEvent.click(within(displayDialog).getByRole("checkbox", { name: "Recovery" }));
    fireEvent.click(within(displayDialog).getByRole("checkbox", { name: "Conditioning" }));
    fireEvent.click(within(displayDialog).getByRole("checkbox", { name: "Power" }));
    fireEvent.click(within(displayDialog).getByRole("checkbox", { name: "Hypertrophy" }));
    fireEvent.click(within(displayDialog).getByRole("checkbox", { name: "Durability" }));

    await waitFor(() => {
      expect(screen.getByText("Pin up to 5 folders.")).toBeTruthy();
    });

    fireEvent.click(within(displayDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Edit Training Portfolio Display" })).toBeNull();
    });

    expect(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open training portfolio Strength" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open training portfolio Durability" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
  });

  it("filters portfolio rows locally by title, tags, and exercises without issuing new requests", async () => {
    mockTrainingFetches();

    render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Strength" })).toBeTruthy();
    });

    const fetchCallCount = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Open training portfolio Strength" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Strength" })).toBeTruthy();
    });

    expect(screen.getByText("Portfolio Folder")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit Folder" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Folder title")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "Explosive" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "Stability" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByText("Explosive")).toBeTruthy();
      expect(screen.getByText("Stability")).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: "Explosive" })).toBeNull();
    fireEvent.click(screen.getByText("Explosive"));
    fireEvent.click(screen.getByText("Stability").closest(".pt-training-folder-edit__tag") as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText("Explosive")).toBeTruthy();
      expect(screen.getByText("Stability")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove Stability tag" }));

    await waitFor(() => {
      expect(screen.queryByText("Stability")).toBeNull();
      expect(screen.getByText("Explosive")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Exercises"), {
      target: { value: "Box Jump" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Exercise" }));
    fireEvent.click(screen.getByRole("button", { name: "Save local changes" }));

    await waitFor(() => {
      expect(screen.getByText("Explosive")).toBeTruthy();
    });

    const strengthDialog = screen.getByRole("dialog", { name: "Strength" });
    expect(within(strengthDialog).getByRole("button", { name: "Open Rep asset Box Jump" })).toBeTruthy();
    expect(within(strengthDialog).getAllByText("Rep").length).toBeGreaterThan(0);
    fireEvent.click(within(strengthDialog).getByRole("button", { name: "Open Rep asset Box Jump" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Box Jump" })).toBeTruthy();
    });

    const boxJumpDialog = screen.getByRole("dialog", { name: "Box Jump" });
    expect(within(boxJumpDialog).getAllByText("Rep").length).toBeGreaterThan(0);
    expect(within(boxJumpDialog).getByText("Instructions: No instructions added.")).toBeTruthy();
    fireEvent.click(within(boxJumpDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Box Jump" })).toBeNull();
    });

    fireEvent.click(within(screen.getByRole("dialog", { name: "Strength" })).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Strength" })).toBeNull();
    });

    const searchbox = screen.getByRole("searchbox", { name: "Search training portfolios" });

    fireEvent.change(searchbox, {
      target: { value: "Recovery" },
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Open training portfolio Strength" })).toBeNull();
      expect(screen.getByRole("button", { name: "Open training portfolio Recovery" })).toBeTruthy();
    });

    fireEvent.change(searchbox, {
      target: { value: "Explosive" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Strength" })).toBeTruthy();
    });

    fireEvent.change(searchbox, {
      target: { value: "Box Jump" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio Strength" })).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
  });

  it("renders safe empty and unavailable states for the real folder surface", async () => {
    mockEmptyTrainingFetches();

    const { unmount } = render(React.createElement(PTTrainingPage));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" })).toBeTruthy();
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
      expect(screen.getByRole("button", { name: "Open training portfolio All Singular Exercises" })).toBeTruthy();
    });

    expect(screen.queryByText("Training Portfolio unavailable")).toBeNull();
    expect(screen.queryByText("Unavailable: /api/pt/folders")).toBeNull();
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
