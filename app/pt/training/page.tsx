"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileHeaderUtilities } from "@/components/mobile/MobileHeaderUtilities";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import {
  createLocalPTDraftId,
  createLocalPTExerciseDraft,
  createLocalPTPortfolioFolder,
  createLocalPTPortfolioRepAsset,
  createLocalPTPortfolioRoutineAsset,
  createLocalPTRoutineDraft,
  readLocalPTCustomFitnessAttributes,
  readLocalPTCustomFitnessTargets,
  readLocalPTExerciseDrafts,
  readLocalPTPinnedPortfolioFolders,
  readLocalPTPortfolioDisplayMode,
  readLocalPTPortfolioFolderOverlays,
  readLocalPTPortfolioFolders,
  readLocalPTRoutineDrafts,
  type LocalPTExerciseDraft,
  type LocalPTPortfolioAsset,
  type LocalPTPortfolioAssetExercise,
  type LocalPTPortfolioDisplayMode,
  type LocalPTPortfolioFolder,
  type LocalPTPortfolioFolderColor,
  type LocalPTPortfolioFolderOverlay,
  type PTTrainingDraftMedia,
  type LocalPTRoutineDraft,
  type LocalPTRoutineDraftPublishTarget,
  writeLocalPTCustomFitnessAttributes,
  writeLocalPTCustomFitnessTargets,
  writeLocalPTExerciseDrafts,
  writeLocalPTPinnedPortfolioFolders,
  writeLocalPTPortfolioDisplayMode,
  writeLocalPTPortfolioFolderOverlays,
  writeLocalPTPortfolioFolders,
  writeLocalPTRoutineDrafts,
} from "@/lib/client/pt-training-drafts";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import { adaptPTTrainingView } from "@/lib/view-models/pt-training";

type PTTrainingApiResponse = ApiResponse<JsonValue>;

type SectionErrors = {
  folders: string | null;
  packages: string | null;
  routines: string | null;
};

type PortfolioDirectoryFolder = {
  id: string;
  source: "bff" | "local" | "system-local";
  title: string;
  description: string;
  updatedAt: string;
  thumbnailDataUrl?: string;
  color: LocalPTPortfolioFolderColor;
  tags: string[];
  assets: LocalPTPortfolioAsset[];
  exercises: string[];
  routines: string[];
  searchFields: string[];
};

type BuilderOption = {
  kind: "exercise" | "routine";
  badge: string;
  title: string;
  copy: string;
  className: string;
};

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type TrainingStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

type ExerciseFormErrors = {
  exerciseName?: string;
};

type RoutineDetailsErrors = {
  routineName?: string;
};

type RoutineExerciseRow = {
  id: string;
  exerciseName: string;
  repGoal: string;
  instructions: string;
  weightsInvolved: boolean;
  media?: PTTrainingDraftMedia | null;
};

type RoutineExerciseRowErrors = {
  exerciseName?: string;
  repGoal?: string;
  instructions?: string;
};

type PortfolioFolderEditForm = {
  title: string;
  thumbnailDataUrl?: string;
  color: LocalPTPortfolioFolderColor;
  tags: string[];
  tagInput: string;
  assets: LocalPTPortfolioAsset[];
  exerciseInput: string;
  error: string | null;
  thumbnailError: string | null;
};

type SelectedPortfolioAssetState = {
  folderId: string;
  assetId: string;
} | null;

type FitnessOptionDialogState =
  | {
      kind: "target" | "attribute";
      scope: "routine" | "exercise" | "rep-asset-edit";
    }
  | null;

type RepAssetEditForm = {
  assetId: string;
  sourceDraftId?: string;
  exerciseName: string;
  instructions: string;
  weightsInvolved: boolean;
  fitnessTargets: string[];
  fitnessAttributes: string[];
  tags: string[];
  tagInput: string;
  media: PTTrainingDraftMedia | null;
  error: string | null;
};

type RoutineDraftPublishDialogState = {
  draftId: string;
  selectedTargets: LocalPTRoutineDraftPublishTarget[];
  localFolderOptions: Array<{
    id: string;
    name: string;
  }>;
  folderPickerOpen: boolean;
  newFolderDialogOpen: boolean;
  newFolderName: string;
  newFolderError: string | null;
} | null;

type ExerciseDraftPublishDialogState = {
  draftId: string;
  selectedTargets: LocalPTRoutineDraftPublishTarget[];
  localFolderOptions: Array<{
    id: string;
    name: string;
  }>;
  folderPickerOpen: boolean;
  newFolderDialogOpen: boolean;
  newFolderName: string;
  newFolderError: string | null;
} | null;

type MediaPickerTargetState =
  | {
      kind: "exercise-draft";
    }
  | {
      kind: "routine-draft";
    }
  | {
      kind: "rep-asset-edit";
    }
  | {
      kind: "routine-row";
      rowId: string;
    }
  | null;

const EMPTY_SECTION_ERRORS: SectionErrors = {
  folders: null,
  packages: null,
  routines: null,
};
const PORTFOLIO_DIRECTORY_LIMIT = 5;
const SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_ID = "system-all-singular-exercises";
const SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_TITLE = "All Singular Exercises";
const TRAINING_IMAGE_MEDIA_MAX_BYTES = 2 * 1024 * 1024;
const TRAINING_VIDEO_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
const TRAINING_IMAGE_MEDIA_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const TRAINING_VIDEO_MEDIA_ACCEPT = "video/mp4,video/webm";

const BUILDER_OPTIONS: BuilderOption[] = [
  {
    kind: "exercise",
    badge: "Exercise",
    title: "Add an Exercise",
    copy: "Draft one reusable exercise movement.",
    className: "pt-training-builder-card--exercise",
  },
  {
    kind: "routine",
    badge: "Routine",
    title: "Create a Routine",
    copy: "Draft a structured routine with exercise goals.",
    className: "pt-training-builder-card--routine",
  },
];

const DEFAULT_FITNESS_TARGETS = [
  "Biceps",
  "Back",
  "Neck",
  "Triceps",
  "Achilles",
  "Knees",
  "Forearm",
  "Lats",
  "Quads",
  "Hands",
] as const;

const DEFAULT_FITNESS_ATTRIBUTES = [
  "Hand Eye Coordination",
  "Strength",
  "Endurance",
  "Vertical",
  "Speed",
  "Agility",
  "Heart Rate",
  "Elusiveness",
] as const;

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function TrainingStateCard({ title, message, action }: TrainingStateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

function matchesTrainingQuery(query: string, fields: Array<string | null | undefined>): boolean {
  if (!query) {
    return true;
  }

  return fields.some((field) => field?.toLowerCase().includes(query));
}

function PortfolioChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m8 10 4 4 4-4" />
    </svg>
  );
}

function FolderDirectoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l1.5 2h9A1.5 1.5 0 0 1 20.5 9.5v8A1.5 1.5 0 0 1 19 19H4.5A1.5 1.5 0 0 1 3 17.5z" />
    </svg>
  );
}

function ExerciseArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {direction === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

function sanitizeNumericInput(value: string) {
  return value.replace(/\D+/g, "");
}

function normalizeOptionValue(value: string) {
  return value.trim().toLowerCase();
}

function dedupeStringValues(values: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];

  values.forEach((value) => {
    const trimmed = value.trim();
    const normalized = normalizeOptionValue(trimmed);

    if (!trimmed || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    next.push(trimmed);
  });

  return next;
}

function formatSummaryList(values: string[]) {
  if (values.length === 0) {
    return "None selected";
  }

  if (values.length <= 3) {
    return values.join(", ");
  }

  return `${values.slice(0, 3).join(", ")} +${values.length - 3} more`;
}

function formatDraftTimestamp(value: string | undefined) {
  if (!value) {
    return "Unknown date";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatUpdatedLabel(value: string | undefined) {
  return `Updated ${formatDraftTimestamp(value)}`;
}

function dedupePublishTargets(targets: LocalPTRoutineDraftPublishTarget[]) {
  const seen = new Set<string>();
  const next: LocalPTRoutineDraftPublishTarget[] = [];

  targets.forEach((target) => {
    const name = target.name.trim();
    if (!name) {
      return;
    }

    const key = `${target.type}:${target.id?.trim() || normalizeOptionValue(name)}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    next.push({
      type: target.type,
      id: target.id?.trim() || undefined,
      name,
    });
  });

  return next;
}

function formatPublishTargetsSummary(targets: LocalPTRoutineDraftPublishTarget[]) {
  const names = dedupePublishTargets(targets).map((target) => target.name);

  if (names.length === 0) {
    return "Unassigned";
  }

  if (names.length <= 3) {
    return names.join(", ");
  }

  return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
}

function dedupeFolderEntityValues(values: string[]) {
  return dedupeStringValues(values);
}

function formatPortfolioAssetTypeLabel(type: LocalPTPortfolioAsset["type"]) {
  return type === "routine" ? "Routine" : "Rep";
}

function isImageMediaType(mimeType: string) {
  return ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mimeType);
}

function isVideoMediaType(mimeType: string) {
  return ["video/mp4", "video/webm"].includes(mimeType);
}

function formatMediaSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

function renderTrainingMediaPreview(media: PTTrainingDraftMedia, className: string) {
  if (media.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- local draft previews use data URLs.
      <img
        src={media.dataUrl}
        alt={media.name}
        className={className}
      />
    );
  }

  if (media.kind === "video") {
    return (
      <video className={className} controls preload="metadata">
        <source src={media.dataUrl} type={media.mimeType} />
      </video>
    );
  }

  return null;
}

function createSystemAllSingularExercisesFolder(
  existing?: Partial<LocalPTPortfolioFolder> | null,
): LocalPTPortfolioFolder {
  return createLocalPTPortfolioFolder({
    id: SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_ID,
    source: "system-local",
    title: SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_TITLE,
    thumbnailDataUrl: existing?.thumbnailDataUrl,
    color: existing?.color ?? "grey",
    tags: existing?.tags ?? [],
    assets: existing?.assets ?? [],
    exercises: [],
    pinned: existing?.pinned ?? false,
  });
}

function ensureAllSingularExercisesFolder(folders: LocalPTPortfolioFolder[]) {
  const existingFolder = folders.find(
    (folder) => folder.id === SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_ID,
  );

  if (existingFolder) {
    const nextFolder = createSystemAllSingularExercisesFolder(existingFolder);
    nextFolder.updatedAt = existingFolder.updatedAt;

    return {
      folders: folders.map((folder) =>
        folder.id === SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_ID ? nextFolder : folder,
      ),
      changed:
        existingFolder.source !== "system-local" ||
        existingFolder.title !== SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_TITLE,
    };
  }

  return {
    folders: [createSystemAllSingularExercisesFolder(), ...folders],
    changed: true,
  };
}

function readTrainingMediaFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error("Unable to read that file."));
    };
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read that file."));
    };
    reader.readAsDataURL(file);
  });
}

function createLegacyRepAsset(title: string, id?: string): LocalPTPortfolioAsset {
  return createLocalPTPortfolioRepAsset({
    id,
    title,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  });
}

function buildRoutineAssetFromDraft(
  draft: LocalPTRoutineDraft,
  updatedAt: string,
): LocalPTPortfolioAsset {
  return createLocalPTPortfolioRoutineAsset({
    title: draft.routineName,
    description: draft.description,
    fitnessTargets: draft.fitnessTargets,
    fitnessAttributes: draft.fitnessAttributes,
    tags: draft.tags,
    media: draft.media,
    timedByDuration: draft.timedByDuration,
    setAmount:
      typeof draft.setAmount === "number" && Number.isFinite(draft.setAmount)
        ? String(draft.setAmount)
        : undefined,
    exercises: draft.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseName: exercise.exerciseName,
      repGoal: typeof exercise.repGoal === "number" ? String(exercise.repGoal) : "",
      instructions: exercise.instructions,
      weightsInvolved: exercise.weightsInvolved,
      media: exercise.media,
    })),
    sourceDraftId: draft.id,
    createdAt: draft.createdAt,
    updatedAt,
  });
}

function buildRepAssetFromDraft(
  draft: LocalPTExerciseDraft,
  updatedAt: string,
): LocalPTPortfolioAsset {
  return createLocalPTPortfolioRepAsset({
    title: draft.title,
    exerciseName: draft.exerciseName,
    repGoal: typeof draft.repGoal === "number" ? String(draft.repGoal) : undefined,
    instructions: draft.instructions,
    weightsInvolved: draft.weightsInvolved,
    fitnessTargets: draft.fitnessTargets,
    fitnessAttributes: draft.fitnessAttributes,
    tags: draft.tags,
    media: draft.media,
    sourceDraftId: draft.id,
    createdAt: draft.createdAt,
    updatedAt,
  });
}

function assetSearchFields(asset: LocalPTPortfolioAsset) {
  if (asset.type === "routine") {
    return [
      asset.title,
      asset.description,
      ...asset.fitnessTargets,
      ...asset.fitnessAttributes,
      ...asset.tags,
      asset.media?.name,
      ...asset.exercises.flatMap((exercise) => [
        exercise.exerciseName,
        exercise.repGoal,
        exercise.instructions,
        exercise.media?.name,
      ]),
    ].filter((value): value is string => Boolean(value));
  }

  return [
    asset.title,
    asset.exerciseName,
    asset.repGoal,
    asset.description,
    asset.instructions,
    asset.objective,
    ...asset.fitnessTargets,
    ...asset.fitnessAttributes,
    ...asset.tags,
    asset.media?.name,
  ].filter((value): value is string => Boolean(value));
}

function dedupePortfolioAssets(assets: LocalPTPortfolioAsset[]) {
  const seen = new Set<string>();

  return assets.filter((asset) => {
    const key =
      asset.id ||
      asset.sourceDraftId ||
      `${asset.type}:${normalizeOptionValue(asset.title)}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createRoutineExerciseRow(): RoutineExerciseRow {
  return {
    id: createLocalPTDraftId(),
    exerciseName: "",
    repGoal: "",
    instructions: "",
    weightsInvolved: false,
    media: null,
  };
}

function appendUniquePortfolioAsset(
  assets: LocalPTPortfolioAsset[],
  asset: LocalPTPortfolioAsset,
) {
  const exists = assets.some((current) => {
    if (asset.sourceDraftId && current.sourceDraftId) {
      return current.sourceDraftId === asset.sourceDraftId;
    }

    return (
      current.type === asset.type &&
      normalizeOptionValue(current.title) === normalizeOptionValue(asset.title)
    );
  });

  return exists ? assets : [asset, ...assets];
}

function upsertPortfolioAsset(
  assets: LocalPTPortfolioAsset[],
  asset: LocalPTPortfolioAsset,
) {
  const existingIndex = assets.findIndex((current) => {
    if (asset.sourceDraftId && current.sourceDraftId) {
      return current.sourceDraftId === asset.sourceDraftId;
    }

    return current.id === asset.id;
  });

  if (existingIndex < 0) {
    return [asset, ...assets];
  }

  return assets.map((current, index) => (index === existingIndex ? asset : current));
}

function upsertRepAssetIntoAllSingularExercisesFolder(
  folders: LocalPTPortfolioFolder[],
  repAsset: LocalPTPortfolioAsset,
  updatedAt: string,
): LocalPTPortfolioFolder[] {
  const ensured = ensureAllSingularExercisesFolder(folders);

  return ensured.folders.map((folder) => {
    if (folder.id !== SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_ID) {
      return folder;
    }

    return {
      ...folder,
      source: "system-local",
      title: SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_TITLE,
      assets: upsertPortfolioAsset(
        folder.assets.filter((asset) => asset.type === "rep"),
        repAsset,
      ),
      exercises: [],
      updatedAt,
    };
  });
}

function findPublishTargetLocalFolderIndex(
  folders: LocalPTPortfolioFolder[],
  target: LocalPTRoutineDraftPublishTarget,
) {
  return folders.findIndex(
    (folder) =>
      folder.id !== SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_ID &&
      (folder.id === target.id ||
        normalizeOptionValue(folder.title) === normalizeOptionValue(target.name)),
  );
}

function removeLegacyRoutineExerciseStrings(
  exercises: string[],
  draft: LocalPTRoutineDraft,
) {
  const routineExerciseNames = new Set(
    draft.exercises.map((exercise) => normalizeOptionValue(exercise.exerciseName)).filter(Boolean),
  );

  if (routineExerciseNames.size === 0) {
    return exercises;
  }

  return exercises.filter((exercise) => !routineExerciseNames.has(normalizeOptionValue(exercise)));
}

function repairPublishedRoutineDraftAssets(input: {
  localFolders: LocalPTPortfolioFolder[];
  folderOverlays: LocalPTPortfolioFolderOverlay[];
  routineDrafts: LocalPTRoutineDraft[];
}) {
  let changed = false;
  let nextLocalFolders = [...input.localFolders];
  let nextOverlays = [...input.folderOverlays];
  const remainingDrafts: LocalPTRoutineDraft[] = [];

  input.routineDrafts.forEach((draft) => {
    const targets = dedupePublishTargets(draft.publishTargets ?? []);
    if (draft.publishStatus !== "ready" || targets.length === 0) {
      remainingDrafts.push(draft);
      return;
    }

    const routineAsset = buildRoutineAssetFromDraft(draft, new Date().toISOString());
    let assetPlaced = false;

    targets.forEach((target) => {
      const localFolderIndex = findPublishTargetLocalFolderIndex(nextLocalFolders, target);
      if (localFolderIndex >= 0) {
        const folder = nextLocalFolders[localFolderIndex];
        const nextAssets = appendUniquePortfolioAsset(folder.assets, routineAsset);
        if (nextAssets !== folder.assets) {
          nextLocalFolders[localFolderIndex] = {
            ...folder,
            source: folder.source,
            title: target.name.trim() || folder.title,
            assets: nextAssets,
            exercises: removeLegacyRoutineExerciseStrings(folder.exercises, draft),
            updatedAt: routineAsset.updatedAt,
          };
          changed = true;
        }
        assetPlaced = true;
        return;
      }

      if (target.type === "existing-folder" && target.id) {
        const overlayIndex = nextOverlays.findIndex((overlay) => overlay.id === target.id);
        if (overlayIndex >= 0) {
          const overlay = nextOverlays[overlayIndex];
          const nextAssets = appendUniquePortfolioAsset(overlay.assets, routineAsset);
          if (nextAssets !== overlay.assets) {
            nextOverlays[overlayIndex] = {
              ...overlay,
              assets: nextAssets,
              exercises: removeLegacyRoutineExerciseStrings(overlay.exercises, draft),
              updatedAt: routineAsset.updatedAt,
            };
            changed = true;
          }
          assetPlaced = true;
          return;
        }

        nextOverlays = [
          {
            id: target.id,
            source: "bff",
            updatedAt: routineAsset.updatedAt,
            color: "grey",
            tags: [],
            assets: [routineAsset],
            exercises: [],
          },
          ...nextOverlays,
        ];
        assetPlaced = true;
        changed = true;
        return;
      }

      nextLocalFolders = [
        createLocalPTPortfolioFolder({
          title: target.name,
          assets: [routineAsset],
          exercises: [],
          tags: [],
        }),
        ...nextLocalFolders,
      ];
      assetPlaced = true;
      changed = true;
    });

    if (!assetPlaced) {
      remainingDrafts.push(draft);
      return;
    }

    changed = true;
  });

  return {
    changed,
    localFolders: nextLocalFolders,
    folderOverlays: nextOverlays,
    routineDrafts: remainingDrafts,
  };
}

export default function PTTrainingPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [foldersData, setFoldersData] = useState<JsonValue | null>(null);
  const [packagesData, setPackagesData] = useState<JsonValue | null>(null);
  const [routinesData, setRoutinesData] = useState<JsonValue | null>(null);
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>(EMPTY_SECTION_ERRORS);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [localPortfolioFolders, setLocalPortfolioFolders] = useState<LocalPTPortfolioFolder[]>([]);
  const [portfolioFolderOverlays, setPortfolioFolderOverlays] = useState<LocalPTPortfolioFolderOverlay[]>([]);
  const [portfolioDisplayMode, setPortfolioDisplayMode] =
    useState<LocalPTPortfolioDisplayMode>("recent");
  const [pinnedPortfolioFolderIds, setPinnedPortfolioFolderIds] = useState<string[]>([]);
  const [portfolioDisplayDialogOpen, setPortfolioDisplayDialogOpen] = useState(false);
  const [portfolioCreateFolderOpen, setPortfolioCreateFolderOpen] = useState(false);
  const [portfolioNewFolderName, setPortfolioNewFolderName] = useState("");
  const [portfolioDisplayError, setPortfolioDisplayError] = useState<string | null>(null);
  const [selectedPortfolioFolderId, setSelectedPortfolioFolderId] = useState<string | null>(null);
  const [selectedPortfolioAsset, setSelectedPortfolioAsset] = useState<SelectedPortfolioAssetState>(null);
  const [portfolioFolderDetailEditMode, setPortfolioFolderDetailEditMode] = useState(false);
  const [portfolioFolderEditForm, setPortfolioFolderEditForm] = useState<PortfolioFolderEditForm | null>(null);
  const [exerciseDrafts, setExerciseDrafts] = useState<LocalPTExerciseDraft[]>([]);
  const [routineDrafts, setRoutineDrafts] = useState<LocalPTRoutineDraft[]>([]);
  const [routineDraftQueueOpen, setRoutineDraftQueueOpen] = useState(false);
  const [customFitnessTargets, setCustomFitnessTargets] = useState<string[]>([]);
  const [customFitnessAttributes, setCustomFitnessAttributes] = useState<string[]>([]);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [editingExerciseDraftId, setEditingExerciseDraftId] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseInstructions, setExerciseInstructions] = useState("");
  const [exerciseWeightsInvolved, setExerciseWeightsInvolved] = useState(false);
  const [exerciseFitnessTargets, setExerciseFitnessTargets] = useState<string[]>([]);
  const [exerciseFitnessAttributes, setExerciseFitnessAttributes] = useState<string[]>([]);
  const [exerciseTags, setExerciseTags] = useState<string[]>([]);
  const [exerciseTagInput, setExerciseTagInput] = useState("");
  const [exerciseMedia, setExerciseMedia] = useState<PTTrainingDraftMedia | null>(null);
  const [exerciseErrors, setExerciseErrors] = useState<ExerciseFormErrors>({});
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [routineDialogPage, setRoutineDialogPage] = useState<"details" | "exercises">("details");
  const [editingRoutineDraftId, setEditingRoutineDraftId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState("");
  const [routineDescription, setRoutineDescription] = useState("");
  const [fitnessTargets, setFitnessTargets] = useState<string[]>([]);
  const [fitnessAttributes, setFitnessAttributes] = useState<string[]>([]);
  const [routineTags, setRoutineTags] = useState<string[]>([]);
  const [routineTagInput, setRoutineTagInput] = useState("");
  const [routineMedia, setRoutineMedia] = useState<PTTrainingDraftMedia | null>(null);
  const [timedByDuration, setTimedByDuration] = useState(false);
  const [routineRows, setRoutineRows] = useState<RoutineExerciseRow[]>([createRoutineExerciseRow()]);
  const [activeRoutineExerciseIndex, setActiveRoutineExerciseIndex] = useState(0);
  const [routineDetailsErrors, setRoutineDetailsErrors] = useState<RoutineDetailsErrors>({});
  const [routineRowErrors, setRoutineRowErrors] = useState<Record<string, RoutineExerciseRowErrors>>(
    {},
  );
  const [routineOptionDialogKind, setRoutineOptionDialogKind] = useState<FitnessOptionDialogState>(null);
  const [routineOptionValue, setRoutineOptionValue] = useState("");
  const [routineOptionError, setRoutineOptionError] = useState<string | null>(null);
  const [exerciseDraftToRemove, setExerciseDraftToRemove] = useState<LocalPTExerciseDraft | null>(null);
  const [exerciseDraftPublishDialog, setExerciseDraftPublishDialog] =
    useState<ExerciseDraftPublishDialogState>(null);
  const [exerciseDraftPublishError, setExerciseDraftPublishError] = useState<string | null>(null);
  const [portfolioRepAssetEditForm, setPortfolioRepAssetEditForm] = useState<RepAssetEditForm | null>(null);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<MediaPickerTargetState>(null);
  const [mediaPickerError, setMediaPickerError] = useState<string | null>(null);
  const [routineDraftToRemove, setRoutineDraftToRemove] = useState<LocalPTRoutineDraft | null>(null);
  const [routineDraftPublishDialog, setRoutineDraftPublishDialog] =
    useState<RoutineDraftPublishDialogState>(null);
  const [routineDraftPublishError, setRoutineDraftPublishError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchValue);

  useEffect(() => {
    const ensuredFolders = ensureAllSingularExercisesFolder(readLocalPTPortfolioFolders());
    const storedOverlays = readLocalPTPortfolioFolderOverlays();
    const storedRoutineDrafts = readLocalPTRoutineDrafts();
    const repaired = repairPublishedRoutineDraftAssets({
      localFolders: ensuredFolders.folders,
      folderOverlays: storedOverlays,
      routineDrafts: storedRoutineDrafts,
    });

    setLocalPortfolioFolders(repaired.localFolders);
    setPortfolioFolderOverlays(repaired.folderOverlays);
    setPortfolioDisplayMode(readLocalPTPortfolioDisplayMode());
    setPinnedPortfolioFolderIds(readLocalPTPinnedPortfolioFolders());
    setExerciseDrafts(readLocalPTExerciseDrafts());
    setRoutineDrafts(repaired.routineDrafts);
    setCustomFitnessTargets(readLocalPTCustomFitnessTargets());
    setCustomFitnessAttributes(readLocalPTCustomFitnessAttributes());

    if (repaired.changed || ensuredFolders.changed) {
      writeLocalPTPortfolioFolders(repaired.localFolders);
      writeLocalPTPortfolioFolderOverlays(repaired.folderOverlays);
      writeLocalPTRoutineDrafts(repaired.routineDrafts);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setSectionErrors(EMPTY_SECTION_ERRORS);

      try {
        const [foldersResponse, packagesResponse, routinesResponse] = await Promise.all([
          fetch("/api/pt/folders", { cache: "no-store" }),
          fetch("/api/pt/packages", { cache: "no-store" }),
          fetch("/api/pt/routines", { cache: "no-store" }),
        ]);

        const [foldersPayload, packagesPayload, routinesPayload] = (await Promise.all([
          foldersResponse.json(),
          packagesResponse.json(),
          routinesResponse.json(),
        ])) as [PTTrainingApiResponse, PTTrainingApiResponse, PTTrainingApiResponse];

        if (!active) {
          return;
        }

        const nextErrors: SectionErrors = { ...EMPTY_SECTION_ERRORS };

        if (foldersPayload.ok) {
          setFoldersData(foldersPayload.data);
        } else {
          nextErrors.folders = foldersPayload.error.message ?? "Unable to load PT folders.";
          setFoldersData(null);
        }

        if (packagesPayload.ok) {
          setPackagesData(packagesPayload.data);
        } else {
          nextErrors.packages = packagesPayload.error.message ?? "Unable to load PT packages.";
          setPackagesData(null);
        }

        if (routinesPayload.ok) {
          setRoutinesData(routinesPayload.data);
        } else {
          nextErrors.routines = routinesPayload.error.message ?? "Unable to load PT routines.";
          setRoutinesData(null);
        }

        setSectionErrors(nextErrors);
      } catch {
        if (!active) {
          return;
        }

        setFoldersData(null);
        setPackagesData(null);
        setRoutinesData(null);
        setSectionErrors({
          folders: "Unable to load PT folders.",
          packages: "Unable to load PT packages.",
          routines: "Unable to load PT routines.",
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [status, user]);

  useEffect(() => {
    if (
      !portfolioDisplayDialogOpen &&
      !selectedPortfolioFolderId &&
      !selectedPortfolioAsset &&
      !portfolioRepAssetEditForm &&
      !exerciseDialogOpen &&
      !routineDialogOpen &&
      !routineOptionDialogKind &&
      !exerciseDraftToRemove &&
      !exerciseDraftPublishDialog &&
      !routineDraftToRemove &&
      !routineDraftPublishDialog
    ) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (routineOptionDialogKind) {
        setRoutineOptionDialogKind(null);
        setRoutineOptionValue("");
        setRoutineOptionError(null);
        return;
      }

      if (exerciseDraftPublishDialog) {
        if (exerciseDraftPublishDialog.newFolderDialogOpen) {
          setExerciseDraftPublishDialog({
            ...exerciseDraftPublishDialog,
            newFolderDialogOpen: false,
            newFolderName: "",
            newFolderError: null,
          });
          return;
        }

        if (exerciseDraftPublishDialog.folderPickerOpen) {
          setExerciseDraftPublishDialog({
            ...exerciseDraftPublishDialog,
            folderPickerOpen: false,
            newFolderDialogOpen: false,
            newFolderName: "",
            newFolderError: null,
          });
          return;
        }

        setExerciseDraftPublishDialog(null);
        setExerciseDraftPublishError(null);
        return;
      }

      if (mediaPickerTarget) {
        setMediaPickerTarget(null);
        setMediaPickerError(null);
        return;
      }

      if (routineDraftPublishDialog) {
        if (routineDraftPublishDialog.newFolderDialogOpen) {
          setRoutineDraftPublishDialog({
            ...routineDraftPublishDialog,
            newFolderDialogOpen: false,
            newFolderName: "",
            newFolderError: null,
          });
          return;
        }

        if (routineDraftPublishDialog.folderPickerOpen) {
          setRoutineDraftPublishDialog({
            ...routineDraftPublishDialog,
            folderPickerOpen: false,
            newFolderDialogOpen: false,
            newFolderName: "",
            newFolderError: null,
          });
          return;
        }

        setRoutineDraftPublishDialog(null);
        setRoutineDraftPublishError(null);
        return;
      }

      if (exerciseDraftToRemove) {
        setExerciseDraftToRemove(null);
        return;
      }

      if (routineDraftToRemove) {
        setRoutineDraftToRemove(null);
        return;
      }

      setPortfolioDisplayDialogOpen(false);
      setPortfolioCreateFolderOpen(false);
      setPortfolioNewFolderName("");
      setPortfolioDisplayError(null);
      setSelectedPortfolioAsset(null);
      setSelectedPortfolioFolderId(null);
      setPortfolioFolderDetailEditMode(false);
      setPortfolioFolderEditForm(null);
      setPortfolioRepAssetEditForm(null);
      setExerciseDialogOpen(false);
      setEditingExerciseDraftId(null);
      setExerciseName("");
      setExerciseInstructions("");
      setExerciseWeightsInvolved(false);
      setExerciseFitnessTargets([]);
      setExerciseFitnessAttributes([]);
      setExerciseTags([]);
      setExerciseTagInput("");
      setExerciseMedia(null);
      setExerciseErrors({});
      setRoutineDialogOpen(false);
      setRoutineDialogPage("details");
      setEditingRoutineDraftId(null);
      setRoutineName("");
      setRoutineDescription("");
      setFitnessTargets([]);
      setFitnessAttributes([]);
      setRoutineTags([]);
      setRoutineTagInput("");
      setRoutineMedia(null);
      setTimedByDuration(false);
      setRoutineRows([createRoutineExerciseRow()]);
      setActiveRoutineExerciseIndex(0);
      setRoutineDetailsErrors({});
      setRoutineRowErrors({});
      setRoutineOptionDialogKind(null);
      setRoutineOptionValue("");
      setRoutineOptionError(null);
      setMediaPickerTarget(null);
      setMediaPickerError(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    portfolioDisplayDialogOpen,
    selectedPortfolioFolderId,
    selectedPortfolioAsset,
    portfolioRepAssetEditForm,
    exerciseDialogOpen,
    routineDialogOpen,
    routineOptionDialogKind,
    exerciseDraftPublishDialog,
    exerciseDraftToRemove,
    mediaPickerTarget,
    routineDraftPublishDialog,
    routineDraftToRemove,
  ]);

  const view = useMemo(
    () =>
      adaptPTTrainingView({
        folders: foldersData,
        packages: packagesData,
        routines: routinesData,
        selectedFolderId: null,
      }),
    [foldersData, packagesData, routinesData],
  );

  const query = deferredSearch.trim().toLowerCase();
  const hasSearchValue = query.length > 0;
  const partialErrorMessages = Object.values(sectionErrors).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  const detailErrorMessages = [sectionErrors.packages, sectionErrors.routines].filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  const showLoadingState = loading && !view.hasAnyData && partialErrorMessages.length === 0;
  const allSectionsFailed = !loading && !view.hasAnyData && partialErrorMessages.length === 3;

  const fitnessTargetOptions = useMemo(
    () => dedupeStringValues([...DEFAULT_FITNESS_TARGETS, ...customFitnessTargets]),
    [customFitnessTargets],
  );

  const fitnessAttributeOptions = useMemo(
    () => dedupeStringValues([...DEFAULT_FITNESS_ATTRIBUTES, ...customFitnessAttributes]),
    [customFitnessAttributes],
  );

  const portfolioDirectoryFolders = useMemo<PortfolioDirectoryFolder[]>(() => {
    const overlayMap = new Map(portfolioFolderOverlays.map((overlay) => [overlay.id, overlay]));

    const bffFolders = view.folderTiles.map((folder, index) => {
      const overlay = overlayMap.get(folder.id);
      const legacyAssets = [
        ...view.packageCards
          .filter((item) => item.folderId === folder.id)
          .map((item) =>
            createLocalPTPortfolioRepAsset({
              id: `package:${item.id}`,
              title: item.title,
              description: item.description,
              createdAt: new Date(Date.now() - index * 60_000).toISOString(),
              updatedAt: new Date(Date.now() - index * 60_000).toISOString(),
            }),
          ),
        ...view.routineCards
          .filter((item) => item.folderId === folder.id)
          .map((item) =>
            createLocalPTPortfolioRoutineAsset({
              id: `routine:${item.id}`,
              title: item.title,
              description: item.description,
              createdAt: new Date(Date.now() - index * 60_000).toISOString(),
              updatedAt: new Date(Date.now() - index * 60_000).toISOString(),
            }),
          ),
        ...(overlay?.exercises ?? []).map((exercise) =>
          createLegacyRepAsset(exercise, `overlay:${folder.id}:${normalizeOptionValue(exercise)}`),
        ),
      ];
      const assets = dedupePortfolioAssets([...(overlay?.assets ?? []), ...legacyAssets]);
      const exercises = dedupeFolderEntityValues(
        assets.flatMap((asset) =>
          asset.type === "routine"
            ? asset.exercises.map((exercise) => exercise.exerciseName)
            : [asset.title],
        ),
      );
      const searchFields = [
        folder.title,
        folder.description,
        ...(overlay?.tags ?? []),
        ...assets.flatMap((asset) => assetSearchFields(asset)),
      ].filter((value): value is string => Boolean(value));

      return {
        id: folder.id,
        source: "bff" as const,
        title: folder.title,
        description: folder.description,
        updatedAt: overlay?.updatedAt ?? new Date(Date.now() - index * 60_000).toISOString(),
        thumbnailDataUrl: overlay?.thumbnailDataUrl,
        color: overlay?.color ?? "grey",
        tags: overlay?.tags ?? [],
        assets,
        exercises,
        routines: assets
          .filter((asset) => asset.type === "routine")
          .map((asset) => asset.title),
        searchFields,
      };
    });

    const localFolders = localPortfolioFolders.map((folder) => {
      const legacyAssets = folder.exercises.map((exercise) =>
        createLegacyRepAsset(exercise, `local:${folder.id}:${normalizeOptionValue(exercise)}`),
      );
      const assets = dedupePortfolioAssets([...folder.assets, ...legacyAssets]);
      const exercises = dedupeFolderEntityValues(
        assets.flatMap((asset) =>
          asset.type === "routine"
            ? asset.exercises.map((exercise) => exercise.exerciseName)
            : [asset.title],
        ),
      );

      return {
        id: folder.id,
        source: folder.source,
        title: folder.title,
        description:
          folder.source === "system-local"
            ? "Local system folder that collects singular Rep assets."
            : "Stored locally until PT folder save routes are wired.",
        updatedAt: folder.updatedAt,
        thumbnailDataUrl: folder.thumbnailDataUrl,
        color: folder.color ?? "grey",
        tags: folder.tags,
        assets,
        exercises,
        routines: assets
          .filter((asset) => asset.type === "routine")
          .map((asset) => asset.title),
        searchFields: [
          folder.title,
          ...folder.tags,
          ...assets.flatMap((asset) => assetSearchFields(asset)),
        ].filter((value): value is string => Boolean(value)),
      };
    });

    return [...localFolders, ...bffFolders];
  }, [localPortfolioFolders, portfolioFolderOverlays, view.folderTiles, view.packageCards, view.routineCards]);

  const filteredPortfolioFolders = hasSearchValue
    ? portfolioDirectoryFolders.filter((folder) => matchesTrainingQuery(query, folder.searchFields))
    : portfolioDirectoryFolders;

  const displayedPortfolioFolders = useMemo(() => {
    const limitedSource = hasSearchValue
      ? filteredPortfolioFolders
      : portfolioDisplayMode === "pinned"
        ? filteredPortfolioFolders.filter((folder) => pinnedPortfolioFolderIds.includes(folder.id))
        : [...filteredPortfolioFolders].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
    const limitedFolders = limitedSource.slice(0, PORTFOLIO_DIRECTORY_LIMIT);
    const systemFolder = filteredPortfolioFolders.find(
      (folder) => folder.id === SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_ID,
    );

    if (
      !systemFolder ||
      limitedFolders.some((folder) => folder.id === SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_ID)
    ) {
      return limitedFolders;
    }

    return [
      systemFolder,
      ...limitedFolders.filter((folder) => folder.id !== SYSTEM_ALL_SINGULAR_EXERCISES_FOLDER_ID),
    ].slice(0, PORTFOLIO_DIRECTORY_LIMIT);
  }, [filteredPortfolioFolders, hasSearchValue, pinnedPortfolioFolderIds, portfolioDisplayMode]);

  const publishablePortfolioFolderOptions = useMemo(
    () =>
      portfolioDirectoryFolders
        .filter((folder) => folder.source !== "system-local")
        .map((folder) => ({
        id: folder.id,
        title: folder.title,
      })),
    [portfolioDirectoryFolders],
  );

  const exerciseNameSuggestions = useMemo(
    () =>
      dedupeStringValues([
        ...exerciseDrafts.map((draft) => draft.exerciseName),
        ...routineDrafts.flatMap((draft) => draft.exercises.map((exercise) => exercise.exerciseName)),
        ...portfolioDirectoryFolders.flatMap((folder) =>
          folder.assets.flatMap((asset) =>
            asset.type === "routine"
              ? asset.exercises.map((exercise) => exercise.exerciseName)
              : [asset.exerciseName ?? asset.title],
          ),
        ),
        ...view.packageCards.map((item) => item.title),
        ...view.routineCards.map((item) => item.title),
        ...routineRows.map((row) => row.exerciseName),
        exerciseName,
      ]),
    [
      exerciseDrafts,
      exerciseName,
      portfolioDirectoryFolders,
      routineDrafts,
      routineRows,
      view.packageCards,
      view.routineCards,
    ],
  );

  const activeRoutineRow = routineRows[activeRoutineExerciseIndex] ?? null;
  const isRoutineEditMode = editingRoutineDraftId !== null;
  const selectedPortfolioFolder =
    selectedPortfolioFolderId !== null
      ? portfolioDirectoryFolders.find((folder) => folder.id === selectedPortfolioFolderId) ?? null
      : null;
  const selectedPortfolioAssetRecord =
    selectedPortfolioFolder &&
    selectedPortfolioAsset &&
    selectedPortfolioAsset.folderId === selectedPortfolioFolder.id
      ? selectedPortfolioFolder.assets.find((asset) => asset.id === selectedPortfolioAsset.assetId) ?? null
      : null;
  const publishingExerciseDraft = exerciseDraftPublishDialog
    ? exerciseDrafts.find((draft) => draft.id === exerciseDraftPublishDialog.draftId) ?? null
    : null;
  const publishingRoutineDraft = routineDraftPublishDialog
    ? routineDrafts.find((draft) => draft.id === routineDraftPublishDialog.draftId) ?? null
    : null;
  const totalDraftCount = exerciseDrafts.length + routineDrafts.length;
  const selectedMediaPreview = selectedMediaForPicker();

  useEffect(() => {
    if (activeRoutineExerciseIndex <= routineRows.length - 1) {
      return;
    }

    setActiveRoutineExerciseIndex(Math.max(0, routineRows.length - 1));
  }, [activeRoutineExerciseIndex, routineRows.length]);

  function closePortfolioDisplayDialog() {
    setPortfolioDisplayDialogOpen(false);
    setPortfolioCreateFolderOpen(false);
    setPortfolioNewFolderName("");
    setPortfolioDisplayError(null);
  }

  function handlePortfolioDisplayModeChange(mode: LocalPTPortfolioDisplayMode) {
    setPortfolioDisplayMode(mode);
    writeLocalPTPortfolioDisplayMode(mode);
    setPortfolioDisplayError(null);
  }

  function togglePinnedPortfolioFolder(folderId: string) {
    setPinnedPortfolioFolderIds((current) => {
      if (current.includes(folderId)) {
        const next = current.filter((item) => item !== folderId);
        writeLocalPTPinnedPortfolioFolders(next);
        const nextLocalFolders = localPortfolioFolders.map((folder) =>
          folder.id === folderId ? { ...folder, pinned: false } : folder,
        );
        setLocalPortfolioFolders(nextLocalFolders);
        writeLocalPTPortfolioFolders(nextLocalFolders);
        setPortfolioDisplayError(null);
        return next;
      }

      if (current.length >= PORTFOLIO_DIRECTORY_LIMIT) {
        setPortfolioDisplayError("Pin up to 5 folders.");
        return current;
      }

      const next = [...current, folderId];
      writeLocalPTPinnedPortfolioFolders(next);
      const nextLocalFolders = localPortfolioFolders.map((folder) =>
        folder.id === folderId ? { ...folder, pinned: true } : folder,
      );
      setLocalPortfolioFolders(nextLocalFolders);
      writeLocalPTPortfolioFolders(nextLocalFolders);
      setPortfolioDisplayError(null);
      return next;
    });
  }

  function handleCreatePortfolioFolder() {
    const title = portfolioNewFolderName.trim();
    if (!title) {
      setPortfolioDisplayError("Folder name is required.");
      return;
    }

    const existingTitles = portfolioDirectoryFolders.map((folder) => normalizeOptionValue(folder.title));
    if (existingTitles.includes(normalizeOptionValue(title))) {
      setPortfolioDisplayError("That portfolio folder already exists.");
      return;
    }

    const nextFolder = createLocalPTPortfolioFolder({
      title,
      exercises: [],
      tags: [],
    });
    const nextFolders = [nextFolder, ...localPortfolioFolders];
    setLocalPortfolioFolders(nextFolders);
    writeLocalPTPortfolioFolders(nextFolders);
    setPortfolioNewFolderName("");
    setPortfolioCreateFolderOpen(false);
    setPortfolioDisplayError(null);
  }

  function openPortfolioFolderDetail(folderId: string) {
    setSelectedPortfolioAsset(null);
    setSelectedPortfolioFolderId(folderId);
    setPortfolioFolderDetailEditMode(false);
    setPortfolioFolderEditForm(null);
    setPortfolioRepAssetEditForm(null);
  }

  function closePortfolioFolderDetail() {
    setSelectedPortfolioAsset(null);
    setSelectedPortfolioFolderId(null);
    setPortfolioFolderDetailEditMode(false);
    setPortfolioFolderEditForm(null);
    setPortfolioRepAssetEditForm(null);
  }

  function openPortfolioFolderEditMode() {
    if (!selectedPortfolioFolder || selectedPortfolioFolder.source === "system-local") {
      return;
    }

    setPortfolioFolderDetailEditMode(true);
    setPortfolioFolderEditForm({
      title: selectedPortfolioFolder.title,
      thumbnailDataUrl: selectedPortfolioFolder.thumbnailDataUrl,
      color: selectedPortfolioFolder.color,
      tags: [...selectedPortfolioFolder.tags],
      tagInput: "",
      assets: [...selectedPortfolioFolder.assets],
      exerciseInput: "",
      error: null,
      thumbnailError: null,
    });
  }

  function closePortfolioFolderEditMode() {
    setPortfolioFolderDetailEditMode(false);
    setPortfolioFolderEditForm(null);
  }

  function openPortfolioAssetDetail(folderId: string, assetId: string) {
    setPortfolioRepAssetEditForm(null);
    setSelectedPortfolioAsset({
      folderId,
      assetId,
    });
  }

  function closePortfolioAssetDetail() {
    setPortfolioRepAssetEditForm(null);
    setSelectedPortfolioAsset(null);
  }

  function updatePortfolioFolderEditForm(
    updater: (current: PortfolioFolderEditForm) => PortfolioFolderEditForm,
  ) {
    setPortfolioFolderEditForm((current) => (current ? updater(current) : current));
  }

  function handlePortfolioFolderThumbnailChange(file: File | null) {
    if (!file) {
      return;
    }

    if (file.size > 1_000_000) {
      updatePortfolioFolderEditForm((current) => ({
        ...current,
        thumbnailError: "Thumbnail must be 1 MB or smaller.",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : undefined;
      updatePortfolioFolderEditForm((current) => ({
        ...current,
        thumbnailDataUrl: dataUrl,
        thumbnailError: null,
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleAddPortfolioFolderTag() {
    if (!portfolioFolderEditForm) {
      return;
    }

    const tag = portfolioFolderEditForm.tagInput.trim();
    if (!tag) {
      return;
    }

    updatePortfolioFolderEditForm((current) => ({
      ...current,
      tags: dedupeStringValues([...current.tags, tag]),
      tagInput: "",
      error: null,
    }));
  }

  function handleAddPortfolioFolderExercise() {
    if (!portfolioFolderEditForm) {
      return;
    }

    const assetTitle = portfolioFolderEditForm.exerciseInput.trim();
    if (!assetTitle) {
      return;
    }

    updatePortfolioFolderEditForm((current) => ({
      ...current,
      assets: appendUniquePortfolioAsset(
        current.assets,
        createLocalPTPortfolioRepAsset({
          title: assetTitle,
        }),
      ),
      exerciseInput: "",
      error: null,
    }));
  }

  function handleSavePortfolioFolderChanges() {
    if (!selectedPortfolioFolder || !portfolioFolderEditForm) {
      return;
    }

    const title = portfolioFolderEditForm.title.trim();
    if (!title) {
      updatePortfolioFolderEditForm((current) => ({
        ...current,
        error: "Folder title is required.",
      }));
      return;
    }

    if (selectedPortfolioFolder.source !== "bff") {
      const nextFolders = localPortfolioFolders.map((folder) =>
        folder.id === selectedPortfolioFolder.id
          ? {
              ...folder,
              title,
              thumbnailDataUrl: portfolioFolderEditForm.thumbnailDataUrl,
              color: portfolioFolderEditForm.color,
              tags: portfolioFolderEditForm.tags,
              assets: portfolioFolderEditForm.assets,
              exercises: [],
              updatedAt: new Date().toISOString(),
            }
          : folder,
      );
      setLocalPortfolioFolders(nextFolders);
      writeLocalPTPortfolioFolders(nextFolders);
    } else {
      const existingOverlay = portfolioFolderOverlays.find((overlay) => overlay.id === selectedPortfolioFolder.id);
      const nextOverlay: LocalPTPortfolioFolderOverlay = {
        id: selectedPortfolioFolder.id,
        source: "bff",
        updatedAt: new Date().toISOString(),
        thumbnailDataUrl: portfolioFolderEditForm.thumbnailDataUrl,
        color: portfolioFolderEditForm.color,
        tags: portfolioFolderEditForm.tags,
        assets: portfolioFolderEditForm.assets,
        exercises: [],
      };
      const nextOverlays = existingOverlay
        ? portfolioFolderOverlays.map((overlay) =>
            overlay.id === selectedPortfolioFolder.id ? nextOverlay : overlay,
          )
        : [nextOverlay, ...portfolioFolderOverlays];
      setPortfolioFolderOverlays(nextOverlays);
      writeLocalPTPortfolioFolderOverlays(nextOverlays);
    }

    setPortfolioFolderDetailEditMode(false);
    setPortfolioFolderEditForm(null);
  }

  function openExerciseDialog() {
    setEditingExerciseDraftId(null);
    setExerciseName("");
    setExerciseInstructions("");
    setExerciseWeightsInvolved(false);
    setExerciseFitnessTargets([]);
    setExerciseFitnessAttributes([]);
    setExerciseTags([]);
    setExerciseTagInput("");
    setExerciseMedia(null);
    setExerciseErrors({});
    setExerciseDialogOpen(true);
  }

  function closeExerciseDialog() {
    setExerciseDialogOpen(false);
    setEditingExerciseDraftId(null);
    setExerciseName("");
    setExerciseInstructions("");
    setExerciseWeightsInvolved(false);
    setExerciseFitnessTargets([]);
    setExerciseFitnessAttributes([]);
    setExerciseTags([]);
    setExerciseTagInput("");
    setExerciseMedia(null);
    setExerciseErrors({});
  }

  function openExerciseDraftForEdit(draft: LocalPTExerciseDraft) {
    setExerciseDialogOpen(true);
    setEditingExerciseDraftId(draft.id);
    setExerciseName(draft.exerciseName);
    setExerciseInstructions(draft.instructions);
    setExerciseWeightsInvolved(draft.weightsInvolved);
    setExerciseFitnessTargets(draft.fitnessTargets);
    setExerciseFitnessAttributes(draft.fitnessAttributes);
    setExerciseTags(draft.tags);
    setExerciseTagInput("");
    setExerciseMedia(draft.media ?? null);
    setExerciseErrors({});
  }

  function buildExerciseDraft(existingDraft: LocalPTExerciseDraft | null) {
    return createLocalPTExerciseDraft({
      id: existingDraft?.id,
      title: exerciseName,
      exerciseName,
      repGoal: existingDraft?.repGoal,
      instructions: exerciseInstructions,
      weightsInvolved: exerciseWeightsInvolved,
      fitnessTargets: exerciseFitnessTargets,
      fitnessAttributes: exerciseFitnessAttributes,
      tags: exerciseTags,
      media: exerciseMedia,
      createdAt: existingDraft?.createdAt,
      editedAt: new Date().toISOString(),
    });
  }

  function handleAddExerciseTag() {
    const trimmed = exerciseTagInput.trim();
    if (!trimmed) {
      return;
    }

    setExerciseTags((current) => dedupeStringValues([...current, trimmed]));
    setExerciseTagInput("");
  }

  function removeExerciseTag(tag: string) {
    setExerciseTags((current) =>
      current.filter((item) => normalizeOptionValue(item) !== normalizeOptionValue(tag)),
    );
  }

  function saveExerciseDraftRecord(nextDraft: LocalPTExerciseDraft) {
    const nextDrafts = exerciseDrafts.some((draft) => draft.id === nextDraft.id)
      ? exerciseDrafts.map((draft) => (draft.id === nextDraft.id ? nextDraft : draft))
      : [nextDraft, ...exerciseDrafts];
    const updatedAt = nextDraft.editedAt ?? nextDraft.createdAt;
    const nextRepAsset = buildRepAssetFromDraft(nextDraft, updatedAt);
    const nextFolders = upsertRepAssetIntoAllSingularExercisesFolder(
      localPortfolioFolders,
      nextRepAsset,
      updatedAt,
    );

    setLocalPortfolioFolders(nextFolders);
    writeLocalPTPortfolioFolders(nextFolders);
    setExerciseDrafts(nextDrafts);
    writeLocalPTExerciseDrafts(nextDrafts);
  }

  function handleSaveExerciseDraft() {
    const nextErrors: ExerciseFormErrors = {};

    if (exerciseName.trim().length === 0) {
      nextErrors.exerciseName = "Exercise is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setExerciseErrors(nextErrors);
      return;
    }

    const existingDraft =
      editingExerciseDraftId !== null
        ? exerciseDrafts.find((draft) => draft.id === editingExerciseDraftId) ?? null
        : null;
    const nextDraft = buildExerciseDraft(existingDraft);
    saveExerciseDraftRecord(nextDraft);
    closeExerciseDialog();
  }

  function removeExerciseDraft(draftId: string) {
    const nextDrafts = exerciseDrafts.filter((draft) => draft.id !== draftId);
    setExerciseDrafts(nextDrafts);
    writeLocalPTExerciseDrafts(nextDrafts);

    if (editingExerciseDraftId === draftId) {
      closeExerciseDialog();
    }

    if (nextDrafts.length === 0 && routineDrafts.length === 0) {
      setRoutineDraftQueueOpen(false);
    }
  }

  function openExerciseDraftRemovalDialog(draft: LocalPTExerciseDraft) {
    setExerciseDraftToRemove(draft);
  }

  function closeExerciseDraftRemovalDialog() {
    setExerciseDraftToRemove(null);
  }

  function confirmExerciseDraftRemoval() {
    if (!exerciseDraftToRemove) {
      return;
    }

    removeExerciseDraft(exerciseDraftToRemove.id);
    closeExerciseDraftRemovalDialog();
  }

  function openMediaPickerForExerciseDraft() {
    setMediaPickerError(null);
    setMediaPickerTarget({ kind: "exercise-draft" });
  }

  function openMediaPickerForRoutineDraft() {
    setMediaPickerError(null);
    setMediaPickerTarget({ kind: "routine-draft" });
  }

  function openMediaPickerForRepAssetEdit() {
    setMediaPickerError(null);
    setMediaPickerTarget({ kind: "rep-asset-edit" });
  }

  function openMediaPickerForRoutineRow(rowId: string) {
    setMediaPickerError(null);
    setMediaPickerTarget({ kind: "routine-row", rowId });
  }

  function closeMediaPicker() {
    setMediaPickerTarget(null);
    setMediaPickerError(null);
  }

  function selectedMediaForPicker() {
    if (!mediaPickerTarget) {
      return null;
    }

    if (mediaPickerTarget.kind === "exercise-draft") {
      return exerciseMedia;
    }

    if (mediaPickerTarget.kind === "routine-draft") {
      return routineMedia;
    }

    if (mediaPickerTarget.kind === "rep-asset-edit") {
      return portfolioRepAssetEditForm?.media ?? null;
    }

    return routineRows.find((row) => row.id === mediaPickerTarget.rowId)?.media ?? null;
  }

  function applyMediaToPickerTarget(media: PTTrainingDraftMedia | null) {
    if (!mediaPickerTarget) {
      return;
    }

    if (mediaPickerTarget.kind === "exercise-draft") {
      setExerciseMedia(media);
      return;
    }

    if (mediaPickerTarget.kind === "routine-draft") {
      setRoutineMedia(media);
      return;
    }

    if (mediaPickerTarget.kind === "rep-asset-edit") {
      setPortfolioRepAssetEditForm((current) => (current ? { ...current, media } : current));
      return;
    }

    setRoutineRows((current) =>
      current.map((row) =>
        row.id === mediaPickerTarget.rowId
          ? {
              ...row,
              media,
            }
          : row,
      ),
    );
  }

  async function handleMediaSelection(file: File | null) {
    if (!file) {
      return;
    }

    const kind = isVideoMediaType(file.type)
      ? "video"
      : isImageMediaType(file.type)
        ? "image"
        : null;

    if (!kind) {
      setMediaPickerError("Upload a PNG, JPEG, WEBP, GIF, MP4, or WEBM file.");
      return;
    }

    const maxSize = kind === "video" ? TRAINING_VIDEO_MEDIA_MAX_BYTES : TRAINING_IMAGE_MEDIA_MAX_BYTES;
    if (file.size > maxSize) {
      setMediaPickerError(
        `${kind === "video" ? "Video" : "Image"} files must be ${formatMediaSize(maxSize)} or smaller.`,
      );
      return;
    }

    try {
      const dataUrl = await readTrainingMediaFile(file);
      applyMediaToPickerTarget({
        id: createLocalPTDraftId(),
        kind,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl,
        addedAt: new Date().toISOString(),
      });
      setMediaPickerError(null);
    } catch (error) {
      setMediaPickerError(error instanceof Error ? error.message : "Unable to read that file.");
    }
  }

  function removeSelectedMedia() {
    applyMediaToPickerTarget(null);
    setMediaPickerError(null);
  }

  function updatePortfolioRepAssetEditForm(
    updater: (current: RepAssetEditForm) => RepAssetEditForm,
  ) {
    setPortfolioRepAssetEditForm((current) => (current ? updater(current) : current));
  }

  function openPortfolioRepAssetEditForm() {
    if (!selectedPortfolioAssetRecord || selectedPortfolioAssetRecord.type !== "rep") {
      return;
    }

    setPortfolioRepAssetEditForm({
      assetId: selectedPortfolioAssetRecord.id,
      sourceDraftId: selectedPortfolioAssetRecord.sourceDraftId,
      exerciseName: selectedPortfolioAssetRecord.exerciseName || selectedPortfolioAssetRecord.title,
      instructions: selectedPortfolioAssetRecord.instructions || "",
      weightsInvolved: Boolean(selectedPortfolioAssetRecord.weightsInvolved),
      fitnessTargets: [...selectedPortfolioAssetRecord.fitnessTargets],
      fitnessAttributes: [...selectedPortfolioAssetRecord.fitnessAttributes],
      tags: [...selectedPortfolioAssetRecord.tags],
      tagInput: "",
      media: selectedPortfolioAssetRecord.media ?? null,
      error: null,
    });
  }

  function closePortfolioRepAssetEditForm() {
    setPortfolioRepAssetEditForm(null);
  }

  function handleAddPortfolioRepAssetTag() {
    if (!portfolioRepAssetEditForm) {
      return;
    }

    const trimmed = portfolioRepAssetEditForm.tagInput.trim();
    if (!trimmed) {
      return;
    }

    updatePortfolioRepAssetEditForm((current) => ({
      ...current,
      tags: dedupeStringValues([...current.tags, trimmed]),
      tagInput: "",
      error: null,
    }));
  }

  function removePortfolioRepAssetTag(tag: string) {
    updatePortfolioRepAssetEditForm((current) => ({
      ...current,
      tags: current.tags.filter((item) => normalizeOptionValue(item) !== normalizeOptionValue(tag)),
    }));
  }

  function matchesRepAssetIdentity(
    asset: LocalPTPortfolioAsset,
    identity: { id: string; sourceDraftId?: string },
  ) {
    if (asset.type !== "rep") {
      return false;
    }

    if (identity.sourceDraftId && asset.sourceDraftId) {
      return asset.sourceDraftId === identity.sourceDraftId;
    }

    return asset.id === identity.id;
  }

  function updateRepAssetCollections(
    assetIdentity: { id: string; sourceDraftId?: string },
    nextRepAsset: LocalPTPortfolioAsset,
  ) {
    const nextLocalFolders = localPortfolioFolders.map((folder) => ({
      ...folder,
      assets: folder.assets.map((asset) =>
        matchesRepAssetIdentity(asset, assetIdentity) ? nextRepAsset : asset,
      ),
    }));

    const nextOverlays = portfolioFolderOverlays.map((overlay) => ({
      ...overlay,
      assets: overlay.assets.map((asset) =>
        matchesRepAssetIdentity(asset, assetIdentity) ? nextRepAsset : asset,
      ),
    }));

    return {
      localFolders: nextLocalFolders,
      overlays: nextOverlays,
    };
  }

  function updateRepDraftsFromAsset(
    assetIdentity: { id: string; sourceDraftId?: string },
    nextRepAsset: Extract<LocalPTPortfolioAsset, { type: "rep" }>,
    updatedAt: string,
  ) {
    return exerciseDrafts.map((draft) => {
      const matchesDraft =
        (assetIdentity.sourceDraftId && draft.id === assetIdentity.sourceDraftId) ||
        draft.id === assetIdentity.id;

      if (!matchesDraft) {
        return draft;
      }

      return createLocalPTExerciseDraft({
        id: draft.id,
        title: nextRepAsset.title,
        exerciseName: nextRepAsset.exerciseName || nextRepAsset.title,
        repGoal:
          typeof nextRepAsset.repGoal === "string" && nextRepAsset.repGoal.trim()
            ? Number.parseInt(nextRepAsset.repGoal, 10)
            : draft.repGoal,
        instructions: nextRepAsset.instructions || "",
        weightsInvolved: Boolean(nextRepAsset.weightsInvolved),
        fitnessTargets: nextRepAsset.fitnessTargets,
        fitnessAttributes: nextRepAsset.fitnessAttributes,
        tags: nextRepAsset.tags,
        media: nextRepAsset.media ?? null,
        createdAt: draft.createdAt,
        editedAt: updatedAt,
      });
    });
  }

  function handleSavePortfolioRepAssetChanges() {
    if (
      !portfolioRepAssetEditForm ||
      !selectedPortfolioAssetRecord ||
      selectedPortfolioAssetRecord.type !== "rep"
    ) {
      return;
    }

    const exerciseTitle = portfolioRepAssetEditForm.exerciseName.trim();
    if (!exerciseTitle) {
      updatePortfolioRepAssetEditForm((current) => ({
        ...current,
        error: "Exercise is required.",
      }));
      return;
    }

    const updatedAt = new Date().toISOString();
    const nextRepAsset = createLocalPTPortfolioRepAsset({
      id: selectedPortfolioAssetRecord.id,
      title: exerciseTitle,
      exerciseName: exerciseTitle,
      repGoal: selectedPortfolioAssetRecord.repGoal,
      description: selectedPortfolioAssetRecord.description,
      instructions: portfolioRepAssetEditForm.instructions,
      objective: selectedPortfolioAssetRecord.objective,
      weightsInvolved: portfolioRepAssetEditForm.weightsInvolved,
      fitnessTargets: portfolioRepAssetEditForm.fitnessTargets,
      fitnessAttributes: portfolioRepAssetEditForm.fitnessAttributes,
      tags: portfolioRepAssetEditForm.tags,
      media: portfolioRepAssetEditForm.media,
      sourceDraftId: selectedPortfolioAssetRecord.sourceDraftId,
      createdAt: selectedPortfolioAssetRecord.createdAt,
      updatedAt,
    });

    const assetIdentity = {
      id: selectedPortfolioAssetRecord.id,
      sourceDraftId: selectedPortfolioAssetRecord.sourceDraftId,
    };
    const nextCollections = updateRepAssetCollections(assetIdentity, nextRepAsset);
    const nextExerciseDrafts = updateRepDraftsFromAsset(assetIdentity, nextRepAsset, updatedAt);

    setLocalPortfolioFolders(nextCollections.localFolders);
    writeLocalPTPortfolioFolders(nextCollections.localFolders);
    setPortfolioFolderOverlays(nextCollections.overlays);
    writeLocalPTPortfolioFolderOverlays(nextCollections.overlays);
    setExerciseDrafts(nextExerciseDrafts);
    writeLocalPTExerciseDrafts(nextExerciseDrafts);
    setPortfolioRepAssetEditForm(null);
  }

  function resetRoutineDialogState() {
    setRoutineDialogPage("details");
    setEditingRoutineDraftId(null);
    setRoutineName("");
    setRoutineDescription("");
    setFitnessTargets([]);
    setFitnessAttributes([]);
    setRoutineTags([]);
    setRoutineTagInput("");
    setRoutineMedia(null);
    setTimedByDuration(false);
    setRoutineRows([createRoutineExerciseRow()]);
    setActiveRoutineExerciseIndex(0);
    setRoutineDetailsErrors({});
    setRoutineRowErrors({});
    closeRoutineOptionDialog();
  }

  function openRoutineDialog() {
    setRoutineDialogOpen(true);
    resetRoutineDialogState();
  }

  function closeRoutineDialog() {
    setRoutineDialogOpen(false);
    resetRoutineDialogState();
  }

  function openRoutineDraftForEdit(draft: LocalPTRoutineDraft) {
    setRoutineDialogOpen(true);
    setRoutineDialogPage("details");
    setEditingRoutineDraftId(draft.id);
    setRoutineName(draft.routineName);
    setRoutineDescription(draft.description);
    setFitnessTargets(draft.fitnessTargets);
    setFitnessAttributes(draft.fitnessAttributes);
    setRoutineTags(draft.tags);
    setRoutineTagInput("");
    setRoutineMedia(draft.media ?? null);
    setTimedByDuration(draft.timedByDuration);
    setRoutineRows(
      draft.exercises.length > 0
        ? draft.exercises.map((exercise) => ({
            id: exercise.id,
            exerciseName: exercise.exerciseName,
            repGoal: typeof exercise.repGoal === "number" ? String(exercise.repGoal) : "",
            instructions: exercise.instructions,
            weightsInvolved: exercise.weightsInvolved,
            media: exercise.media ?? null,
          }))
        : [createRoutineExerciseRow()],
    );
    setActiveRoutineExerciseIndex(0);
    setRoutineDetailsErrors({});
    setRoutineRowErrors({});
    closeRoutineOptionDialog();
  }

  function openRoutineOptionDialog(
    kind: NonNullable<FitnessOptionDialogState>["kind"],
    scope: NonNullable<FitnessOptionDialogState>["scope"] = "routine",
  ) {
    setRoutineOptionDialogKind({ kind, scope });
    setRoutineOptionValue("");
    setRoutineOptionError(null);
  }

  function closeRoutineOptionDialog() {
    setRoutineOptionDialogKind(null);
    setRoutineOptionValue("");
    setRoutineOptionError(null);
  }

  function toggleSelection(value: string, selected: string[], setSelected: (value: string[]) => void) {
    const normalized = normalizeOptionValue(value);
    const exists = selected.some((item) => normalizeOptionValue(item) === normalized);

    if (exists) {
      setSelected(selected.filter((item) => normalizeOptionValue(item) !== normalized));
      return;
    }

    setSelected([...selected, value]);
  }

  function handleAddRoutineOption() {
    if (!routineOptionDialogKind) {
      return;
    }

    const trimmed = routineOptionValue.trim();
    if (!trimmed) {
      setRoutineOptionError(
        routineOptionDialogKind.kind === "target"
          ? "Body target is required."
          : "Physical attribute is required.",
      );
      return;
    }

    if (routineOptionDialogKind.kind === "target") {
      const selectedTargets =
        routineOptionDialogKind.scope === "routine"
          ? fitnessTargets
          : routineOptionDialogKind.scope === "exercise"
            ? exerciseFitnessTargets
            : portfolioRepAssetEditForm?.fitnessTargets ?? [];
      const existing = dedupeStringValues([...fitnessTargetOptions, ...selectedTargets]);
      if (existing.some((item) => normalizeOptionValue(item) === normalizeOptionValue(trimmed))) {
        setRoutineOptionError("That body target already exists.");
        return;
      }

      const nextCustomTargets = [...customFitnessTargets, trimmed];
      setCustomFitnessTargets(nextCustomTargets);
      writeLocalPTCustomFitnessTargets(nextCustomTargets);
      if (routineOptionDialogKind.scope === "routine") {
        setFitnessTargets((current) => [...current, trimmed]);
      } else if (routineOptionDialogKind.scope === "exercise") {
        setExerciseFitnessTargets((current) => [...current, trimmed]);
      } else {
        setPortfolioRepAssetEditForm((current) =>
          current ? { ...current, fitnessTargets: [...current.fitnessTargets, trimmed] } : current,
        );
      }
      closeRoutineOptionDialog();
      return;
    }

    const selectedAttributes =
      routineOptionDialogKind.scope === "routine"
        ? fitnessAttributes
        : routineOptionDialogKind.scope === "exercise"
          ? exerciseFitnessAttributes
          : portfolioRepAssetEditForm?.fitnessAttributes ?? [];
    const existing = dedupeStringValues([...fitnessAttributeOptions, ...selectedAttributes]);
    if (existing.some((item) => normalizeOptionValue(item) === normalizeOptionValue(trimmed))) {
      setRoutineOptionError("That physical attribute already exists.");
      return;
    }

    const nextCustomAttributes = [...customFitnessAttributes, trimmed];
    setCustomFitnessAttributes(nextCustomAttributes);
    writeLocalPTCustomFitnessAttributes(nextCustomAttributes);
    if (routineOptionDialogKind.scope === "routine") {
      setFitnessAttributes((current) => [...current, trimmed]);
    } else if (routineOptionDialogKind.scope === "exercise") {
      setExerciseFitnessAttributes((current) => [...current, trimmed]);
    } else {
      setPortfolioRepAssetEditForm((current) =>
        current
          ? { ...current, fitnessAttributes: [...current.fitnessAttributes, trimmed] }
          : current,
      );
    }
    closeRoutineOptionDialog();
  }

  function validateRoutineDetails() {
    const nextErrors: RoutineDetailsErrors = {};

    if (routineName.trim().length === 0) {
      nextErrors.routineName = "Routine name is required.";
    }

    setRoutineDetailsErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateRoutineRows() {
    setRoutineRowErrors({});
    return {} as Record<string, RoutineExerciseRowErrors>;
  }

  function handleRoutineNextPage() {
    if (!validateRoutineDetails()) {
      return;
    }

    setRoutineDialogPage("exercises");
  }

  function handleRoutineRowChange(
    rowId: string,
    key: keyof RoutineExerciseRow,
    value: string | boolean,
  ) {
    setRoutineRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        return {
          ...row,
          [key]: value,
        };
      }),
    );

    setRoutineRowErrors((current) => {
      if (!current[rowId]) {
        return current;
      }

      const next = { ...current };
      const nextRowErrors = { ...next[rowId] };
      delete nextRowErrors[key as keyof RoutineExerciseRowErrors];

      if (Object.keys(nextRowErrors).length === 0) {
        delete next[rowId];
      } else {
        next[rowId] = nextRowErrors;
      }

      return next;
    });
  }

  function handleAddRoutineExerciseRow() {
    const nextRow = createRoutineExerciseRow();
    setRoutineRows((current) => [...current, nextRow]);
    setActiveRoutineExerciseIndex(routineRows.length);
  }

  function handleAddRoutineTag() {
    const trimmed = routineTagInput.trim();
    if (!trimmed) {
      return;
    }

    setRoutineTags((current) => dedupeStringValues([...current, trimmed]));
    setRoutineTagInput("");
  }

  function removeRoutineTag(tag: string) {
    setRoutineTags((current) =>
      current.filter((item) => normalizeOptionValue(item) !== normalizeOptionValue(tag)),
    );
  }

  function buildRoutineDraftRows() {
    return routineRows
      .filter(
        (row) =>
          row.exerciseName.trim().length > 0 ||
          row.repGoal.trim().length > 0 ||
          row.instructions.trim().length > 0 ||
          row.weightsInvolved ||
          Boolean(row.media),
      )
      .map((row) => ({
        id: row.id,
        exerciseName: row.exerciseName,
        repGoal: row.repGoal.trim().length > 0 ? Number(row.repGoal) : undefined,
        instructions: row.instructions,
        weightsInvolved: row.weightsInvolved,
        media: row.media ?? null,
      }));
  }

  function handleRemoveRoutineExerciseRow(rowId: string) {
    const removeIndex = routineRows.findIndex((row) => row.id === rowId);
    const nextRows = routineRows.filter((row) => row.id !== rowId);
    setRoutineRows(nextRows);
    setRoutineRowErrors((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });

    if (nextRows.length === 0) {
      setRoutineRows([createRoutineExerciseRow()]);
      setActiveRoutineExerciseIndex(0);
      return;
    }

    if (removeIndex < activeRoutineExerciseIndex) {
      setActiveRoutineExerciseIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (removeIndex === activeRoutineExerciseIndex) {
      setActiveRoutineExerciseIndex(Math.min(activeRoutineExerciseIndex, nextRows.length - 1));
    }
  }

  function buildRoutineDraft(
    existingDraft: LocalPTRoutineDraft | null,
    overrides?: {
      publishStatus?: "draft" | "ready";
      publishTargets?: LocalPTRoutineDraftPublishTarget[];
      editedAt?: string;
    },
  ) {
    return createLocalPTRoutineDraft({
      id: existingDraft?.id,
      routineName,
      description: routineDescription,
      fitnessTargets,
      fitnessAttributes,
      tags: routineTags,
      media: routineMedia,
      timedByDuration,
      exercises: buildRoutineDraftRows(),
      createdAt: existingDraft?.createdAt,
      editedAt: overrides?.editedAt ?? new Date().toISOString(),
      publishStatus: overrides?.publishStatus ?? existingDraft?.publishStatus,
      publishTargets: overrides?.publishTargets ?? existingDraft?.publishTargets,
    });
  }

  function saveRoutineDraftRecord(nextDraft: LocalPTRoutineDraft) {
    const nextDrafts = routineDrafts.some((draft) => draft.id === nextDraft.id)
      ? routineDrafts.map((draft) => (draft.id === nextDraft.id ? nextDraft : draft))
      : [nextDraft, ...routineDrafts];
    setRoutineDrafts(nextDrafts);
    writeLocalPTRoutineDrafts(nextDrafts);
  }

  function handleSaveRoutineDetailsDraft() {
    if (!isRoutineEditMode) {
      return;
    }

    const existingDraft = routineDrafts.find((draft) => draft.id === editingRoutineDraftId) ?? null;
    if (!existingDraft) {
      return;
    }

    if (!validateRoutineDetails()) {
      return;
    }

    const nextDraft = buildRoutineDraft(existingDraft);
    saveRoutineDraftRecord(nextDraft);
  }

  function handleSaveRoutineDraft() {
    const detailsValid = validateRoutineDetails();
    const nextRowErrors = validateRoutineRows();
    const rowsValid = Object.keys(nextRowErrors).length === 0;

    if (!detailsValid) {
      setRoutineDialogPage("details");
      return;
    }

    if (!rowsValid) {
      setRoutineDialogPage("exercises");
      const nextInvalidIndex = routineRows.findIndex((row) => {
        const rowErrors = nextRowErrors[row.id];
        return rowErrors && Object.keys(rowErrors).length > 0;
      });
      if (nextInvalidIndex >= 0) {
        setActiveRoutineExerciseIndex(nextInvalidIndex);
      }
      return;
    }

    const existingDraft =
      editingRoutineDraftId !== null
        ? routineDrafts.find((draft) => draft.id === editingRoutineDraftId) ?? null
        : null;
    const nextDraft = buildRoutineDraft(existingDraft);
    saveRoutineDraftRecord(nextDraft);
    closeRoutineDialog();
  }

  function removeRoutineDraft(draftId: string) {
    const nextDrafts = routineDrafts.filter((draft) => draft.id !== draftId);
    setRoutineDrafts(nextDrafts);
    writeLocalPTRoutineDrafts(nextDrafts);

    if (editingRoutineDraftId === draftId) {
      closeRoutineDialog();
    }
  }

  function openRoutineDraftRemovalDialog(draft: LocalPTRoutineDraft) {
    setRoutineDraftToRemove(draft);
  }

  function closeRoutineDraftRemovalDialog() {
    setRoutineDraftToRemove(null);
  }

  function confirmRoutineDraftRemoval() {
    if (!routineDraftToRemove) {
      return;
    }

    removeRoutineDraft(routineDraftToRemove.id);
    closeRoutineDraftRemovalDialog();
  }

  function openExerciseDraftPublishDialog(draft: LocalPTExerciseDraft) {
    setExerciseDraftPublishError(null);
    setExerciseDraftPublishDialog({
      draftId: draft.id,
      selectedTargets: [],
      localFolderOptions: [],
      folderPickerOpen: false,
      newFolderDialogOpen: false,
      newFolderName: "",
      newFolderError: null,
    });
  }

  function closeExerciseDraftPublishDialog() {
    setExerciseDraftPublishDialog(null);
    setExerciseDraftPublishError(null);
  }

  function updateExerciseDraftPublishDialog(
    updater: (current: NonNullable<ExerciseDraftPublishDialogState>) => NonNullable<ExerciseDraftPublishDialogState>,
  ) {
    setExerciseDraftPublishDialog((current) => (current ? updater(current) : current));
    setExerciseDraftPublishError(null);
  }

  function toggleExerciseDraftPublishTarget(target: LocalPTRoutineDraftPublishTarget) {
    updateExerciseDraftPublishDialog((current) => {
      const matchIndex = current.selectedTargets.findIndex((item) => {
        if (item.type !== target.type) {
          return false;
        }

        if (target.type === "existing-folder") {
          return item.id === target.id;
        }

        return normalizeOptionValue(item.name) === normalizeOptionValue(target.name);
      });

      if (matchIndex >= 0) {
        return {
          ...current,
          selectedTargets: current.selectedTargets.filter((_, index) => index !== matchIndex),
        };
      }

      return {
        ...current,
        selectedTargets: dedupePublishTargets([...current.selectedTargets, target]),
      };
    });
  }

  function hasSelectedExerciseDraftPublishTarget(target: LocalPTRoutineDraftPublishTarget) {
    if (!exerciseDraftPublishDialog) {
      return false;
    }

    return exerciseDraftPublishDialog.selectedTargets.some((item) => {
      if (item.type !== target.type) {
        return false;
      }

      if (target.type === "existing-folder") {
        return item.id === target.id;
      }

      return normalizeOptionValue(item.name) === normalizeOptionValue(target.name);
    });
  }

  function closeExerciseDraftFolderPicker() {
    updateExerciseDraftPublishDialog((current) => ({
      ...current,
      folderPickerOpen: false,
      newFolderDialogOpen: false,
      newFolderName: "",
      newFolderError: null,
    }));
  }

  function openExerciseDraftNewFolderDialog() {
    updateExerciseDraftPublishDialog((current) => ({
      ...current,
      folderPickerOpen: true,
      newFolderDialogOpen: true,
      newFolderName: "",
      newFolderError: null,
    }));
  }

  function closeExerciseDraftNewFolderDialog() {
    updateExerciseDraftPublishDialog((current) => ({
      ...current,
      newFolderDialogOpen: false,
      newFolderName: "",
      newFolderError: null,
    }));
  }

  function handleAddExerciseDraftPublishFolder() {
    if (!exerciseDraftPublishDialog) {
      return;
    }

    const folderName = exerciseDraftPublishDialog.newFolderName.trim();
    if (!folderName) {
      updateExerciseDraftPublishDialog((current) => ({
        ...current,
        newFolderError: "Folder name is required.",
      }));
      return;
    }

    const existingNames = [
      ...publishablePortfolioFolderOptions.map((folder) => folder.title),
      ...exerciseDraftPublishDialog.localFolderOptions.map((folder) => folder.name),
    ];
    if (
      existingNames.some(
        (name) => normalizeOptionValue(name) === normalizeOptionValue(folderName),
      )
    ) {
      updateExerciseDraftPublishDialog((current) => ({
        ...current,
        newFolderError: "That folder name already exists.",
      }));
      return;
    }

    const nextFolder = {
      id: createLocalPTDraftId(),
      name: folderName,
    };

    updateExerciseDraftPublishDialog((current) => ({
      ...current,
      localFolderOptions: [...current.localFolderOptions, nextFolder],
      selectedTargets: dedupePublishTargets([
        ...current.selectedTargets,
        {
          type: "local-folder-draft",
          id: nextFolder.id,
          name: nextFolder.name,
        },
      ]),
      newFolderDialogOpen: false,
      newFolderName: "",
      newFolderError: null,
    }));
  }

  function confirmExerciseDraftPublish() {
    if (!exerciseDraftPublishDialog) {
      closeExerciseDraftPublishDialog();
      return;
    }

    const publishingExerciseDraft =
      exerciseDrafts.find((draft) => draft.id === exerciseDraftPublishDialog.draftId) ?? null;
    if (!publishingExerciseDraft) {
      closeExerciseDraftPublishDialog();
      return;
    }

    const selectedTargets = dedupePublishTargets(
      exerciseDraftPublishDialog.selectedTargets,
    ).reduce<LocalPTRoutineDraftPublishTarget[]>((next, target) => {
      if (target.type === "existing-folder") {
        const selectedFolder = publishablePortfolioFolderOptions.find((folder) => folder.id === target.id);
        if (!selectedFolder) {
          return next;
        }

        next.push({
          type: "existing-folder",
          id: selectedFolder.id,
          name: selectedFolder.title,
        });
        return next;
      }

      const localFolder = exerciseDraftPublishDialog.localFolderOptions.find(
        (folder) =>
          folder.id === target.id ||
          normalizeOptionValue(folder.name) === normalizeOptionValue(target.name),
      );
      const name = localFolder?.name ?? target.name;
      if (!name.trim()) {
        return next;
      }

      next.push({
        type: "local-folder-draft",
        id: localFolder?.id ?? target.id,
        name,
      });
      return next;
    }, []);

    if (selectedTargets.length === 0) {
      setExerciseDraftPublishError("Select at least one portfolio folder.");
      return;
    }

    const updatedAt = new Date().toISOString();
    const repAsset = buildRepAssetFromDraft(publishingExerciseDraft, updatedAt);
    let nextFolders = upsertRepAssetIntoAllSingularExercisesFolder(
      localPortfolioFolders,
      repAsset,
      updatedAt,
    );
    let nextOverlays = [...portfolioFolderOverlays];

    selectedTargets.forEach((target) => {
      const localFolderIndex = findPublishTargetLocalFolderIndex(nextFolders, target);
      if (localFolderIndex >= 0) {
        const folder = nextFolders[localFolderIndex];
        nextFolders[localFolderIndex] = {
          ...folder,
          source: folder.source,
          title: target.name.trim() || folder.title,
          assets: upsertPortfolioAsset(folder.assets, repAsset),
          updatedAt,
        };
        return;
      }

      if (target.type === "existing-folder" && target.id) {
        const overlayIndex = nextOverlays.findIndex((overlay) => overlay.id === target.id);
        if (overlayIndex >= 0) {
          const overlay = nextOverlays[overlayIndex];
          nextOverlays[overlayIndex] = {
            ...overlay,
            assets: upsertPortfolioAsset(overlay.assets, repAsset),
            updatedAt,
          };
          return;
        }

        nextOverlays = [
          {
            id: target.id,
            source: "bff",
            updatedAt,
            color: "grey",
            tags: [],
            assets: [repAsset],
            exercises: [],
          },
          ...nextOverlays,
        ];
        return;
      }

      nextFolders = [
        createLocalPTPortfolioFolder({
          title: target.name,
          assets: [repAsset],
          tags: [],
          exercises: [],
        }),
        ...nextFolders,
      ];
    });

    const nextDrafts = exerciseDrafts.filter((draft) => draft.id !== publishingExerciseDraft.id);
    setLocalPortfolioFolders(nextFolders);
    writeLocalPTPortfolioFolders(nextFolders);
    setPortfolioFolderOverlays(nextOverlays);
    writeLocalPTPortfolioFolderOverlays(nextOverlays);
    setExerciseDrafts(nextDrafts);
    writeLocalPTExerciseDrafts(nextDrafts);
    if (nextDrafts.length === 0 && routineDrafts.length === 0) {
      setRoutineDraftQueueOpen(false);
    }
    closeExerciseDraftPublishDialog();
  }

  function openRoutineDraftPublishDialog(draft: LocalPTRoutineDraft) {
    setRoutineDraftPublishError(null);
    setRoutineDraftPublishDialog({
      draftId: draft.id,
      selectedTargets: dedupePublishTargets(draft.publishTargets ?? []),
      localFolderOptions: dedupePublishTargets(
        (draft.publishTargets ?? []).filter((target) => target.type === "local-folder-draft"),
      ).map((target) => ({
        id: target.id ?? createLocalPTDraftId(),
        name: target.name,
      })),
      folderPickerOpen: false,
      newFolderDialogOpen: false,
      newFolderName: "",
      newFolderError: null,
    });
  }

  function closeRoutineDraftPublishDialog() {
    setRoutineDraftPublishDialog(null);
    setRoutineDraftPublishError(null);
  }

  function updateRoutineDraftPublishDialog(
    updater: (current: NonNullable<RoutineDraftPublishDialogState>) => NonNullable<RoutineDraftPublishDialogState>,
  ) {
    setRoutineDraftPublishDialog((current) => (current ? updater(current) : current));
    setRoutineDraftPublishError(null);
  }

  function toggleRoutineDraftPublishTarget(target: LocalPTRoutineDraftPublishTarget) {
    updateRoutineDraftPublishDialog((current) => {
      const matchIndex = current.selectedTargets.findIndex((item) => {
        if (item.type !== target.type) {
          return false;
        }

        if (target.type === "existing-folder") {
          return item.id === target.id;
        }

        return normalizeOptionValue(item.name) === normalizeOptionValue(target.name);
      });

      if (matchIndex >= 0) {
        return {
          ...current,
          selectedTargets: current.selectedTargets.filter((_, index) => index !== matchIndex),
        };
      }

      return {
        ...current,
        selectedTargets: dedupePublishTargets([...current.selectedTargets, target]),
      };
    });
  }

  function hasSelectedRoutineDraftPublishTarget(target: LocalPTRoutineDraftPublishTarget) {
    if (!routineDraftPublishDialog) {
      return false;
    }

    return routineDraftPublishDialog.selectedTargets.some((item) => {
      if (item.type !== target.type) {
        return false;
      }

      if (target.type === "existing-folder") {
        return item.id === target.id;
      }

      return normalizeOptionValue(item.name) === normalizeOptionValue(target.name);
    });
  }

  function closeRoutineDraftFolderPicker() {
    updateRoutineDraftPublishDialog((current) => ({
      ...current,
      folderPickerOpen: false,
      newFolderDialogOpen: false,
      newFolderName: "",
      newFolderError: null,
    }));
  }

  function openRoutineDraftNewFolderDialog() {
    updateRoutineDraftPublishDialog((current) => ({
      ...current,
      folderPickerOpen: true,
      newFolderDialogOpen: true,
      newFolderName: "",
      newFolderError: null,
    }));
  }

  function closeRoutineDraftNewFolderDialog() {
    updateRoutineDraftPublishDialog((current) => ({
      ...current,
      newFolderDialogOpen: false,
      newFolderName: "",
      newFolderError: null,
    }));
  }

  function handleAddRoutineDraftPublishFolder() {
    if (!routineDraftPublishDialog) {
      return;
    }

    const folderName = routineDraftPublishDialog.newFolderName.trim();
    if (!folderName) {
      updateRoutineDraftPublishDialog((current) => ({
        ...current,
        newFolderError: "Folder name is required.",
      }));
      return;
    }

    const existingNames = [
      ...publishablePortfolioFolderOptions.map((folder) => folder.title),
      ...routineDraftPublishDialog.localFolderOptions.map((folder) => folder.name),
    ];
    if (
      existingNames.some(
        (name) => normalizeOptionValue(name) === normalizeOptionValue(folderName),
      )
    ) {
      updateRoutineDraftPublishDialog((current) => ({
        ...current,
        newFolderError: "That folder name already exists.",
      }));
      return;
    }

    const nextFolder = {
      id: createLocalPTDraftId(),
      name: folderName,
    };

    updateRoutineDraftPublishDialog((current) => ({
      ...current,
      localFolderOptions: [...current.localFolderOptions, nextFolder],
      selectedTargets: dedupePublishTargets([
        ...current.selectedTargets,
        {
          type: "local-folder-draft",
          id: nextFolder.id,
          name: nextFolder.name,
        },
      ]),
      newFolderDialogOpen: false,
      newFolderName: "",
      newFolderError: null,
    }));
  }

  function confirmRoutineDraftPublish() {
    if (!routineDraftPublishDialog || !publishingRoutineDraft) {
      closeRoutineDraftPublishDialog();
      return;
    }

    const selectedTargets = dedupePublishTargets(
      routineDraftPublishDialog.selectedTargets,
    ).reduce<LocalPTRoutineDraftPublishTarget[]>((next, target) => {
      if (target.type === "existing-folder") {
        const selectedFolder = publishablePortfolioFolderOptions.find((folder) => folder.id === target.id);
        if (!selectedFolder) {
          return next;
        }

        next.push({
          type: "existing-folder",
          id: selectedFolder.id,
          name: selectedFolder.title,
        });
        return next;
      }

      const localFolder = routineDraftPublishDialog.localFolderOptions.find(
        (folder) =>
          folder.id === target.id ||
          normalizeOptionValue(folder.name) === normalizeOptionValue(target.name),
      );
      const name = localFolder?.name ?? target.name;
      if (!name.trim()) {
        return next;
      }

      next.push({
        type: "local-folder-draft",
        id: localFolder?.id ?? target.id,
        name,
      });
      return next;
    }, []);

    if (selectedTargets.length === 0) {
      setRoutineDraftPublishError("Select at least one portfolio folder.");
      return;
    }
    const updatedAt = new Date().toISOString();
    const routineAsset = buildRoutineAssetFromDraft(publishingRoutineDraft, updatedAt);
    let nextFolders = [...localPortfolioFolders];
    let nextOverlays = [...portfolioFolderOverlays];

    selectedTargets.forEach((target) => {
      const localFolderIndex = findPublishTargetLocalFolderIndex(nextFolders, target);
      if (localFolderIndex >= 0) {
        const folder = nextFolders[localFolderIndex];
        nextFolders[localFolderIndex] = {
          ...folder,
          source: folder.source,
          title: target.name.trim() || folder.title,
          assets: appendUniquePortfolioAsset(folder.assets, routineAsset),
          exercises: removeLegacyRoutineExerciseStrings(folder.exercises, publishingRoutineDraft),
          updatedAt,
        };
        return;
      }

      if (target.type === "existing-folder" && target.id) {
        const overlayIndex = nextOverlays.findIndex((overlay) => overlay.id === target.id);
        if (overlayIndex >= 0) {
          const overlay = nextOverlays[overlayIndex];
          nextOverlays[overlayIndex] = {
            ...overlay,
            assets: appendUniquePortfolioAsset(overlay.assets, routineAsset),
            exercises: removeLegacyRoutineExerciseStrings(overlay.exercises, publishingRoutineDraft),
            updatedAt,
          };
          return;
        }

        nextOverlays = [
          {
            id: target.id,
            source: "bff",
            updatedAt,
            color: "grey",
            tags: [],
            assets: [routineAsset],
            exercises: [],
          },
          ...nextOverlays,
        ];
        return;
      }

      nextFolders = [
        createLocalPTPortfolioFolder({
          title: target.name,
          assets: [routineAsset],
          tags: [],
          exercises: [],
        }),
        ...nextFolders,
      ];
    });

    const nextDrafts = routineDrafts.filter((draft) => draft.id !== publishingRoutineDraft.id);
    setLocalPortfolioFolders(nextFolders);
    writeLocalPTPortfolioFolders(nextFolders);
    setPortfolioFolderOverlays(nextOverlays);
    writeLocalPTPortfolioFolderOverlays(nextOverlays);
    setRoutineDrafts(nextDrafts);
    writeLocalPTRoutineDrafts(nextDrafts);
    if (nextDrafts.length === 0 && exerciseDrafts.length === 0) {
      setRoutineDraftQueueOpen(false);
    }
    closeRoutineDraftPublishDialog();
  }

  if (status === "loading") {
    return <LoadingBlock title="Loading PT training" message="Validating your BFF-managed PT session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT training requires an authenticated PT session." />;
  }

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="PT Training"
      subtitle="Training portfolios and routines stay inside the existing PT BFF layer and use local-only filtering on the frontend."
      notificationSlot={<MobileHeaderUtilities settingsHref="/pt/settings" />}
      activePath="/pt/training"
      showAvatar={false}
    >
      {allSectionsFailed ? (
        <MobileSection
          eyebrow="Training sync"
          title="Training Portfolio unavailable"
          description="This screen stays on protected frontend-to-BFF PT routes and does not fall back to direct backend calls."
        >
          <TrainingStateCard
            title="Training Portfolio unavailable"
            message={sectionErrors.folders ?? "Unable to load PT folders."}
            action={<ActionPill href="/pt">Back home</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading Training Portfolio"
          description="Fetching folders, portfolios, and routines through the current signed PT BFF routes."
        >
          <TrainingStateCard
            title="Refreshing Training Portfolio"
            message="Your PT training workspace is loading through the protected frontend-to-BFF path."
          />
        </MobileSection>
      ) : null}

      {!showLoadingState && !allSectionsFailed ? (
        <>
          <MobileSection
            eyebrow="PT training"
            title="Training Portfolio"
            description="Organize client training routines into custom folder lanes from the existing PT folders route."
            action={
              <button
                type="button"
                className="pt-training-portfolio-directory__edit mobile-focus-ring"
                onClick={() => {
                  setPortfolioDisplayDialogOpen(true);
                }}
                aria-haspopup="dialog"
                aria-controls="pt-training-portfolio-display-dialog"
                aria-label="Edit training portfolio display"
              >
                Edit
              </button>
            }
          >
            <div className="pt-training-portfolio-directory">
              <div className="pt-training-portfolio-directory__search">
                <label htmlFor="pt-training-portfolio-search" className="sr-only">
                  Search training portfolios
                </label>
                <input
                  id="pt-training-portfolio-search"
                  type="search"
                  value={searchValue}
                  placeholder="Search training portfolios or routines"
                  className="mobile-focus-ring"
                  onChange={(event) => {
                    startTransition(() => {
                      setSearchValue(event.target.value);
                    });
                  }}
                />
              </div>
            </div>

            {sectionErrors.folders && !view.hasFolders && localPortfolioFolders.length === 0 ? (
              <TrainingStateCard title="Training Portfolio unavailable" message={sectionErrors.folders} />
            ) : displayedPortfolioFolders.length > 0 ? (
              <div
                className="pt-training-portfolio-directory__list"
                role="list"
                aria-label="Training portfolio directory"
              >
                {displayedPortfolioFolders.map((folder) => (
                  <div key={folder.id} role="listitem" className="pt-training-folder-row__item">
                    <button
                      type="button"
                      className={`pt-training-folder-row pt-training-folder-row--${folder.color} mobile-focus-ring`}
                      onClick={() => {
                        openPortfolioFolderDetail(folder.id);
                      }}
                      aria-label={`Open training portfolio ${folder.title}`}
                    >
                      <span className="pt-training-folder-row__thumbnail" aria-hidden="true">
                        {folder.thumbnailDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={folder.thumbnailDataUrl} alt="" />
                        ) : (
                          <span className="pt-training-folder-row__thumbnail-placeholder">
                            <FolderDirectoryIcon />
                          </span>
                        )}
                      </span>
                      <span className="pt-training-folder-row__copy">
                        <span className="pt-training-folder-row__title">{folder.title}</span>
                        <span className="pt-training-folder-row__updated">
                          {formatUpdatedLabel(folder.updatedAt)}
                        </span>
                        {folder.source === "local" ? (
                          <span className="pt-training-folder-row__source">Stored locally</span>
                        ) : null}
                      </span>
                      <span className="pt-training-folder-row__action" aria-hidden="true">
                        <ExerciseArrowIcon direction="right" />
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            ) : hasSearchValue ? (
              <TrainingStateCard
                title="No training portfolios match this search."
                message="Search folder names, tags, exercises, and routine terms locally to find the portfolios you need."
              />
            ) : portfolioDisplayMode === "pinned" && filteredPortfolioFolders.length > 0 ? (
              <TrainingStateCard
                title="No pinned training portfolios selected yet."
                message="Open Edit to pin up to 5 portfolio folders for this directory view."
              />
            ) : (
              <TrainingStateCard
                title="No training folders yet."
                message="Training folders will appear here when the current PT folders route returns custom folder records or when you create a local portfolio folder."
              />
            )}
          </MobileSection>

          <MobileSection
            className="pt-training-builder-section"
            eyebrow="Routine builder"
            title="Build Training Routine"
            description="Create local draft exercises and routines that can later be attached to training portfolio folders when save routes are wired."
          >
            <div className="pt-training-builder-frame">
              <div className="pt-training-builder-grid">
                {BUILDER_OPTIONS.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    className={["pt-training-builder-card", item.className, "mobile-focus-ring"].join(" ")}
                    aria-label={item.title}
                    onClick={() => {
                      if (item.kind === "exercise") {
                        openExerciseDialog();
                        return;
                      }

                      openRoutineDialog();
                    }}
                    aria-haspopup="dialog"
                    aria-controls={item.kind === "exercise" ? "pt-training-exercise-dialog" : "pt-training-routine-dialog"}
                  >
                    <span className="pt-training-builder-card__badge">{item.badge}</span>
                    <span className="pt-training-builder-card__title">{item.title}</span>
                    <span className="pt-training-builder-card__copy">{item.copy}</span>
                  </button>
                ))}
              </div>

              {totalDraftCount > 0 ? (
                <div className="pt-training-builder-drafts">
                  <div className="pt-training-builder-drafts__header">
                    <p className="pt-training-builder-drafts__title">
                      Training Draft Queue ({totalDraftCount})
                    </p>
                    <button
                      type="button"
                      className="pt-training-builder-drafts__toggle mobile-focus-ring"
                      aria-expanded={routineDraftQueueOpen}
                      aria-controls="pt-training-routine-draft-queue"
                      aria-label={
                        routineDraftQueueOpen ? "Hide training draft queue" : "Show training draft queue"
                      }
                      onClick={() => {
                        setRoutineDraftQueueOpen((current) => !current);
                      }}
                    >
                      <span
                        className={[
                          "pt-training-builder-drafts__toggle-icon",
                          routineDraftQueueOpen ? "pt-training-builder-drafts__toggle-icon--open" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-hidden="true"
                      >
                        <PortfolioChevronIcon />
                      </span>
                    </button>
                  </div>

                  {routineDraftQueueOpen ? (
                    <div id="pt-training-routine-draft-queue" className="pt-training-builder-drafts__list">
                      {exerciseDrafts.map((draft) => (
                        <MobileCard
                          key={draft.id}
                          as="article"
                          variant="soft"
                          className="pt-training-local-draft-card"
                        >
                          <button
                            type="button"
                            className="pt-training-local-draft-card__body mobile-focus-ring"
                            onClick={() => {
                              openExerciseDraftForEdit(draft);
                            }}
                            aria-label={`Edit rep draft ${draft.exerciseName}`}
                          >
                            <div className="pt-training-local-draft-card__copy">
                              <div className="pt-training-local-draft-card__header">
                                <p className="pt-training-local-draft-card__title">{draft.exerciseName}</p>
                                <div className="pt-training-local-draft-card__asset-tags">
                                  <span className="pt-training-local-draft-tag">Draft</span>
                                  <span className="pt-training-local-draft-tag pt-training-local-draft-card__tag--rep">
                                    Rep
                                  </span>
                                </div>
                              </div>
                              <p className="pt-training-local-draft-card__meta">
                                Edited on {formatDraftTimestamp(draft.editedAt ?? draft.createdAt)}
                              </p>
                              <p className="pt-training-local-draft-card__meta">
                                Weights Involved: {draft.weightsInvolved ? "Yes" : "No"}
                              </p>
                              {draft.fitnessTargets.length > 0 ? (
                                <p className="pt-training-local-draft-card__meta">
                                  Fitness targets: {formatSummaryList(draft.fitnessTargets)}
                                </p>
                              ) : null}
                              {draft.fitnessAttributes.length > 0 ? (
                                <p className="pt-training-local-draft-card__meta">
                                  Fitness attributes: {formatSummaryList(draft.fitnessAttributes)}
                                </p>
                              ) : null}
                              {draft.tags.length > 0 ? (
                                <p className="pt-training-local-draft-card__meta">
                                  Tags: {formatSummaryList(draft.tags)}
                                </p>
                              ) : null}
                              {draft.media ? (
                                <p className="pt-training-local-draft-card__meta">
                                  Media: {draft.media.name}
                                </p>
                              ) : null}
                              {draft.instructions ? (
                                <p className="pt-training-local-draft-card__note">{draft.instructions}</p>
                              ) : null}
                            </div>
                          </button>
                          <div className="pt-training-local-draft-card__actions">
                            <button
                              type="button"
                              className="pt-training-local-draft-action mobile-focus-ring"
                              onClick={() => {
                                openExerciseDraftPublishDialog(draft);
                              }}
                            >
                              Publish Exercise
                            </button>
                            <button
                              type="button"
                              className="pt-training-local-draft-remove mobile-focus-ring"
                              onClick={() => {
                                openExerciseDraftRemovalDialog(draft);
                              }}
                              aria-label={`Remove local rep draft ${draft.exerciseName}`}
                            >
                              Remove
                            </button>
                          </div>
                        </MobileCard>
                      ))}

                      {routineDrafts.map((draft) => (
                        <MobileCard
                          key={draft.id}
                          as="article"
                          variant="soft"
                          className="pt-training-local-draft-card"
                        >
                          <button
                            type="button"
                            className="pt-training-local-draft-card__body mobile-focus-ring"
                            onClick={() => {
                              openRoutineDraftForEdit(draft);
                            }}
                            aria-label={`Edit routine draft ${draft.routineName}`}
                          >
                            <div className="pt-training-local-draft-card__copy">
                              <div className="pt-training-local-draft-card__header">
                                <p className="pt-training-local-draft-card__title">{draft.routineName}</p>
                                <div className="pt-training-local-draft-card__asset-tags">
                                  <span className="pt-training-local-draft-tag">Draft</span>
                                  <span className="pt-training-local-draft-tag">Routine</span>
                                </div>
                              </div>
                              <p className="pt-training-local-draft-card__meta">
                                Edited on {formatDraftTimestamp(draft.editedAt ?? draft.createdAt)}
                              </p>
                              <p className="pt-training-local-draft-card__meta">
                                Fitness targets: {formatSummaryList(draft.fitnessTargets)}
                              </p>
                              <p className="pt-training-local-draft-card__meta">
                                Fitness attributes: {formatSummaryList(draft.fitnessAttributes)}
                              </p>
                              {draft.tags.length > 0 ? (
                                <p className="pt-training-local-draft-card__meta">
                                  Tags: {formatSummaryList(draft.tags)}
                                </p>
                              ) : null}
                              <p className="pt-training-local-draft-card__note">
                                Exercise count: {draft.exercises.length}
                                {draft.timedByDuration ? " | Timed by duration: Yes" : " | Timed by duration: No"}
                              </p>
                              {draft.media ? (
                                <p className="pt-training-local-draft-card__note">
                                  Media: {draft.media.name}
                                </p>
                              ) : null}
                              {draft.publishStatus === "ready" ? (
                                <>
                                  <p className="pt-training-local-draft-card__status">
                                    Ready to publish
                                  </p>
                                  <p className="pt-training-local-draft-card__portfolio">
                                    Portfolio folders: {formatPublishTargetsSummary(draft.publishTargets ?? [])}
                                  </p>
                                </>
                              ) : null}
                            </div>
                          </button>
                          {draft.publishStatus === "ready" && (draft.publishTargets ?? []).length > 0 ? (
                            <div className="pt-training-local-draft-card__portfolio-targets">
                              {dedupePublishTargets(draft.publishTargets ?? []).map((target) =>
                                target.type === "existing-folder" && target.id ? (
                                  <button
                                    key={`${target.type}:${target.id}`}
                                    type="button"
                                    className="pt-training-local-draft-card__portfolio-button mobile-focus-ring"
                                    onClick={() => {
                                      openPortfolioFolderDetail(target.id as string);
                                    }}
                                  >
                                    {target.name}
                                  </button>
                                ) : (
                                  <span
                                    key={`${target.type}:${target.id ?? target.name}`}
                                    className="pt-training-local-draft-card__portfolio-pill"
                                  >
                                    {target.name}
                                  </span>
                                ),
                              )}
                            </div>
                          ) : null}
                          <div className="pt-training-local-draft-card__actions">
                            <button
                              type="button"
                              className="pt-training-local-draft-action mobile-focus-ring"
                              onClick={() => {
                                openRoutineDraftPublishDialog(draft);
                              }}
                            >
                              Publish Routine
                            </button>
                            <button
                              type="button"
                              className="pt-training-local-draft-remove mobile-focus-ring"
                              onClick={() => {
                                openRoutineDraftRemovalDialog(draft);
                              }}
                              aria-label={`Remove local routine draft ${draft.routineName}`}
                            >
                              Remove
                            </button>
                          </div>
                        </MobileCard>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </MobileSection>

          {detailErrorMessages.length > 0 && view.hasFolders ? (
            <MobileSection
              eyebrow="Partial data"
              title="Some training details are unavailable"
              description="Folder blocks still render from the PT folders route while linked training details stay limited to the package and routine routes that succeeded."
            >
              <TrainingStateCard title="Partial PT training data" message={detailErrorMessages.join(" ")} />
            </MobileSection>
          ) : null}
        </>
      ) : null}

      {portfolioDisplayDialogOpen ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePortfolioDisplayDialog();
            }
          }}
        >
          <section
            id="pt-training-portfolio-display-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-portfolio-display-dialog-title"
            className="pt-training-modal"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local portfolio display</p>
                <h2 id="pt-training-portfolio-display-dialog-title" className="mobile-section__title">
                  Edit Training Portfolio Display
                </h2>
                <p className="mobile-section__description">
                  Folder display preferences and local portfolio folders stay in the browser until PT folder save routes are wired.
                </p>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closePortfolioDisplayDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form pt-training-portfolio-asset-detail">
              <fieldset className="pt-training-builder-form__field pt-training-builder-form__toggle-field">
                <legend>Display mode</legend>
                <div
                  className="pt-training-builder-form__toggle-group"
                  role="radiogroup"
                  aria-label="Training portfolio display mode"
                >
                  <label className="pt-training-builder-form__toggle">
                    <input
                      type="radio"
                      name="pt-training-portfolio-display-mode"
                      checked={portfolioDisplayMode === "recent"}
                      onChange={() => {
                        handlePortfolioDisplayModeChange("recent");
                      }}
                    />
                    <span>Most Recent</span>
                  </label>
                  <label className="pt-training-builder-form__toggle">
                    <input
                      type="radio"
                      name="pt-training-portfolio-display-mode"
                      checked={portfolioDisplayMode === "pinned"}
                      onChange={() => {
                        handlePortfolioDisplayModeChange("pinned");
                      }}
                    />
                    <span>Pinned</span>
                  </label>
                </div>
              </fieldset>

              {portfolioDisplayMode === "pinned" ? (
                <div className="pt-training-builder-form__field">
                  <label>Pinned portfolio folders</label>
                  <div className="pt-training-publish-folder-picker__list">
                    {portfolioDirectoryFolders.map((folder) => (
                      <label key={folder.id} className="pt-training-publish-folder-picker__option">
                        <input
                          type="checkbox"
                          checked={pinnedPortfolioFolderIds.includes(folder.id)}
                          onChange={() => {
                            togglePinnedPortfolioFolder(folder.id);
                          }}
                        />
                        <span>{folder.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="pt-training-builder-form__field">
                <button
                  type="button"
                  className="pt-training-local-draft-action mobile-focus-ring"
                  onClick={() => {
                    setPortfolioCreateFolderOpen((current) => !current);
                    setPortfolioDisplayError(null);
                  }}
                >
                  Create New Folder
                </button>
              </div>

              {portfolioCreateFolderOpen ? (
                <div className="pt-training-builder-form__field">
                  <label htmlFor="pt-training-local-portfolio-name">Folder name</label>
                  <input
                    id="pt-training-local-portfolio-name"
                    value={portfolioNewFolderName}
                    onChange={(event) => {
                      setPortfolioNewFolderName(event.target.value);
                      setPortfolioDisplayError(null);
                    }}
                    placeholder="Strength Builder"
                  />
                </div>
              ) : null}

              {portfolioDisplayError ? (
                <p className="pt-training-builder-form__error" role="alert">
                  {portfolioDisplayError}
                </p>
              ) : null}

              <div className="pt-training-modal__actions pt-training-modal__actions--centered">
                <button
                  type="button"
                  className="pt-training-modal__secondary-action mobile-focus-ring"
                  onClick={closePortfolioDisplayDialog}
                >
                  Cancel
                </button>
                {portfolioCreateFolderOpen ? (
                  <button
                    type="button"
                    className="pt-training-modal__primary-action mobile-focus-ring"
                    onClick={handleCreatePortfolioFolder}
                  >
                    Add Folder
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {selectedPortfolioFolder ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePortfolioFolderDetail();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-folder-detail-title"
            className="pt-training-modal"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Portfolio Folder</p>
                <h2 id="pt-training-folder-detail-title" className="mobile-section__title">
                  {portfolioFolderDetailEditMode && portfolioFolderEditForm
                    ? portfolioFolderEditForm.title || selectedPortfolioFolder.title
                    : selectedPortfolioFolder.title}
                </h2>
                <p className="mobile-section__description">
                  {formatUpdatedLabel(selectedPortfolioFolder.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closePortfolioFolderDetail}
              >
                Close
              </button>
            </div>

            {!portfolioFolderDetailEditMode || !portfolioFolderEditForm ? (
              <div className="pt-training-modal__form pt-training-builder-form pt-training-folder-detail">
                {selectedPortfolioFolder.source === "local" ? (
                  <p className="pt-training-builder-form__helper">
                    This portfolio folder is stored locally until PT folder save routes are wired.
                  </p>
                ) : null}
                {selectedPortfolioFolder.tags.length > 0 ? (
                  <div className="pt-training-publish-folder-picker__list">
                    {selectedPortfolioFolder.tags.map((tag) => (
                      <span key={tag} className="pt-training-publish-folder-picker__local-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="pt-training-builder-form__field">
                  <label>Portfolio Assets</label>
                  {selectedPortfolioFolder.assets.length > 0 ? (
                    <div className="pt-training-portfolio-assets">
                      {selectedPortfolioFolder.assets.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          className="pt-training-portfolio-asset-row mobile-focus-ring"
                          aria-label={`Open ${formatPortfolioAssetTypeLabel(asset.type)} asset ${asset.title}`}
                          onClick={() => {
                            openPortfolioAssetDetail(selectedPortfolioFolder.id, asset.id);
                          }}
                        >
                          <span className="pt-training-portfolio-asset-row__copy">
                            <span className="pt-training-portfolio-list-title">{asset.title}</span>
                            {asset.type === "routine" ? (
                              <span className="pt-training-portfolio-list-description">
                                {asset.exercises.length} exercise{asset.exercises.length === 1 ? "" : "s"}
                              </span>
                            ) : asset.objective || asset.description ? (
                              <span className="pt-training-portfolio-list-description">
                                {asset.objective ?? asset.description}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={[
                              "pt-training-portfolio-asset-row__tag",
                              asset.type === "routine"
                                ? "pt-training-portfolio-asset-row__tag--routine"
                                : "pt-training-portfolio-asset-row__tag--rep",
                            ].join(" ")}
                          >
                            {formatPortfolioAssetTypeLabel(asset.type)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="pt-training-builder-form__helper">
                      No assets have been added to this portfolio folder yet.
                    </p>
                  )}
                </div>
                <div className="pt-training-modal__actions pt-training-modal__actions--centered">
                  {selectedPortfolioFolder.source !== "system-local" ? (
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={openPortfolioFolderEditMode}
                    >
                      Edit Folder
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="pt-training-modal__form pt-training-builder-form pt-training-folder-edit">
                {selectedPortfolioFolder.source === "bff" ? (
                  <p className="pt-training-builder-form__helper">
                    Edits are stored locally until PT folder save routes are wired.
                  </p>
                ) : null}

                <div className="pt-training-builder-form__field">
                  <label htmlFor="pt-training-folder-edit-title">Folder title</label>
                  <input
                    id="pt-training-folder-edit-title"
                    value={portfolioFolderEditForm.title}
                    onChange={(event) => {
                      updatePortfolioFolderEditForm((current) => ({
                        ...current,
                        title: event.target.value,
                        error: null,
                      }));
                    }}
                  />
                </div>

                <div className="pt-training-builder-form__field">
                  <label htmlFor="pt-training-folder-edit-thumbnail">Thumbnail image</label>
                  <input
                    id="pt-training-folder-edit-thumbnail"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      handlePortfolioFolderThumbnailChange(event.target.files?.[0] ?? null);
                    }}
                  />
                  {portfolioFolderEditForm.thumbnailError ? (
                    <p className="pt-training-builder-form__error" role="alert">
                      {portfolioFolderEditForm.thumbnailError}
                    </p>
                  ) : null}
                </div>

                <div className="pt-training-builder-form__field">
                  <label htmlFor="pt-training-folder-edit-color">Folder color</label>
                  <select
                    id="pt-training-folder-edit-color"
                    value={portfolioFolderEditForm.color}
                    onChange={(event) => {
                      updatePortfolioFolderEditForm((current) => ({
                        ...current,
                        color: event.target.value as LocalPTPortfolioFolderColor,
                      }));
                    }}
                  >
                    <option value="grey">Grey</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                    <option value="blue">Blue</option>
                    <option value="amber">Amber</option>
                  </select>
                </div>

                <div className="pt-training-builder-form__field">
                  <label htmlFor="pt-training-folder-edit-tag-input">Tags</label>
                  <div className="pt-training-folder-edit__inline-actions">
                    <input
                      id="pt-training-folder-edit-tag-input"
                      value={portfolioFolderEditForm.tagInput}
                      onChange={(event) => {
                        updatePortfolioFolderEditForm((current) => ({
                          ...current,
                          tagInput: event.target.value,
                        }));
                      }}
                    />
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={handleAddPortfolioFolderTag}
                    >
                      Add
                    </button>
                  </div>
                  {portfolioFolderEditForm.tags.length > 0 ? (
                    <div className="pt-training-publish-folder-picker__list">
                      {portfolioFolderEditForm.tags.map((tag) => (
                        <span key={tag} className="pt-training-folder-edit__tag">
                          <span className="pt-training-folder-edit__tag-label">{tag}</span>
                          <button
                            type="button"
                            className="pt-training-folder-edit__tag-remove mobile-focus-ring"
                            aria-label={`Remove ${tag} tag`}
                            onClick={() => {
                              updatePortfolioFolderEditForm((current) => ({
                                ...current,
                                tags: current.tags.filter((item) => item !== tag),
                              }));
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="pt-training-builder-form__field">
                  <label htmlFor="pt-training-folder-edit-exercise-input">Exercises</label>
                  <datalist id="pt-training-portfolio-exercise-suggestions">
                    {exerciseNameSuggestions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  <div className="pt-training-folder-edit__inline-actions">
                    <input
                      id="pt-training-folder-edit-exercise-input"
                      list="pt-training-portfolio-exercise-suggestions"
                      value={portfolioFolderEditForm.exerciseInput}
                      onChange={(event) => {
                        updatePortfolioFolderEditForm((current) => ({
                          ...current,
                          exerciseInput: event.target.value,
                        }));
                      }}
                    />
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={handleAddPortfolioFolderExercise}
                    >
                      Add Exercise
                    </button>
                  </div>
                  {portfolioFolderEditForm.assets.length > 0 ? (
                    <ul className="pt-training-portfolio-list-items">
                      {portfolioFolderEditForm.assets.map((asset) => (
                        <li key={asset.id} className="pt-training-portfolio-list-item">
                          <div className="pt-training-folder-edit__inline-actions">
                            <div className="pt-training-portfolio-asset-row__copy">
                              <p className="pt-training-portfolio-list-title">{asset.title}</p>
                              <span
                                className={[
                                  "pt-training-portfolio-asset-row__tag",
                                  asset.type === "routine"
                                    ? "pt-training-portfolio-asset-row__tag--routine"
                                    : "pt-training-portfolio-asset-row__tag--rep",
                                ].join(" ")}
                              >
                                {formatPortfolioAssetTypeLabel(asset.type)}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="pt-training-modal__secondary-action mobile-focus-ring"
                              onClick={() => {
                                updatePortfolioFolderEditForm((current) => ({
                                  ...current,
                                  assets: current.assets.filter((item) => item.id !== asset.id),
                                }));
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {portfolioFolderEditForm.error ? (
                  <p className="pt-training-builder-form__error" role="alert">
                    {portfolioFolderEditForm.error}
                  </p>
                ) : null}

                <div className="pt-training-modal__actions pt-training-modal__actions--centered">
                  <button
                    type="button"
                    className="pt-training-modal__secondary-action mobile-focus-ring"
                    onClick={closePortfolioFolderEditMode}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pt-training-modal__primary-action mobile-focus-ring"
                    onClick={handleSavePortfolioFolderChanges}
                  >
                    Save local changes
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {selectedPortfolioFolder && selectedPortfolioAssetRecord ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePortfolioAssetDetail();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-portfolio-asset-detail-title"
            className="pt-training-modal pt-training-portfolio-asset-detail"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Portfolio Asset</p>
                <h2
                  id="pt-training-portfolio-asset-detail-title"
                  className="mobile-section__title"
                >
                  {selectedPortfolioAssetRecord.title}
                </h2>
                <p className="mobile-section__description">
                  {formatUpdatedLabel(selectedPortfolioAssetRecord.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closePortfolioAssetDetail}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
              <div className="pt-training-portfolio-assets">
                <span
                  className={[
                    "pt-training-portfolio-asset-row__tag",
                    selectedPortfolioAssetRecord.type === "routine"
                      ? "pt-training-portfolio-asset-row__tag--routine"
                      : "pt-training-portfolio-asset-row__tag--rep",
                  ].join(" ")}
                >
                  {formatPortfolioAssetTypeLabel(selectedPortfolioAssetRecord.type)}
                </span>
              </div>

              {selectedPortfolioAssetRecord.type === "routine" ? (
                <>
                  {selectedPortfolioAssetRecord.description ? (
                    <p className="pt-training-builder-form__helper">
                      {selectedPortfolioAssetRecord.description}
                    </p>
                  ) : null}
                  <p className="pt-training-builder-form__helper">
                    Fitness targets: {formatSummaryList(selectedPortfolioAssetRecord.fitnessTargets)}
                  </p>
                  <p className="pt-training-builder-form__helper">
                    Fitness attributes: {formatSummaryList(selectedPortfolioAssetRecord.fitnessAttributes)}
                  </p>
                  {selectedPortfolioAssetRecord.tags.length > 0 ? (
                    <div className="pt-training-builder-form__field">
                      <label>Tags</label>
                      <div className="pt-training-folder-edit__tags">
                        {selectedPortfolioAssetRecord.tags.map((tag) => (
                          <span key={tag} className="pt-training-folder-edit__tag">
                            <span className="pt-training-folder-edit__tag-label">{tag}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="pt-training-builder-form__helper">
                    Timed by duration: {selectedPortfolioAssetRecord.timedByDuration ? "Yes" : "No"}
                  </p>
                  {selectedPortfolioAssetRecord.media ? (
                    <div className="pt-training-builder-form__field">
                      <label>Media</label>
                      <div className="pt-training-media-picker__preview">
                        {renderTrainingMediaPreview(
                          selectedPortfolioAssetRecord.media,
                          "pt-training-media-picker__preview-media",
                        )}
                        <p className="pt-training-builder-form__helper">
                          {selectedPortfolioAssetRecord.media.name} (
                          {formatMediaSize(selectedPortfolioAssetRecord.media.size)})
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div className="pt-training-builder-form__field">
                    <label>Exercises</label>
                    {selectedPortfolioAssetRecord.exercises.length > 0 ? (
                      <ul className="pt-training-portfolio-list-items">
                        {selectedPortfolioAssetRecord.exercises.map((exercise) => (
                          <li key={exercise.id} className="pt-training-portfolio-list-item">
                            <div className="pt-training-portfolio-asset-row__copy">
                              <p className="pt-training-portfolio-list-title">{exercise.exerciseName}</p>
                              <p className="pt-training-portfolio-list-description">
                                Rep goal: {exercise.repGoal || "Not set"}
                              </p>
                              <p className="pt-training-portfolio-list-description">
                                {exercise.instructions || "No instructions added."}
                              </p>
                              <p className="pt-training-portfolio-list-description">
                                Weights involved: {exercise.weightsInvolved ? "Yes" : "No"}
                              </p>
                              {exercise.media ? (
                                <div className="pt-training-media-picker__preview">
                                  {renderTrainingMediaPreview(
                                    exercise.media,
                                    "pt-training-media-picker__preview-media",
                                  )}
                                  <p className="pt-training-portfolio-list-description">
                                    Media: {exercise.media.name}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="pt-training-builder-form__helper">
                        No exercises have been added to this routine yet.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                portfolioRepAssetEditForm ? (
                  <>
                    <div className="pt-training-builder-form__field">
                      <label htmlFor="pt-training-rep-asset-edit-name">Exercise</label>
                      <input
                        id="pt-training-rep-asset-edit-name"
                        value={portfolioRepAssetEditForm.exerciseName}
                        onChange={(event) => {
                          updatePortfolioRepAssetEditForm((current) => ({
                            ...current,
                            exerciseName: event.target.value,
                            error: null,
                          }));
                        }}
                      />
                    </div>

                    <div className="pt-training-builder-form__field">
                      <label htmlFor="pt-training-rep-asset-edit-instructions">Instructions (optional)</label>
                      <textarea
                        id="pt-training-rep-asset-edit-instructions"
                        value={portfolioRepAssetEditForm.instructions}
                        onChange={(event) => {
                          updatePortfolioRepAssetEditForm((current) => ({
                            ...current,
                            instructions: event.target.value,
                          }));
                        }}
                        rows={4}
                      />
                    </div>

                    <fieldset className="pt-training-builder-form__field pt-training-builder-form__toggle-field">
                      <legend>Weights Involved?</legend>
                      <div className="pt-training-builder-form__toggle-group" role="radiogroup" aria-label="Weights Involved?">
                        <label className="pt-training-builder-form__toggle">
                          <input
                            type="radio"
                            name="pt-training-rep-asset-edit-weights"
                            checked={portfolioRepAssetEditForm.weightsInvolved}
                            onChange={() => {
                              updatePortfolioRepAssetEditForm((current) => ({
                                ...current,
                                weightsInvolved: true,
                              }));
                            }}
                          />
                          <span>Yes</span>
                        </label>
                        <label className="pt-training-builder-form__toggle">
                          <input
                            type="radio"
                            name="pt-training-rep-asset-edit-weights"
                            checked={!portfolioRepAssetEditForm.weightsInvolved}
                            onChange={() => {
                              updatePortfolioRepAssetEditForm((current) => ({
                                ...current,
                                weightsInvolved: false,
                              }));
                            }}
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </fieldset>

                    <fieldset className="pt-training-builder-form__field pt-training-routine-form__checkbox-fieldset">
                      <legend className="pt-training-routine-form__field-header">
                        <span>Fitness Target</span>
                        <button
                          type="button"
                          className="pt-training-routine-form__field-action mobile-focus-ring"
                          onClick={() => {
                            openRoutineOptionDialog("target", "rep-asset-edit");
                          }}
                        >
                          Add Target
                        </button>
                      </legend>
                      <div className="pt-training-routine-form__checkbox-grid">
                        {fitnessTargetOptions.map((option) => {
                          const optionId = `pt-training-rep-asset-target-${option.toLowerCase().replace(/\s+/g, "-")}`;
                          const checked = portfolioRepAssetEditForm.fitnessTargets.some(
                            (item) => normalizeOptionValue(item) === normalizeOptionValue(option),
                          );

                          return (
                            <label key={option} htmlFor={optionId} className="pt-training-routine-form__checkbox-option">
                              <input
                                id={optionId}
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  updatePortfolioRepAssetEditForm((current) => ({
                                    ...current,
                                    fitnessTargets: current.fitnessTargets.some(
                                      (item) => normalizeOptionValue(item) === normalizeOptionValue(option),
                                    )
                                      ? current.fitnessTargets.filter(
                                          (item) => normalizeOptionValue(item) !== normalizeOptionValue(option),
                                        )
                                      : [...current.fitnessTargets, option],
                                  }));
                                }}
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <fieldset className="pt-training-builder-form__field pt-training-routine-form__checkbox-fieldset">
                      <legend className="pt-training-routine-form__field-header">
                        <span>Fitness Attributes</span>
                        <button
                          type="button"
                          className="pt-training-routine-form__field-action mobile-focus-ring"
                          onClick={() => {
                            openRoutineOptionDialog("attribute", "rep-asset-edit");
                          }}
                        >
                          Add Attribute
                        </button>
                      </legend>
                      <div className="pt-training-routine-form__checkbox-grid">
                        {fitnessAttributeOptions.map((option) => {
                          const optionId = `pt-training-rep-asset-attribute-${option.toLowerCase().replace(/\s+/g, "-")}`;
                          const checked = portfolioRepAssetEditForm.fitnessAttributes.some(
                            (item) => normalizeOptionValue(item) === normalizeOptionValue(option),
                          );

                          return (
                            <label key={option} htmlFor={optionId} className="pt-training-routine-form__checkbox-option">
                              <input
                                id={optionId}
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  updatePortfolioRepAssetEditForm((current) => ({
                                    ...current,
                                    fitnessAttributes: current.fitnessAttributes.some(
                                      (item) => normalizeOptionValue(item) === normalizeOptionValue(option),
                                    )
                                      ? current.fitnessAttributes.filter(
                                          (item) => normalizeOptionValue(item) !== normalizeOptionValue(option),
                                        )
                                      : [...current.fitnessAttributes, option],
                                  }));
                                }}
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="pt-training-builder-form__field">
                      <label htmlFor="pt-training-rep-asset-tag-input">Tags</label>
                      <div className="pt-training-folder-edit__inline-actions">
                        <input
                          id="pt-training-rep-asset-tag-input"
                          value={portfolioRepAssetEditForm.tagInput}
                          onChange={(event) => {
                            updatePortfolioRepAssetEditForm((current) => ({
                              ...current,
                              tagInput: event.target.value,
                            }));
                          }}
                        />
                        <button
                          type="button"
                          className="pt-training-modal__secondary-action mobile-focus-ring"
                          onClick={handleAddPortfolioRepAssetTag}
                        >
                          Add
                        </button>
                      </div>
                      {portfolioRepAssetEditForm.tags.length > 0 ? (
                        <div className="pt-training-publish-folder-picker__list">
                          {portfolioRepAssetEditForm.tags.map((tag) => (
                            <span key={tag} className="pt-training-folder-edit__tag">
                              <span className="pt-training-folder-edit__tag-label">{tag}</span>
                              <button
                                type="button"
                                className="pt-training-folder-edit__tag-remove mobile-focus-ring"
                                aria-label={`Remove ${tag} tag`}
                                onClick={() => {
                                  removePortfolioRepAssetTag(tag);
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="pt-training-builder-form__field">
                      <label>Media</label>
                      <button
                        type="button"
                        className="pt-training-modal__secondary-action pt-training-media-picker__trigger mobile-focus-ring"
                        onClick={openMediaPickerForRepAssetEdit}
                      >
                        {portfolioRepAssetEditForm.media ? "Update Media" : "Add Media"}
                      </button>
                      {portfolioRepAssetEditForm.media ? (
                        <div className="pt-training-media-picker__preview">
                          {renderTrainingMediaPreview(
                            portfolioRepAssetEditForm.media,
                            "pt-training-media-picker__preview-media",
                          )}
                          <p className="pt-training-builder-form__helper">
                            {portfolioRepAssetEditForm.media.name} ({formatMediaSize(portfolioRepAssetEditForm.media.size)})
                          </p>
                        </div>
                      ) : (
                        <p className="pt-training-builder-form__helper">
                          Add a local image, GIF, or video preview for exercise instructions.
                        </p>
                      )}
                    </div>

                    {portfolioRepAssetEditForm.error ? (
                      <p className="pt-training-builder-form__error" role="alert">
                        {portfolioRepAssetEditForm.error}
                      </p>
                    ) : null}

                    <div className="pt-training-modal__actions pt-training-modal__actions--centered">
                      <button
                        type="button"
                        className="pt-training-modal__secondary-action mobile-focus-ring"
                        onClick={closePortfolioRepAssetEditForm}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="pt-training-modal__primary-action mobile-focus-ring"
                        onClick={handleSavePortfolioRepAssetChanges}
                      >
                        Save local changes
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="pt-training-builder-form__helper">
                      Exercise: {selectedPortfolioAssetRecord.exerciseName || selectedPortfolioAssetRecord.title}
                    </p>
                    {selectedPortfolioAssetRecord.repGoal ? (
                      <p className="pt-training-builder-form__helper">
                        Rep Goal: {selectedPortfolioAssetRecord.repGoal}
                      </p>
                    ) : null}
                    <p className="pt-training-builder-form__helper">
                      Instructions: {selectedPortfolioAssetRecord.instructions || "No instructions added."}
                    </p>
                    <p className="pt-training-builder-form__helper">
                      Weights involved: {selectedPortfolioAssetRecord.weightsInvolved ? "Yes" : "No"}
                    </p>
                    <p className="pt-training-builder-form__helper">
                      Fitness targets: {formatSummaryList(selectedPortfolioAssetRecord.fitnessTargets)}
                    </p>
                    <p className="pt-training-builder-form__helper">
                      Fitness attributes: {formatSummaryList(selectedPortfolioAssetRecord.fitnessAttributes)}
                    </p>
                    <div className="pt-training-builder-form__field">
                      <label>Tags</label>
                      {selectedPortfolioAssetRecord.tags.length > 0 ? (
                        <div className="pt-training-publish-folder-picker__list">
                          {selectedPortfolioAssetRecord.tags.map((tag) => (
                            <span key={tag} className="pt-training-folder-edit__tag">
                              <span className="pt-training-folder-edit__tag-label">{tag}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="pt-training-builder-form__helper">No tags added.</p>
                      )}
                    </div>
                    {selectedPortfolioAssetRecord.media ? (
                      <div className="pt-training-media-picker__preview">
                        {renderTrainingMediaPreview(
                          selectedPortfolioAssetRecord.media,
                          "pt-training-media-picker__preview-media",
                        )}
                        <p className="pt-training-builder-form__helper">
                          Media: {selectedPortfolioAssetRecord.media.name}
                        </p>
                      </div>
                    ) : null}
                    <p className="pt-training-builder-form__helper">
                      Created on: {formatDraftTimestamp(selectedPortfolioAssetRecord.createdAt)}
                    </p>
                    <p className="pt-training-builder-form__helper">
                      Edited on: {formatDraftTimestamp(selectedPortfolioAssetRecord.updatedAt)}
                    </p>
                    <div className="pt-training-modal__actions pt-training-modal__actions--centered">
                      <button
                        type="button"
                        className="pt-training-modal__secondary-action mobile-focus-ring"
                        onClick={openPortfolioRepAssetEditForm}
                      >
                        Edit Exercise
                      </button>
                    </div>
                  </>
                )
              )}
            </div>
          </section>
        </div>
      ) : null}

      {exerciseDialogOpen ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeExerciseDialog();
            }
          }}
        >
          <section
            id="pt-training-exercise-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-exercise-dialog-title"
            className="pt-training-modal"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Single exercise draft</p>
                <h2 id="pt-training-exercise-dialog-title" className="mobile-section__title">
                  Add an Exercise
                </h2>
                <p className="mobile-section__description">
                  This form mirrors the Create a Routine exercise-entry pattern for one Rep-classified draft. It stays local until you publish it into a training portfolio folder.
                </p>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeExerciseDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form pt-training-exercise-form">
              <datalist id="pt-training-exercise-suggestions">
                {exerciseNameSuggestions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>

              <section className="pt-training-builder-form__exercise-row pt-training-exercise-form__panel">
                <div className="pt-training-builder-form__exercise-row-header">
                  <p className="pt-training-builder-form__exercise-row-title">Exercise Details</p>
                </div>

                <div className="pt-training-builder-form__field pt-training-exercise-form__field">
                  <label htmlFor="pt-training-exercise-name">Exercise</label>
                  <input
                    id="pt-training-exercise-name"
                    list="pt-training-exercise-suggestions"
                    value={exerciseName}
                    onChange={(event) => {
                      setExerciseName(event.target.value);
                      setExerciseErrors((current) => ({ ...current, exerciseName: undefined }));
                    }}
                  />
                  {exerciseErrors.exerciseName ? (
                    <p className="pt-training-builder-form__error" role="alert">
                      {exerciseErrors.exerciseName}
                    </p>
                  ) : null}
                </div>

                <div className="pt-training-builder-form__field pt-training-exercise-form__field">
                  <label htmlFor="pt-training-exercise-instructions">Instructions (optional)</label>
                  <textarea
                    id="pt-training-exercise-instructions"
                    value={exerciseInstructions}
                    onChange={(event) => {
                      setExerciseInstructions(event.target.value);
                    }}
                    rows={4}
                  />
                </div>

                <fieldset className="pt-training-builder-form__field pt-training-builder-form__toggle-field pt-training-exercise-form__field">
                  <legend>Weights Involved?</legend>
                  <p className="pt-training-builder-form__helper">
                    If Yes, clients will need a numeric weight input when this exercise is assigned in a future training package flow.
                  </p>
                  <div
                    className="pt-training-builder-form__toggle-group pt-training-exercise-form__toggle"
                    role="radiogroup"
                    aria-label="Weights Involved?"
                  >
                    <label className="pt-training-builder-form__toggle">
                      <input
                        type="radio"
                        name="pt-training-exercise-weights"
                        checked={exerciseWeightsInvolved}
                        onChange={() => {
                          setExerciseWeightsInvolved(true);
                        }}
                      />
                      <span>Yes</span>
                    </label>
                    <label className="pt-training-builder-form__toggle">
                      <input
                        type="radio"
                        name="pt-training-exercise-weights"
                        checked={!exerciseWeightsInvolved}
                        onChange={() => {
                          setExerciseWeightsInvolved(false);
                        }}
                      />
                      <span>No</span>
                    </label>
                  </div>
                </fieldset>

                <fieldset className="pt-training-builder-form__field pt-training-routine-form__checkbox-fieldset pt-training-exercise-form__field">
                  <legend className="pt-training-routine-form__field-header">
                    <span>Fitness Target</span>
                    <button
                      type="button"
                      className="pt-training-routine-form__field-action mobile-focus-ring"
                      onClick={() => {
                        openRoutineOptionDialog("target", "exercise");
                      }}
                    >
                      Add Target
                    </button>
                  </legend>
                  <p className="pt-training-builder-form__helper">
                    Which body targets does this exercise contribute to?
                  </p>
                  <div className="pt-training-routine-form__checkbox-grid">
                    {fitnessTargetOptions.map((option) => {
                      const optionId = `pt-training-exercise-target-${option.toLowerCase().replace(/\s+/g, "-")}`;
                      const checked = exerciseFitnessTargets.some(
                        (item) => normalizeOptionValue(item) === normalizeOptionValue(option),
                      );

                      return (
                        <label key={option} htmlFor={optionId} className="pt-training-routine-form__checkbox-option">
                          <input
                            id={optionId}
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              toggleSelection(option, exerciseFitnessTargets, setExerciseFitnessTargets);
                            }}
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="pt-training-builder-form__field pt-training-routine-form__checkbox-fieldset pt-training-exercise-form__field">
                  <legend className="pt-training-routine-form__field-header">
                    <span>Fitness Attributes</span>
                    <button
                      type="button"
                      className="pt-training-routine-form__field-action mobile-focus-ring"
                      onClick={() => {
                        openRoutineOptionDialog("attribute", "exercise");
                      }}
                    >
                      Add Attribute
                    </button>
                  </legend>
                  <p className="pt-training-builder-form__helper">
                    Which physical attributes does this exercise contribute to?
                  </p>
                  <div className="pt-training-routine-form__checkbox-grid">
                    {fitnessAttributeOptions.map((option) => {
                      const optionId = `pt-training-exercise-attribute-${option.toLowerCase().replace(/\s+/g, "-")}`;
                      const checked = exerciseFitnessAttributes.some(
                        (item) => normalizeOptionValue(item) === normalizeOptionValue(option),
                      );

                      return (
                        <label key={option} htmlFor={optionId} className="pt-training-routine-form__checkbox-option">
                          <input
                            id={optionId}
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              toggleSelection(option, exerciseFitnessAttributes, setExerciseFitnessAttributes);
                            }}
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="pt-training-builder-form__field pt-training-exercise-form__field">
                  <label htmlFor="pt-training-exercise-tag-input">Tags</label>
                  <div className="pt-training-folder-edit__inline-actions">
                    <input
                      id="pt-training-exercise-tag-input"
                      value={exerciseTagInput}
                      onChange={(event) => {
                        setExerciseTagInput(event.target.value);
                      }}
                    />
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={handleAddExerciseTag}
                    >
                      Add
                    </button>
                  </div>
                  {exerciseTags.length > 0 ? (
                    <div className="pt-training-publish-folder-picker__list">
                      {exerciseTags.map((tag) => (
                        <span key={tag} className="pt-training-folder-edit__tag">
                          <span className="pt-training-folder-edit__tag-label">{tag}</span>
                          <button
                            type="button"
                            className="pt-training-folder-edit__tag-remove mobile-focus-ring"
                            aria-label={`Remove ${tag} tag`}
                            onClick={() => {
                              removeExerciseTag(tag);
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="pt-training-builder-form__helper">
                      Add local-only tags to help search and organize rep assets.
                    </p>
                  )}
                </div>

                <div className="pt-training-builder-form__field pt-training-exercise-form__field">
                  <label>Media</label>
                  <button
                    type="button"
                    className="pt-training-modal__secondary-action pt-training-media-picker__trigger mobile-focus-ring"
                    onClick={openMediaPickerForExerciseDraft}
                  >
                    {exerciseMedia ? "Update Media" : "Add Media"}
                  </button>
                  {exerciseMedia ? (
                    <div className="pt-training-media-picker__preview">
                      {renderTrainingMediaPreview(exerciseMedia, "pt-training-media-picker__preview-media")}
                      <p className="pt-training-builder-form__helper">
                        {exerciseMedia.name} ({formatMediaSize(exerciseMedia.size)})
                      </p>
                    </div>
                  ) : (
                    <p className="pt-training-builder-form__helper">
                      Add a local image, GIF, or video preview for exercise instructions.
                    </p>
                  )}
                </div>
              </section>

              <div className="pt-training-modal__actions pt-training-exercise-form__actions">
                <button
                  type="button"
                  className="pt-training-modal__secondary-action mobile-focus-ring"
                  onClick={closeExerciseDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pt-training-modal__primary-action mobile-focus-ring"
                  onClick={handleSaveExerciseDraft}
                >
                  Save Exercise Draft
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {mediaPickerTarget ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeMediaPicker();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-media-picker-title"
            className="pt-training-modal pt-training-media-picker"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local-only exercise media</p>
                <h2 id="pt-training-media-picker-title" className="mobile-section__title">
                  Add Media
                </h2>
                <p className="mobile-section__description">
                  Store visual exercise instructions locally without uploading anything to the backend.
                </p>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeMediaPicker}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
              <div className="pt-training-builder-form__field">
                <label htmlFor="pt-training-media-image-input">Upload image or GIF</label>
                <input
                  id="pt-training-media-image-input"
                  type="file"
                  accept={TRAINING_IMAGE_MEDIA_ACCEPT}
                  onChange={(event) => {
                    void handleMediaSelection(event.target.files?.[0] ?? null);
                  }}
                />
                <p className="pt-training-builder-form__helper">
                  Accepts PNG, JPEG, WEBP, and GIF files up to {formatMediaSize(TRAINING_IMAGE_MEDIA_MAX_BYTES)}.
                </p>
              </div>

              <div className="pt-training-builder-form__field">
                <label htmlFor="pt-training-media-video-input">Upload video</label>
                <input
                  id="pt-training-media-video-input"
                  type="file"
                  accept={TRAINING_VIDEO_MEDIA_ACCEPT}
                  onChange={(event) => {
                    void handleMediaSelection(event.target.files?.[0] ?? null);
                  }}
                />
                <p className="pt-training-builder-form__helper">
                  Accepts MP4 and WEBM files up to {formatMediaSize(TRAINING_VIDEO_MEDIA_MAX_BYTES)}.
                </p>
              </div>

              {selectedMediaPreview ? (
                <div className="pt-training-media-picker__preview">
                  {renderTrainingMediaPreview(
                    selectedMediaPreview,
                    "pt-training-media-picker__preview-media",
                  )}
                  <p className="pt-training-builder-form__helper">
                    {selectedMediaPreview.name} ({formatMediaSize(selectedMediaPreview.size)})
                  </p>
                </div>
              ) : null}

              {mediaPickerError ? (
                <p className="pt-training-media-picker__error" role="alert">
                  {mediaPickerError}
                </p>
              ) : null}

              <div className="pt-training-modal__actions pt-training-modal__actions--centered">
                {selectedMediaPreview ? (
                  <button
                    type="button"
                    className="pt-training-modal__secondary-action mobile-focus-ring"
                    onClick={removeSelectedMedia}
                  >
                    Remove Media
                  </button>
                ) : null}
                <button
                  type="button"
                  className="pt-training-modal__secondary-action mobile-focus-ring"
                  onClick={closeMediaPicker}
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {routineDialogOpen ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeRoutineDialog();
            }
          }}
        >
          <section
            id="pt-training-routine-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-routine-dialog-title"
            className="pt-training-modal pt-training-routine-form"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local builder staging</p>
                <h2 id="pt-training-routine-dialog-title" className="mobile-section__title">
                  Create a Routine
                </h2>
                <p className="mobile-section__description">
                  This draft stays local to the browser until PT routine save routes are wired. If Weights Involved is Yes, future client assignments will need a numeric weight input for that exercise.
                </p>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeRoutineDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
              {routineDialogPage === "details" ? (
                <>
                  <div className="pt-training-builder-form__section-copy">
                    <p className="pt-training-builder-form__section-eyebrow">Page 1</p>
                    <h3 className="pt-training-builder-form__section-title">Routine Details</h3>
                  </div>

                  <div className="pt-training-builder-form__field">
                    <label htmlFor="pt-training-routine-name">Routine name</label>
                    <input
                      id="pt-training-routine-name"
                      value={routineName}
                      onChange={(event) => {
                        setRoutineName(event.target.value);
                        setRoutineDetailsErrors((current) => ({ ...current, routineName: undefined }));
                      }}
                    />
                    {routineDetailsErrors.routineName ? (
                      <p className="pt-training-builder-form__error" role="alert">
                        {routineDetailsErrors.routineName}
                      </p>
                    ) : null}
                  </div>

                  <div className="pt-training-builder-form__field">
                    <label htmlFor="pt-training-routine-description">Description</label>
                    <textarea
                      id="pt-training-routine-description"
                      value={routineDescription}
                      onChange={(event) => {
                        setRoutineDescription(event.target.value);
                      }}
                      rows={4}
                    />
                  </div>

                  <fieldset className="pt-training-builder-form__field pt-training-routine-form__checkbox-fieldset">
                    <legend className="pt-training-routine-form__field-header">
                      <span>Fitness Target</span>
                      <button
                        type="button"
                        className="pt-training-routine-form__field-action mobile-focus-ring"
                        onClick={() => {
                          openRoutineOptionDialog("target");
                        }}
                      >
                        Add Target
                      </button>
                    </legend>
                    <p className="pt-training-builder-form__helper">
                      Which body targets does this routine contribute to?
                    </p>
                    <div className="pt-training-routine-form__checkbox-grid">
                      {fitnessTargetOptions.map((option) => {
                        const optionId = `pt-training-routine-target-${option.toLowerCase().replace(/\s+/g, "-")}`;
                        const checked = fitnessTargets.some(
                          (item) => normalizeOptionValue(item) === normalizeOptionValue(option),
                        );

                        return (
                          <label key={option} htmlFor={optionId} className="pt-training-routine-form__checkbox-option">
                            <input
                              id={optionId}
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                toggleSelection(option, fitnessTargets, setFitnessTargets);
                              }}
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="pt-training-builder-form__field pt-training-routine-form__checkbox-fieldset">
                    <legend className="pt-training-routine-form__field-header">
                      <span>Fitness Attributes</span>
                      <button
                        type="button"
                        className="pt-training-routine-form__field-action mobile-focus-ring"
                        onClick={() => {
                          openRoutineOptionDialog("attribute");
                        }}
                      >
                        Add Attribute
                      </button>
                    </legend>
                    <p className="pt-training-builder-form__helper">
                      Which physical attributes does this routine contribute to?
                    </p>
                    <div className="pt-training-routine-form__checkbox-grid">
                      {fitnessAttributeOptions.map((option) => {
                        const optionId = `pt-training-routine-attribute-${option.toLowerCase().replace(/\s+/g, "-")}`;
                        const checked = fitnessAttributes.some(
                          (item) => normalizeOptionValue(item) === normalizeOptionValue(option),
                        );

                        return (
                          <label key={option} htmlFor={optionId} className="pt-training-routine-form__checkbox-option">
                            <input
                              id={optionId}
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                toggleSelection(option, fitnessAttributes, setFitnessAttributes);
                              }}
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="pt-training-builder-form__field">
                    <label htmlFor="pt-training-routine-tag-input">Tags</label>
                    <div className="pt-training-folder-edit__tag-input-row">
                      <input
                        id="pt-training-routine-tag-input"
                        value={routineTagInput}
                        onChange={(event) => {
                          setRoutineTagInput(event.target.value);
                        }}
                      />
                      <button
                        type="button"
                        className="pt-training-modal__secondary-action mobile-focus-ring"
                        onClick={handleAddRoutineTag}
                      >
                        Add
                      </button>
                    </div>
                    {routineTags.length > 0 ? (
                      <div className="pt-training-folder-edit__tags">
                        {routineTags.map((tag) => (
                          <span key={tag} className="pt-training-folder-edit__tag">
                            <span className="pt-training-folder-edit__tag-label">{tag}</span>
                            <button
                              type="button"
                              className="pt-training-folder-edit__tag-remove mobile-focus-ring"
                              aria-label={`Remove ${tag} tag`}
                              onClick={() => {
                                removeRoutineTag(tag);
                              }}
                            >
                              X
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="pt-training-builder-form__helper">
                        Add local-only tags to help find this routine in Training Portfolio search.
                      </p>
                    )}
                  </div>

                  <div className="pt-training-builder-form__field">
                    <label>Media</label>
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action pt-training-media-picker__trigger mobile-focus-ring"
                      onClick={openMediaPickerForRoutineDraft}
                    >
                      {routineMedia ? "Update Media" : "Add Media"}
                    </button>
                    {routineMedia ? (
                      <div className="pt-training-media-picker__preview">
                        {renderTrainingMediaPreview(
                          routineMedia,
                          "pt-training-media-picker__preview-media",
                        )}
                        <p className="pt-training-builder-form__helper">
                          {routineMedia.name} ({formatMediaSize(routineMedia.size)})
                        </p>
                      </div>
                    ) : (
                      <p className="pt-training-builder-form__helper">
                        Add a local image, GIF, or video preview for the overall routine.
                      </p>
                    )}
                  </div>

                  <fieldset className="pt-training-builder-form__field pt-training-builder-form__toggle-field">
                    <legend>Timed by duration</legend>
                    <div className="pt-training-builder-form__toggle-group" role="radiogroup" aria-label="Timed by duration">
                      <label className="pt-training-builder-form__toggle">
                        <input
                          type="radio"
                          name="pt-training-routine-timed"
                          checked={timedByDuration}
                          onChange={() => {
                            setTimedByDuration(true);
                          }}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="pt-training-builder-form__toggle">
                        <input
                          type="radio"
                          name="pt-training-routine-timed"
                          checked={!timedByDuration}
                          onChange={() => {
                            setTimedByDuration(false);
                          }}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </fieldset>

                  {isRoutineEditMode ? (
                    <div className="pt-training-modal__actions pt-training-modal__actions--centered pt-training-routine-form__actions--edit-page-one">
                      <button
                        type="button"
                        className="pt-training-modal__secondary-action pt-training-routine-form__save-draft-button mobile-focus-ring"
                        onClick={handleSaveRoutineDetailsDraft}
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        className="pt-training-modal__secondary-action mobile-focus-ring"
                        onClick={closeRoutineDialog}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="pt-training-modal__primary-action mobile-focus-ring"
                        onClick={handleRoutineNextPage}
                      >
                        Review Exercises
                      </button>
                    </div>
                  ) : (
                    <div className="pt-training-modal__actions">
                      <button
                        type="button"
                        className="pt-training-modal__secondary-action mobile-focus-ring"
                        onClick={closeRoutineDialog}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="pt-training-modal__primary-action mobile-focus-ring"
                        onClick={handleRoutineNextPage}
                      >
                        Next: Add Exercises
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="pt-training-builder-form__section-copy">
                    <p className="pt-training-builder-form__section-eyebrow">Page 2</p>
                    <h3 className="pt-training-builder-form__section-title">Routine Exercises</h3>
                  </div>

                  <datalist id="pt-training-routine-exercise-suggestions">
                    {exerciseNameSuggestions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>

                  {activeRoutineRow ? (
                    <section className="pt-training-builder-form__exercise-row">
                      <div className="pt-training-builder-form__exercise-row-header">
                        <p className="pt-training-builder-form__exercise-row-title">
                          Exercise {activeRoutineExerciseIndex + 1}
                        </p>
                        {routineRows.length > 1 ? (
                          <button
                            type="button"
                            className="pt-training-local-draft-remove mobile-focus-ring"
                            onClick={() => {
                              handleRemoveRoutineExerciseRow(activeRoutineRow.id);
                            }}
                          >
                            Remove exercise row
                          </button>
                        ) : null}
                      </div>

                      <div className="pt-training-builder-form__field">
                        <label htmlFor={`pt-training-routine-exercise-name-${activeRoutineRow.id}`}>Exercise</label>
                        <input
                          id={`pt-training-routine-exercise-name-${activeRoutineRow.id}`}
                          list="pt-training-routine-exercise-suggestions"
                          value={activeRoutineRow.exerciseName}
                          onChange={(event) => {
                            handleRoutineRowChange(activeRoutineRow.id, "exerciseName", event.target.value);
                          }}
                        />
                        {routineRowErrors[activeRoutineRow.id]?.exerciseName ? (
                          <p className="pt-training-builder-form__error" role="alert">
                            {routineRowErrors[activeRoutineRow.id]?.exerciseName}
                          </p>
                        ) : null}
                      </div>

                      <div className="pt-training-builder-form__field">
                        <label htmlFor={`pt-training-routine-rep-goal-${activeRoutineRow.id}`}>Rep Goal</label>
                        <input
                          id={`pt-training-routine-rep-goal-${activeRoutineRow.id}`}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          value={activeRoutineRow.repGoal}
                          onChange={(event) => {
                            handleRoutineRowChange(
                              activeRoutineRow.id,
                              "repGoal",
                              sanitizeNumericInput(event.target.value),
                            );
                          }}
                        />
                        {routineRowErrors[activeRoutineRow.id]?.repGoal ? (
                          <p className="pt-training-builder-form__error" role="alert">
                            {routineRowErrors[activeRoutineRow.id]?.repGoal}
                          </p>
                        ) : null}
                      </div>

                      <div className="pt-training-builder-form__field">
                        <label htmlFor={`pt-training-routine-instructions-${activeRoutineRow.id}`}>Instructions</label>
                        <textarea
                          id={`pt-training-routine-instructions-${activeRoutineRow.id}`}
                          value={activeRoutineRow.instructions}
                          onChange={(event) => {
                            handleRoutineRowChange(activeRoutineRow.id, "instructions", event.target.value);
                          }}
                          rows={4}
                        />
                        {routineRowErrors[activeRoutineRow.id]?.instructions ? (
                          <p className="pt-training-builder-form__error" role="alert">
                            {routineRowErrors[activeRoutineRow.id]?.instructions}
                          </p>
                        ) : null}
                      </div>

                      <fieldset className="pt-training-builder-form__field pt-training-builder-form__toggle-field">
                        <legend>Weights Involved?</legend>
                        <p className="pt-training-builder-form__helper">
                          If Yes, clients will need a numeric weight input when this exercise is assigned in a future training package flow.
                        </p>
                        <div
                          className="pt-training-builder-form__toggle-group"
                          role="radiogroup"
                          aria-label={`Weights Involved for exercise ${activeRoutineExerciseIndex + 1}`}
                        >
                          <label className="pt-training-builder-form__toggle">
                            <input
                              type="radio"
                              name={`pt-training-routine-weights-${activeRoutineRow.id}`}
                              checked={activeRoutineRow.weightsInvolved}
                              onChange={() => {
                                handleRoutineRowChange(activeRoutineRow.id, "weightsInvolved", true);
                              }}
                            />
                            <span>Yes</span>
                          </label>
                          <label className="pt-training-builder-form__toggle">
                            <input
                              type="radio"
                              name={`pt-training-routine-weights-${activeRoutineRow.id}`}
                              checked={!activeRoutineRow.weightsInvolved}
                              onChange={() => {
                                handleRoutineRowChange(activeRoutineRow.id, "weightsInvolved", false);
                              }}
                            />
                            <span>No</span>
                          </label>
                        </div>
                      </fieldset>

                      <div className="pt-training-builder-form__field">
                        <label>Media</label>
                        <button
                          type="button"
                          className="pt-training-modal__secondary-action pt-training-media-picker__trigger mobile-focus-ring"
                          onClick={() => {
                            openMediaPickerForRoutineRow(activeRoutineRow.id);
                          }}
                        >
                          {activeRoutineRow.media ? "Update Media" : "Add Media"}
                        </button>
                        {activeRoutineRow.media ? (
                          <div className="pt-training-media-picker__preview">
                            {renderTrainingMediaPreview(
                              activeRoutineRow.media,
                              "pt-training-media-picker__preview-media",
                            )}
                            <p className="pt-training-builder-form__helper">
                              {activeRoutineRow.media.name} ({formatMediaSize(activeRoutineRow.media.size)})
                            </p>
                          </div>
                        ) : (
                          <p className="pt-training-builder-form__helper">
                            Add a local image, GIF, or video preview for this exercise row.
                          </p>
                        )}
                      </div>
                    </section>
                  ) : null}

                  <div className="pt-training-routine-form__add-exercise-wrap">
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={handleAddRoutineExerciseRow}
                    >
                      Add Another Exercise
                    </button>
                  </div>

                  {routineRows.length > 1 ? (
                    <div className="pt-training-routine-form__exercise-nav">
                      <button
                        type="button"
                        className="pt-training-routine-form__exercise-nav-button mobile-focus-ring"
                        onClick={() => {
                          setActiveRoutineExerciseIndex((current) => Math.max(0, current - 1));
                        }}
                        disabled={activeRoutineExerciseIndex === 0}
                        aria-label="Previous exercise"
                      >
                        <ExerciseArrowIcon direction="left" />
                      </button>
                      <p className="pt-training-routine-form__exercise-index">
                        Exercise {activeRoutineExerciseIndex + 1} of {routineRows.length}
                      </p>
                      <button
                        type="button"
                        className="pt-training-routine-form__exercise-nav-button mobile-focus-ring"
                        onClick={() => {
                          setActiveRoutineExerciseIndex((current) =>
                            Math.min(routineRows.length - 1, current + 1),
                          );
                        }}
                        disabled={activeRoutineExerciseIndex === routineRows.length - 1}
                        aria-label="Next exercise"
                      >
                        <ExerciseArrowIcon direction="right" />
                      </button>
                    </div>
                  ) : null}

                  <div className="pt-training-modal__actions pt-training-modal__actions--centered">
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={() => {
                        setRoutineDialogPage("details");
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={closeRoutineDialog}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="pt-training-modal__primary-action mobile-focus-ring"
                      onClick={handleSaveRoutineDraft}
                    >
                      Save Routine Draft
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {exerciseDraftToRemove ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeExerciseDraftRemovalDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-remove-exercise-draft-title"
            className="pt-training-modal pt-training-routine-draft-dialog"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local draft queue</p>
                <h2 id="pt-training-remove-exercise-draft-title" className="mobile-section__title">
                  Remove Rep Draft
                </h2>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeExerciseDraftRemovalDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
              <p className="pt-training-builder-form__helper">
                Are you sure you want to Remove this Draft
              </p>
              <p className="pt-training-local-draft-card__meta">{exerciseDraftToRemove.exerciseName}</p>

              <div className="pt-training-modal__actions pt-training-modal__actions--centered">
                <button
                  type="button"
                  className="pt-training-modal__secondary-action mobile-focus-ring"
                  onClick={closeExerciseDraftRemovalDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pt-training-modal__primary-action mobile-focus-ring"
                  onClick={confirmExerciseDraftRemoval}
                >
                  Remove Draft
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {exerciseDraftPublishDialog && publishingExerciseDraft ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeExerciseDraftPublishDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-publish-exercise-draft-title"
            className="pt-training-modal pt-training-routine-draft-dialog"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local-only publish staging</p>
                <h2 id="pt-training-publish-exercise-draft-title" className="mobile-section__title">
                  Publish Exercise
                </h2>
                <p className="mobile-section__description">
                  This publishes one Rep asset into selected training portfolio folders without sending a request.
                </p>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeExerciseDraftPublishDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
              <div className="pt-training-builder-form__section-copy">
                <p className="pt-training-builder-form__section-eyebrow">Draft target</p>
                <h3 className="pt-training-builder-form__section-title">
                  {publishingExerciseDraft.exerciseName}
                </h3>
              </div>

              <div className="pt-training-builder-form__field">
                <button
                  type="button"
                  className="pt-training-local-draft-action pt-training-publish-dialog__select-folder-button mobile-focus-ring"
                  aria-haspopup="dialog"
                  aria-expanded={exerciseDraftPublishDialog.folderPickerOpen}
                  aria-controls="pt-training-publish-exercise-folder-picker"
                  onClick={() => {
                    updateExerciseDraftPublishDialog((current) => ({
                      ...current,
                      folderPickerOpen: true,
                    }));
                  }}
                >
                  Select Portfolio Folder
                </button>
                <p className="pt-training-builder-form__helper">
                  Selected folders: {formatPublishTargetsSummary(exerciseDraftPublishDialog.selectedTargets)}
                </p>
              </div>

              {exerciseDraftPublishDialog.folderPickerOpen ? (
                <section
                  id="pt-training-publish-exercise-folder-picker"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="pt-training-publish-exercise-folder-picker-title"
                  className="pt-training-publish-folder-picker"
                >
                  <div className="pt-training-publish-folder-picker__header">
                    <div className="mobile-section__copy">
                      <h4
                        id="pt-training-publish-exercise-folder-picker-title"
                        className="pt-training-builder-form__section-title"
                      >
                        Select Portfolio Folder
                      </h4>
                    </div>
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={closeExerciseDraftFolderPicker}
                    >
                      Close
                    </button>
                  </div>

                  <div className="pt-training-publish-folder-picker__list">
                    {publishablePortfolioFolderOptions.length > 0 ? (
                      publishablePortfolioFolderOptions.map((folder) => (
                        <label
                          key={folder.id}
                          className="pt-training-publish-folder-picker__option"
                        >
                          <input
                            type="checkbox"
                            checked={hasSelectedExerciseDraftPublishTarget({
                              type: "existing-folder",
                              id: folder.id,
                              name: folder.title,
                            })}
                            onChange={() => {
                              toggleExerciseDraftPublishTarget({
                                type: "existing-folder",
                                id: folder.id,
                                name: folder.title,
                              });
                            }}
                          />
                          <span>{folder.title}</span>
                        </label>
                      ))
                    ) : (
                      <p className="pt-training-builder-form__helper">
                        No existing portfolio folders are loaded yet. Add a local folder draft below.
                      </p>
                    )}

                    {exerciseDraftPublishDialog.localFolderOptions.map((folder) => (
                      <label
                        key={folder.id}
                        className="pt-training-publish-folder-picker__option"
                      >
                        <input
                          type="checkbox"
                          checked={hasSelectedExerciseDraftPublishTarget({
                            type: "local-folder-draft",
                            id: folder.id,
                            name: folder.name,
                          })}
                          onChange={() => {
                            toggleExerciseDraftPublishTarget({
                              type: "local-folder-draft",
                              id: folder.id,
                              name: folder.name,
                            });
                          }}
                        />
                        <span>{folder.name}</span>
                        <span className="pt-training-publish-folder-picker__local-tag">
                          Local folder draft
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-training-publish-folder-picker__actions">
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={openExerciseDraftNewFolderDialog}
                    >
                      Add New Folder
                    </button>
                    <button
                      type="button"
                      className="pt-training-modal__primary-action mobile-focus-ring"
                      onClick={closeExerciseDraftFolderPicker}
                    >
                      Done
                    </button>
                  </div>

                  {exerciseDraftPublishDialog.newFolderDialogOpen ? (
                    <section
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="pt-training-publish-exercise-new-folder-title"
                      className="pt-training-publish-new-folder-dialog"
                    >
                      <div className="pt-training-publish-folder-picker__header">
                        <div className="mobile-section__copy">
                          <h5
                            id="pt-training-publish-exercise-new-folder-title"
                            className="pt-training-builder-form__section-title"
                          >
                            Add New Folder
                          </h5>
                        </div>
                      </div>

                      <div className="pt-training-builder-form__field">
                        <label htmlFor="pt-training-publish-exercise-new-folder-name">Folder name</label>
                        <input
                          id="pt-training-publish-exercise-new-folder-name"
                          value={exerciseDraftPublishDialog.newFolderName}
                          onChange={(event) => {
                            updateExerciseDraftPublishDialog((current) => ({
                              ...current,
                              newFolderName: event.target.value,
                              newFolderError: null,
                            }));
                          }}
                        />
                        {exerciseDraftPublishDialog.newFolderError ? (
                          <p className="pt-training-builder-form__error" role="alert">
                            {exerciseDraftPublishDialog.newFolderError}
                          </p>
                        ) : null}
                      </div>

                      <div className="pt-training-publish-folder-picker__actions">
                        <button
                          type="button"
                          className="pt-training-modal__secondary-action mobile-focus-ring"
                          onClick={closeExerciseDraftNewFolderDialog}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="pt-training-modal__primary-action mobile-focus-ring"
                          onClick={handleAddExerciseDraftPublishFolder}
                        >
                          Add Folder
                        </button>
                      </div>
                    </section>
                  ) : null}
                </section>
              ) : null}

              {exerciseDraftPublishError ? (
                <p className="pt-training-builder-form__error" role="alert">
                  {exerciseDraftPublishError}
                </p>
              ) : null}

              {!exerciseDraftPublishDialog.folderPickerOpen ? (
                <div className="pt-training-modal__actions pt-training-modal__actions--centered">
                  <button
                    type="button"
                    className="pt-training-modal__secondary-action mobile-focus-ring"
                    onClick={closeExerciseDraftPublishDialog}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pt-training-modal__primary-action mobile-focus-ring"
                    onClick={confirmExerciseDraftPublish}
                  >
                    Publish Exercise
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {routineDraftToRemove ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeRoutineDraftRemovalDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-remove-routine-draft-title"
            className="pt-training-modal pt-training-routine-draft-dialog"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local draft queue</p>
                <h2 id="pt-training-remove-routine-draft-title" className="mobile-section__title">
                  Remove Routine Draft
                </h2>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeRoutineDraftRemovalDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
              <p className="pt-training-builder-form__helper">
                Are you sure you want to Remove this Draft
              </p>
              <p className="pt-training-local-draft-card__meta">{routineDraftToRemove.routineName}</p>

              <div className="pt-training-modal__actions pt-training-modal__actions--centered">
                <button
                  type="button"
                  className="pt-training-modal__secondary-action mobile-focus-ring"
                  onClick={closeRoutineDraftRemovalDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pt-training-modal__primary-action mobile-focus-ring"
                  onClick={confirmRoutineDraftRemoval}
                >
                  Remove Draft
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {routineDraftPublishDialog && publishingRoutineDraft ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeRoutineDraftPublishDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-publish-routine-draft-title"
            className="pt-training-modal pt-training-routine-draft-dialog"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local-only publish staging</p>
                <h2 id="pt-training-publish-routine-draft-title" className="mobile-section__title">
                  Publish Routine
                </h2>
                <p className="mobile-section__description">
                  This only marks the draft as ready locally. It does not update the real folder accordion or PT BFF data.
                </p>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeRoutineDraftPublishDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
              <div className="pt-training-builder-form__section-copy">
                <p className="pt-training-builder-form__section-eyebrow">Draft target</p>
                <h3 className="pt-training-builder-form__section-title">
                  {publishingRoutineDraft.routineName}
                </h3>
              </div>

              <div className="pt-training-builder-form__field">
                <button
                  type="button"
                  className="pt-training-local-draft-action pt-training-publish-dialog__select-folder-button mobile-focus-ring"
                  aria-haspopup="dialog"
                  aria-expanded={routineDraftPublishDialog.folderPickerOpen}
                  aria-controls="pt-training-publish-folder-picker"
                  onClick={() => {
                    updateRoutineDraftPublishDialog((current) => ({
                      ...current,
                      folderPickerOpen: true,
                    }));
                  }}
                >
                  Select Portfolio Folder
                </button>
                <p className="pt-training-builder-form__helper">
                  Selected folders: {formatPublishTargetsSummary(routineDraftPublishDialog.selectedTargets)}
                </p>
              </div>

              {routineDraftPublishDialog.folderPickerOpen ? (
                <section
                  id="pt-training-publish-folder-picker"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="pt-training-publish-folder-picker-title"
                  className="pt-training-publish-folder-picker"
                >
                  <div className="pt-training-publish-folder-picker__header">
                    <div className="mobile-section__copy">
                      <h4
                        id="pt-training-publish-folder-picker-title"
                        className="pt-training-builder-form__section-title"
                      >
                        Select Portfolio Folder
                      </h4>
                    </div>
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={closeRoutineDraftFolderPicker}
                    >
                      Close
                    </button>
                  </div>

                  <div className="pt-training-publish-folder-picker__list">
                    {publishablePortfolioFolderOptions.length > 0 ? (
                      publishablePortfolioFolderOptions.map((folder) => (
                        <label
                          key={folder.id}
                          className="pt-training-publish-folder-picker__option"
                        >
                          <input
                            type="checkbox"
                            checked={hasSelectedRoutineDraftPublishTarget({
                              type: "existing-folder",
                              id: folder.id,
                              name: folder.title,
                            })}
                            onChange={() => {
                              toggleRoutineDraftPublishTarget({
                                type: "existing-folder",
                                id: folder.id,
                                name: folder.title,
                              });
                            }}
                          />
                          <span>{folder.title}</span>
                        </label>
                      ))
                    ) : (
                      <p className="pt-training-builder-form__helper">
                        No existing portfolio folders are loaded yet. Add a local folder draft below or create folders when save routes are wired.
                      </p>
                    )}

                    {routineDraftPublishDialog.localFolderOptions.map((folder) => (
                      <label
                        key={folder.id}
                        className="pt-training-publish-folder-picker__option"
                      >
                        <input
                          type="checkbox"
                          checked={hasSelectedRoutineDraftPublishTarget({
                            type: "local-folder-draft",
                            id: folder.id,
                            name: folder.name,
                          })}
                          onChange={() => {
                            toggleRoutineDraftPublishTarget({
                              type: "local-folder-draft",
                              id: folder.id,
                              name: folder.name,
                            });
                          }}
                        />
                        <span>{folder.name}</span>
                        <span className="pt-training-publish-folder-picker__local-tag">
                          Local folder draft
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-training-publish-folder-picker__actions">
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={openRoutineDraftNewFolderDialog}
                    >
                      Add New Folder
                    </button>
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={closeRoutineDraftFolderPicker}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="pt-training-modal__primary-action mobile-focus-ring"
                      onClick={closeRoutineDraftFolderPicker}
                    >
                      Done
                    </button>
                  </div>

                  {routineDraftPublishDialog.newFolderDialogOpen ? (
                    <section
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="pt-training-publish-new-folder-title"
                      className="pt-training-publish-new-folder-dialog"
                    >
                      <div className="pt-training-publish-folder-picker__header">
                        <div className="mobile-section__copy">
                          <h5
                            id="pt-training-publish-new-folder-title"
                            className="pt-training-builder-form__section-title"
                          >
                            Add New Folder
                          </h5>
                        </div>
                      </div>

                      <div className="pt-training-builder-form__field">
                        <label htmlFor="pt-training-publish-new-folder-name">Folder name</label>
                        <input
                          id="pt-training-publish-new-folder-name"
                          value={routineDraftPublishDialog.newFolderName}
                          onChange={(event) => {
                            updateRoutineDraftPublishDialog((current) => ({
                              ...current,
                              newFolderName: event.target.value,
                              newFolderError: null,
                            }));
                          }}
                        />
                        {routineDraftPublishDialog.newFolderError ? (
                          <p className="pt-training-builder-form__error" role="alert">
                            {routineDraftPublishDialog.newFolderError}
                          </p>
                        ) : null}
                      </div>

                      <div className="pt-training-publish-folder-picker__actions">
                        <button
                          type="button"
                          className="pt-training-modal__secondary-action mobile-focus-ring"
                          onClick={closeRoutineDraftNewFolderDialog}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="pt-training-modal__primary-action mobile-focus-ring"
                          onClick={handleAddRoutineDraftPublishFolder}
                        >
                          Add Folder
                        </button>
                      </div>
                    </section>
                  ) : null}
                </section>
              ) : null}

              {routineDraftPublishError ? (
                <p className="pt-training-builder-form__error" role="alert">
                  {routineDraftPublishError}
                </p>
              ) : null}

              <div className="pt-training-modal__actions pt-training-modal__actions--centered">
                <button
                  type="button"
                  className="pt-training-modal__secondary-action mobile-focus-ring"
                  onClick={closeRoutineDraftPublishDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pt-training-modal__primary-action mobile-focus-ring"
                  onClick={confirmRoutineDraftPublish}
                >
                  Publish Routine
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {routineOptionDialogKind ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeRoutineOptionDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              routineOptionDialogKind.kind === "target"
                ? "pt-training-add-target-dialog-title"
                : "pt-training-add-attribute-dialog-title"
            }
            className="pt-training-modal pt-training-routine-form__add-option-dialog"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local-only option</p>
                <h2
                  id={
                    routineOptionDialogKind.kind === "target"
                      ? "pt-training-add-target-dialog-title"
                      : "pt-training-add-attribute-dialog-title"
                  }
                  className="mobile-section__title"
                >
                  {routineOptionDialogKind.kind === "target" ? "Add Fitness Target" : "Add Fitness Attribute"}
                </h2>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeRoutineOptionDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
              <div className="pt-training-builder-form__field">
                <label htmlFor="pt-training-routine-option-value">
                  {routineOptionDialogKind.kind === "target" ? "Body target" : "Physical attribute"}
                </label>
                <input
                  id="pt-training-routine-option-value"
                  value={routineOptionValue}
                  onChange={(event) => {
                    setRoutineOptionValue(event.target.value);
                    setRoutineOptionError(null);
                  }}
                />
                {routineOptionError ? (
                  <p className="pt-training-builder-form__error" role="alert">
                    {routineOptionError}
                  </p>
                ) : null}
              </div>

              <div className="pt-training-modal__actions">
                <button
                  type="button"
                  className="pt-training-modal__secondary-action mobile-focus-ring"
                  onClick={closeRoutineOptionDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pt-training-modal__primary-action mobile-focus-ring"
                  onClick={handleAddRoutineOption}
                >
                  {routineOptionDialogKind.kind === "target" ? "Add Target" : "Add Attribute"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </MobileAppShell>
  );
}
