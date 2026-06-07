import type { JsonValue } from "@/lib/types/api";

import { getArray, isObject, pickOptionalText } from "@/lib/adapters/common";
import {
  formatCountLabel,
  formatNumber,
  getGradient,
  getNumberLike,
} from "@/lib/view-models/common";

export type MobilePTTrainingSummaryView = {
  label: string;
  value: string;
  progressText: string;
};

export type MobilePTFolderTileView = {
  id: string;
  title: string;
  description: string;
  countLabel: string;
  packageCountLabel: string;
  routineCountLabel: string;
  sortOrderLabel: string;
  active: boolean;
};

export type MobilePTPackageCardView = {
  id: string;
  folderId: string | null;
  title: string;
  description: string;
  statusLabel: string;
  durationLabel: string;
  folderLabel: string;
  templateLabel: string;
  managementNote: string;
  gradient: string;
  editorHref: string | null;
};

export type MobilePTRoutineCardView = {
  id: string;
  folderId: string | null;
  title: string;
  description: string;
  difficultyLabel: string;
  estimatedMinutesLabel: string;
  folderLabel: string;
  archiveLabel: string;
  managementNote: string;
  gradient: string;
  editorHref: string | null;
};

export type MobilePTTrainingView = {
  summaryCards: MobilePTTrainingSummaryView[];
  folderTiles: MobilePTFolderTileView[];
  packageCards: MobilePTPackageCardView[];
  routineCards: MobilePTRoutineCardView[];
  hasFolders: boolean;
  hasPackages: boolean;
  hasRoutines: boolean;
  hasAnyData: boolean;
};

type FolderRecord = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number | null;
};

type PackageRecord = {
  id: string;
  folderId: string | null;
  title: string;
  description: string | null;
  status: string | null;
  durationDays: number | null;
  isTemplate: boolean | null;
};

type RoutineRecord = {
  id: string;
  folderId: string | null;
  title: string;
  description: string | null;
  difficulty: string | null;
  estimatedMinutes: number | null;
  isArchived: boolean | null;
};

function readFolderRecords(value: JsonValue | null | undefined): FolderRecord[] {
  return getArray(value).flatMap((item, index) => {
    if (!isObject(item)) {
      return [];
    }

    return [{
      id: pickOptionalText(item, ["id"]) ?? `folder-${index + 1}`,
      title: pickOptionalText(item, ["name", "title"]) ?? `Folder ${index + 1}`,
      description: pickOptionalText(item, ["description"]),
      sortOrder: getNumberLike(item, ["sort_order", "position", "order"]),
    }];
  });
}

function readPackageRecords(value: JsonValue | null | undefined): PackageRecord[] {
  return getArray(value).flatMap((item, index) => {
    if (!isObject(item)) {
      return [];
    }

    const templateFlag = item.is_template;

    return [{
      id: pickOptionalText(item, ["id"]) ?? `package-${index + 1}`,
      folderId: pickOptionalText(item, ["folder_id"]),
      title: pickOptionalText(item, ["title", "name"]) ?? `Portfolio ${index + 1}`,
      description: pickOptionalText(item, ["description"]),
      status: pickOptionalText(item, ["status"]),
      durationDays: getNumberLike(item, ["duration_days"]),
      isTemplate:
        typeof templateFlag === "boolean"
          ? templateFlag
          : typeof templateFlag === "string"
            ? templateFlag.toLowerCase() === "true"
            : null,
    }];
  });
}

function readRoutineRecords(value: JsonValue | null | undefined): RoutineRecord[] {
  return getArray(value).flatMap((item, index) => {
    if (!isObject(item)) {
      return [];
    }

    const archivedFlag = item.is_archived;

    return [{
      id: pickOptionalText(item, ["id"]) ?? `routine-${index + 1}`,
      folderId: pickOptionalText(item, ["folder_id"]),
      title: pickOptionalText(item, ["title", "name"]) ?? `Routine ${index + 1}`,
      description: pickOptionalText(item, ["description"]),
      difficulty: pickOptionalText(item, ["difficulty"]),
      estimatedMinutes: getNumberLike(item, ["estimated_minutes"]),
      isArchived:
        typeof archivedFlag === "boolean"
          ? archivedFlag
          : typeof archivedFlag === "string"
            ? archivedFlag.toLowerCase() === "true"
            : null,
    }];
  });
}

function createFolderLabelMap(folders: FolderRecord[]): Map<string, string> {
  return new Map(folders.map((folder) => [folder.id, folder.title]));
}

function buildSummaryCards(args: {
  folders: FolderRecord[];
  packages: PackageRecord[];
  routines: RoutineRecord[];
}): MobilePTTrainingSummaryView[] {
  const draftPackageCount = args.packages.filter((item) => item.status?.toLowerCase() === "draft").length;
  const activePackageCount = args.packages.filter((item) => item.status?.toLowerCase() === "active").length;
  const archivedRoutineCount = args.routines.filter((item) => item.isArchived === true).length;

  return [
    {
      label: "Folders",
      value: formatNumber(args.folders.length),
      progressText:
        args.folders.length > 0
          ? "PT folders returned by the current folders route."
          : "No PT folders returned yet.",
    },
    {
      label: "Portfolios",
      value: formatNumber(args.packages.length),
      progressText:
        args.packages.length > 0
          ? "Training packages returned by the current PT packages route."
          : "No training portfolios returned yet.",
    },
    {
      label: "Routines",
      value: formatNumber(args.routines.length),
      progressText:
        args.routines.length > 0
          ? "Training routines returned by the current PT routines route."
          : "No PT routines returned yet.",
    },
    {
      label: "Drafts",
      value: formatNumber(draftPackageCount),
      progressText:
        args.packages.length > 0
          ? "Portfolios currently marked as draft."
          : "Draft count unavailable until portfolios load.",
    },
    {
      label: "Active portfolios",
      value: formatNumber(activePackageCount),
      progressText:
        args.packages.length > 0
          ? "Portfolios currently marked active."
          : "Active portfolio count unavailable until portfolios load.",
    },
    {
      label: "Archived routines",
      value: formatNumber(archivedRoutineCount),
      progressText:
        args.routines.length > 0
          ? "Routines currently marked archived."
          : activePackageCount > 0
            ? "Routine archive count unavailable until routines load."
            : "No archived routine data returned yet.",
    },
  ];
}

function buildFolderTiles(args: {
  folders: FolderRecord[];
  packages: PackageRecord[];
  routines: RoutineRecord[];
  selectedFolderId?: string | null;
}): MobilePTFolderTileView[] {
  return args.folders.map((folder) => {
    const folderPackageCount = args.packages.filter((item) => item.folderId === folder.id).length;
    const folderRoutineCount = args.routines.filter((item) => item.folderId === folder.id).length;
    const combinedCount = folderPackageCount + folderRoutineCount;

    return {
      id: folder.id,
      title: folder.title,
      description: folder.description ?? "PT folder returned by the protected folders route.",
      countLabel: combinedCount > 0
        ? `${formatCountLabel(folderPackageCount, "portfolio")} | ${formatCountLabel(folderRoutineCount, "routine")}`
        : "No portfolios or routines yet",
      packageCountLabel: formatCountLabel(folderPackageCount, "portfolio"),
      routineCountLabel: formatCountLabel(folderRoutineCount, "routine"),
      sortOrderLabel: folder.sortOrder !== null ? `Sort order ${folder.sortOrder}` : "Sort order unavailable",
      active: args.selectedFolderId === folder.id,
    };
  });
}

function buildPackageCards(args: {
  folders: FolderRecord[];
  packages: PackageRecord[];
}): MobilePTPackageCardView[] {
  const folderLabels = createFolderLabelMap(args.folders);

  return args.packages.map((item, index) => ({
    id: item.id,
    folderId: item.folderId,
    title: item.title,
    description: item.description ?? "Portfolio returned by the existing PT packages route.",
    statusLabel: item.status ?? "Status unavailable",
    durationLabel: item.durationDays !== null ? `${item.durationDays} days` : "Duration unavailable",
    folderLabel: item.folderId ? (folderLabels.get(item.folderId) ?? "Folder unavailable") : "No folder assigned",
    templateLabel:
      item.isTemplate === true
        ? "Template"
        : item.isTemplate === false
          ? "Client-ready"
          : "Template status unavailable",
    managementNote: "Package editor routes are not wired on the frontend in this phase.",
    gradient: getGradient(index),
    editorHref: null,
  }));
}

function buildRoutineCards(args: {
  folders: FolderRecord[];
  routines: RoutineRecord[];
}): MobilePTRoutineCardView[] {
  const folderLabels = createFolderLabelMap(args.folders);

  return args.routines.map((item, index) => ({
    id: item.id,
    folderId: item.folderId,
    title: item.title,
    description: item.description ?? "Routine returned by the existing PT routines route.",
    difficultyLabel: item.difficulty ?? "Difficulty unavailable",
    estimatedMinutesLabel:
      item.estimatedMinutes !== null ? `${item.estimatedMinutes} min` : "Minutes unavailable",
    folderLabel: item.folderId ? (folderLabels.get(item.folderId) ?? "Folder unavailable") : "No folder assigned",
    archiveLabel:
      item.isArchived === true
        ? "Archived"
        : item.isArchived === false
          ? "Live"
          : "Archive status unavailable",
    managementNote: "Routine editor routes are not wired on the frontend in this phase.",
    gradient: getGradient(index + args.folders.length),
    editorHref: null,
  }));
}

export function adaptPTTrainingView(args: {
  folders?: JsonValue | null;
  packages?: JsonValue | null;
  routines?: JsonValue | null;
  selectedFolderId?: string | null;
  rosterCategories?: JsonValue | null;
  rosterClients?: JsonValue | null;
  assignments?: JsonValue | null;
}): MobilePTTrainingView {
  const folders = readFolderRecords(args.folders ?? null);
  const packages = readPackageRecords(args.packages ?? null);
  const routines = readRoutineRecords(args.routines ?? null);

  return {
    summaryCards: buildSummaryCards({ folders, packages, routines }),
    folderTiles: buildFolderTiles({
      folders,
      packages,
      routines,
      selectedFolderId: args.selectedFolderId,
    }),
    packageCards: buildPackageCards({ folders, packages }),
    routineCards: buildRoutineCards({ folders, routines }),
    hasFolders: folders.length > 0,
    hasPackages: packages.length > 0,
    hasRoutines: routines.length > 0,
    hasAnyData: folders.length > 0 || packages.length > 0 || routines.length > 0,
  };
}
