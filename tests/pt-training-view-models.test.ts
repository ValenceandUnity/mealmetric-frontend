import { describe, expect, it } from "vitest";

import { adaptPTTrainingView } from "@/lib/view-models/pt-training";

describe("adaptPTTrainingView", () => {
  it("returns safe fallbacks when PT training payloads are missing", () => {
    const view = adaptPTTrainingView({});

    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Folders", value: "0" }),
      expect.objectContaining({ label: "Portfolios", value: "0" }),
      expect.objectContaining({ label: "Routines", value: "0" }),
    ]));
    expect(view.folderTiles).toEqual([]);
    expect(view.packageCards).toEqual([]);
    expect(view.routineCards).toEqual([]);
    expect(view.hasFolders).toBe(false);
    expect(view.hasPackages).toBe(false);
    expect(view.hasRoutines).toBe(false);
    expect(view.hasAnyData).toBe(false);
  });

  it("maps folders, portfolios, and routines from current PT training response fields", () => {
    const view = adaptPTTrainingView({
      selectedFolderId: "folder-1",
      folders: {
        items: [
          {
            id: "folder-1",
            name: "Strength",
            description: "Barbell-first programming",
            sort_order: 2,
          },
          {
            id: "folder-2",
            name: "Recovery",
            description: null,
            sort_order: 4,
          },
        ],
      },
      packages: {
        items: [
          {
            id: "package-1",
            folder_id: "folder-1",
            title: "Strength Camp",
            description: "Four-week overload block",
            status: "active",
            duration_days: 28,
            is_template: false,
          },
          {
            id: "package-2",
            folder_id: "folder-2",
            title: "Mobility Starter",
            description: null,
            status: "draft",
            duration_days: null,
            is_template: true,
          },
        ],
      },
      routines: {
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
            description: null,
            difficulty: null,
            estimated_minutes: null,
            is_archived: true,
          },
        ],
      },
    });

    expect(view.hasAnyData).toBe(true);
    expect(view.folderTiles[0]).toMatchObject({
      id: "folder-1",
      title: "Strength",
      description: "Barbell-first programming",
      countLabel: "1 portfolio | 1 routine",
      sortOrderLabel: "Sort order 2",
      active: true,
    });
    expect(view.packageCards[0]).toMatchObject({
      id: "package-1",
      folderId: "folder-1",
      title: "Strength Camp",
      durationLabel: "28 days",
      folderLabel: "Strength",
      templateLabel: "Client-ready",
      editorHref: null,
    });
    expect(view.routineCards[1]).toMatchObject({
      id: "routine-2",
      folderId: "folder-2",
      folderLabel: "Recovery",
      estimatedMinutesLabel: "Minutes unavailable",
      archiveLabel: "Archived",
      editorHref: null,
    });
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Folders", value: "2" }),
      expect.objectContaining({ label: "Portfolios", value: "2" }),
      expect.objectContaining({ label: "Routines", value: "2" }),
      expect.objectContaining({ label: "Drafts", value: "1" }),
      expect.objectContaining({ label: "Active portfolios", value: "1" }),
      expect.objectContaining({ label: "Archived routines", value: "1" }),
    ]));
  });
});
