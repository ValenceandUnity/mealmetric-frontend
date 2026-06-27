export const PT_TRAINING_FOLDER_DRAFTS_STORAGE_KEY = "mealmetric:pt-training:folder-drafts";
export const PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY = "mealmetric:pt-training:exercise-drafts";
export const PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY = "mealmetric:pt-training:routine-drafts";
export const PT_TRAINING_LOCAL_PORTFOLIO_FOLDERS_STORAGE_KEY =
  "mealmetric:pt-training:local-portfolio-folders";
export const PT_TRAINING_PORTFOLIO_FOLDER_OVERLAYS_STORAGE_KEY =
  "mealmetric:pt-training:portfolio-folder-overlays";
export const PT_TRAINING_PORTFOLIO_DISPLAY_MODE_STORAGE_KEY =
  "mealmetric:pt-training:portfolio-display-mode";
export const PT_TRAINING_PINNED_PORTFOLIO_FOLDERS_STORAGE_KEY =
  "mealmetric:pt-training:pinned-portfolio-folders";
export const PT_TRAINING_CUSTOM_FITNESS_TARGETS_STORAGE_KEY =
  "mealmetric:pt-training:custom-fitness-targets";
export const PT_TRAINING_CUSTOM_FITNESS_ATTRIBUTES_STORAGE_KEY =
  "mealmetric:pt-training:custom-fitness-attributes";

export type LocalPTFolderDraft = {
  id: string;
  name: string;
  note: string;
  createdAt: string;
};

export type LocalPTExerciseDraft = {
  id: string;
  type: "rep";
  title: string;
  exerciseName: string;
  repGoal?: number;
  instructions: string;
  weightsInvolved: boolean;
  media?: PTTrainingDraftMedia | null;
  createdAt: string;
  editedAt: string;
};

export type PTTrainingDraftMedia = {
  id: string;
  kind: "image" | "video";
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  addedAt: string;
};

export type LocalPTPortfolioAssetExercise = {
  id: string;
  exerciseName: string;
  repGoal: string;
  instructions: string;
  weightsInvolved: boolean;
  media?: PTTrainingDraftMedia | null;
};

export type LocalPTPortfolioRepAsset = {
  id: string;
  type: "rep";
  title: string;
  exerciseName?: string;
  repGoal?: string;
  description?: string;
  instructions?: string;
  objective?: string;
  weightsInvolved?: boolean;
  media?: PTTrainingDraftMedia | null;
  sourceDraftId?: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalPTPortfolioRoutineAsset = {
  id: string;
  type: "routine";
  title: string;
  description?: string;
  fitnessTargets: string[];
  fitnessAttributes: string[];
  timedByDuration: boolean;
  setAmount: string;
  exercises: LocalPTPortfolioAssetExercise[];
  sourceDraftId?: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalPTPortfolioAsset =
  | LocalPTPortfolioRepAsset
  | LocalPTPortfolioRoutineAsset;

export type LocalPTPortfolioFolderColor = "grey" | "green" | "purple" | "blue" | "amber";
export type LocalPTPortfolioFolder = {
  id: string;
  source: "local" | "system-local";
  title: string;
  updatedAt: string;
  thumbnailDataUrl?: string;
  color?: LocalPTPortfolioFolderColor;
  tags: string[];
  assets: LocalPTPortfolioAsset[];
  exercises: string[];
  pinned: boolean;
};

export type LocalPTPortfolioFolderOverlay = {
  id: string;
  source: "bff";
  updatedAt: string;
  thumbnailDataUrl?: string;
  color?: LocalPTPortfolioFolderColor;
  tags: string[];
  assets: LocalPTPortfolioAsset[];
  exercises: string[];
};

export type LocalPTPortfolioDisplayMode = "recent" | "pinned";

export type LocalPTRoutineExerciseDraft = {
  id: string;
  exerciseName: string;
  repGoal: number;
  instructions: string;
  weightsInvolved: boolean;
  media?: PTTrainingDraftMedia | null;
};

export type LocalPTRoutineDraftPublishStatus = "draft" | "ready";
export type LocalPTRoutineDraftPublishTargetType = "existing-folder" | "local-folder-draft";
export type LocalPTRoutineDraftPublishTarget = {
  type: LocalPTRoutineDraftPublishTargetType;
  id?: string;
  name: string;
};

export type LocalPTRoutineDraft = {
  id: string;
  type: "routine";
  routineName: string;
  description: string;
  fitnessTargets: string[];
  fitnessAttributes: string[];
  timedByDuration: boolean;
  setAmount: number;
  exercises: LocalPTRoutineExerciseDraft[];
  createdAt: string;
  editedAt?: string;
  publishStatus?: LocalPTRoutineDraftPublishStatus;
  publishTargets?: LocalPTRoutineDraftPublishTarget[];
  publishTargetType?: LocalPTRoutineDraftPublishTargetType;
  publishTargetId?: string;
  publishTargetName?: string;
};

function readDrafts<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeDrafts<T>(key: string, drafts: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(drafts));
}

export function createLocalPTDraftId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeDraftMedia(media: PTTrainingDraftMedia | Record<string, unknown> | null | undefined) {
  if (!media || typeof media !== "object") {
    return null;
  }

  const kind = media.kind === "video" ? "video" : media.kind === "image" ? "image" : null;
  const name = typeof media.name === "string" ? media.name.trim() : "";
  const mimeType = typeof media.mimeType === "string" ? media.mimeType.trim() : "";
  const dataUrl = typeof media.dataUrl === "string" ? media.dataUrl.trim() : "";
  if (!kind || !name || !mimeType || !dataUrl) {
    return null;
  }

  return {
    id: typeof media.id === "string" ? media.id : createLocalPTDraftId(),
    kind,
    name,
    mimeType,
    size: typeof media.size === "number" ? media.size : 0,
    dataUrl,
    addedAt: typeof media.addedAt === "string" ? media.addedAt : new Date().toISOString(),
  } satisfies PTTrainingDraftMedia;
}

export function readLocalPTFolderDrafts(): LocalPTFolderDraft[] {
  return readDrafts<LocalPTFolderDraft>(PT_TRAINING_FOLDER_DRAFTS_STORAGE_KEY);
}

export function writeLocalPTFolderDrafts(drafts: LocalPTFolderDraft[]) {
  writeDrafts(PT_TRAINING_FOLDER_DRAFTS_STORAGE_KEY, drafts);
}

export function createLocalPTFolderDraft(input: {
  name: string;
  note: string;
}): LocalPTFolderDraft {
  return {
    id: createLocalPTDraftId(),
    name: input.name.trim(),
    note: input.note.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function readLocalPTExerciseDrafts(): LocalPTExerciseDraft[] {
  return readDrafts<LocalPTExerciseDraft>(PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY).flatMap((draft) => {
    if (!draft || typeof draft !== "object") {
      return [];
    }

    const legacyDraft = draft as Record<string, unknown>;
    const exerciseName =
      (typeof legacyDraft.exerciseName === "string" ? legacyDraft.exerciseName.trim() : "") ||
      (typeof legacyDraft.title === "string" ? legacyDraft.title.trim() : "") ||
      (typeof legacyDraft.description === "string" ? legacyDraft.description.trim() : "") ||
      "";

    if (!exerciseName) {
      return [];
    }

    const repGoalValue =
      typeof legacyDraft.repGoal === "number"
        ? legacyDraft.repGoal
        : Number.parseInt(
            typeof legacyDraft.repGoal === "string" ? legacyDraft.repGoal : "",
            10,
          );
    const createdAt =
      typeof legacyDraft.createdAt === "string" ? legacyDraft.createdAt : new Date().toISOString();

    return [{
      id: typeof legacyDraft.id === "string" ? legacyDraft.id : createLocalPTDraftId(),
      type: "rep",
      title: typeof legacyDraft.title === "string" ? legacyDraft.title.trim() || exerciseName : exerciseName,
      exerciseName,
      repGoal: Number.isFinite(repGoalValue) ? repGoalValue : undefined,
      instructions: typeof legacyDraft.instructions === "string" ? legacyDraft.instructions.trim() : "",
      weightsInvolved: Boolean(legacyDraft.weightsInvolved),
      media: normalizeDraftMedia(legacyDraft.media as Record<string, unknown> | null | undefined),
      createdAt,
      editedAt: typeof legacyDraft.editedAt === "string" ? legacyDraft.editedAt : createdAt,
    }];
  });
}

export function writeLocalPTExerciseDrafts(drafts: LocalPTExerciseDraft[]) {
  writeDrafts(PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY, drafts);
}

export function createLocalPTExerciseDraft(input: {
  id?: string;
  title?: string;
  exerciseName: string;
  repGoal?: number;
  instructions: string;
  weightsInvolved: boolean;
  media?: PTTrainingDraftMedia | null;
  createdAt?: string;
  editedAt?: string;
}): LocalPTExerciseDraft {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const exerciseName = input.exerciseName.trim();

  return {
    id: input.id ?? createLocalPTDraftId(),
    type: "rep",
    title: input.title?.trim() || exerciseName,
    exerciseName,
    repGoal: input.repGoal,
    instructions: input.instructions.trim(),
    weightsInvolved: input.weightsInvolved,
    media: normalizeDraftMedia(input.media),
    createdAt,
    editedAt: input.editedAt ?? createdAt,
  };
}

function normalizePortfolioAssetExercise(
  exercise: LocalPTPortfolioAssetExercise | LocalPTRoutineExerciseDraft | null | undefined,
): LocalPTPortfolioAssetExercise | null {
  if (!exercise || typeof exercise.exerciseName !== "string") {
    return null;
  }

  return {
    id: exercise.id ?? createLocalPTDraftId(),
    exerciseName: exercise.exerciseName.trim(),
    repGoal:
      typeof exercise.repGoal === "number"
        ? String(exercise.repGoal)
        : exercise.repGoal?.toString().trim() ?? "",
    instructions: exercise.instructions?.trim() ?? "",
    weightsInvolved: Boolean(exercise.weightsInvolved),
    media: normalizeDraftMedia(exercise.media),
  };
}

function normalizePortfolioAsset(asset: LocalPTPortfolioAsset | null | undefined): LocalPTPortfolioAsset | null {
  if (!asset || typeof asset.type !== "string") {
    return null;
  }

  if (asset.type === "routine") {
    return {
      id: asset.id ?? createLocalPTDraftId(),
      type: "routine",
      title: asset.title?.trim() ?? "",
      description: asset.description?.trim() || undefined,
      fitnessTargets: Array.isArray(asset.fitnessTargets)
        ? asset.fitnessTargets.map((item) => item.trim()).filter(Boolean)
        : [],
      fitnessAttributes: Array.isArray(asset.fitnessAttributes)
        ? asset.fitnessAttributes.map((item) => item.trim()).filter(Boolean)
        : [],
      timedByDuration: Boolean(asset.timedByDuration),
      setAmount: asset.setAmount?.toString().trim() ?? "",
      exercises: Array.isArray(asset.exercises)
        ? asset.exercises
            .map((exercise) => normalizePortfolioAssetExercise(exercise))
            .filter((exercise): exercise is LocalPTPortfolioAssetExercise => exercise !== null)
        : [],
      sourceDraftId: asset.sourceDraftId?.trim() || undefined,
      createdAt: asset.createdAt ?? new Date().toISOString(),
      updatedAt: asset.updatedAt ?? asset.createdAt ?? new Date().toISOString(),
    };
  }

  if (asset.type === "rep") {
    return {
      id: asset.id ?? createLocalPTDraftId(),
      type: "rep",
      title: asset.title?.trim() ?? "",
      exerciseName: asset.exerciseName?.trim() || asset.title?.trim() || undefined,
      repGoal: asset.repGoal?.toString().trim() || undefined,
      description: asset.description?.trim() || undefined,
      instructions: asset.instructions?.trim() || undefined,
      objective: asset.objective?.trim() || undefined,
      weightsInvolved:
        typeof asset.weightsInvolved === "boolean" ? asset.weightsInvolved : undefined,
      media: normalizeDraftMedia(asset.media),
      sourceDraftId: asset.sourceDraftId?.trim() || undefined,
      createdAt: asset.createdAt ?? new Date().toISOString(),
      updatedAt: asset.updatedAt ?? asset.createdAt ?? new Date().toISOString(),
    };
  }

  return null;
}

export function createLocalPTPortfolioRepAsset(input: {
  id?: string;
  title: string;
  exerciseName?: string;
  repGoal?: string;
  description?: string;
  instructions?: string;
  objective?: string;
  weightsInvolved?: boolean;
  media?: PTTrainingDraftMedia | null;
  sourceDraftId?: string;
  createdAt?: string;
  updatedAt?: string;
}): LocalPTPortfolioRepAsset {
  const createdAt = input.createdAt ?? new Date().toISOString();

  return {
    id: input.id ?? createLocalPTDraftId(),
    type: "rep",
    title: input.title.trim(),
    exerciseName: input.exerciseName?.trim() || input.title.trim(),
    repGoal: input.repGoal?.trim() || undefined,
    description: input.description?.trim() || undefined,
    instructions: input.instructions?.trim() || undefined,
    objective: input.objective?.trim() || undefined,
    weightsInvolved: typeof input.weightsInvolved === "boolean" ? input.weightsInvolved : undefined,
    media: normalizeDraftMedia(input.media),
    sourceDraftId: input.sourceDraftId?.trim() || undefined,
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
  };
}

export function createLocalPTPortfolioRoutineAsset(input: {
  id?: string;
  title: string;
  description?: string;
  fitnessTargets?: string[];
  fitnessAttributes?: string[];
  timedByDuration?: boolean;
  setAmount?: string;
  exercises?: LocalPTPortfolioAssetExercise[];
  sourceDraftId?: string;
  createdAt?: string;
  updatedAt?: string;
}): LocalPTPortfolioRoutineAsset {
  const createdAt = input.createdAt ?? new Date().toISOString();

  return {
    id: input.id ?? createLocalPTDraftId(),
    type: "routine",
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    fitnessTargets: Array.isArray(input.fitnessTargets)
      ? input.fitnessTargets.map((item) => item.trim()).filter(Boolean)
      : [],
    fitnessAttributes: Array.isArray(input.fitnessAttributes)
      ? input.fitnessAttributes.map((item) => item.trim()).filter(Boolean)
      : [],
    timedByDuration: Boolean(input.timedByDuration),
    setAmount: input.setAmount?.trim() ?? "",
    exercises: Array.isArray(input.exercises)
      ? input.exercises
          .map((exercise) => normalizePortfolioAssetExercise(exercise))
          .filter((exercise): exercise is LocalPTPortfolioAssetExercise => exercise !== null)
      : [],
    sourceDraftId: input.sourceDraftId?.trim() || undefined,
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
  };
}

export function readLocalPTPortfolioFolders(): LocalPTPortfolioFolder[] {
  return readDrafts<LocalPTPortfolioFolder>(PT_TRAINING_LOCAL_PORTFOLIO_FOLDERS_STORAGE_KEY).flatMap(
    (folder) => {
      if (!folder || (folder.source !== "local" && folder.source !== "system-local")) {
        return [];
      }

      return [{
        id: folder.id,
        source: folder.source === "system-local" ? "system-local" : "local",
        title: folder.title?.trim() ?? "",
        updatedAt: folder.updatedAt ?? new Date().toISOString(),
        thumbnailDataUrl: folder.thumbnailDataUrl?.trim() || undefined,
        color:
          folder.color === "green" ||
          folder.color === "purple" ||
          folder.color === "blue" ||
          folder.color === "amber" ||
          folder.color === "grey"
            ? folder.color
            : "grey",
        tags: Array.isArray(folder.tags)
          ? folder.tags.map((item) => item.trim()).filter(Boolean)
          : [],
        assets: Array.isArray(folder.assets)
          ? folder.assets
              .map((asset) => normalizePortfolioAsset(asset))
              .filter((asset): asset is LocalPTPortfolioAsset => asset !== null)
          : [],
        exercises: Array.isArray(folder.exercises)
          ? folder.exercises.map((item) => item.trim()).filter(Boolean)
          : [],
        pinned: Boolean(folder.pinned),
      }];
    },
  );
}

export function writeLocalPTPortfolioFolders(folders: LocalPTPortfolioFolder[]) {
  writeDrafts(PT_TRAINING_LOCAL_PORTFOLIO_FOLDERS_STORAGE_KEY, folders);
}

export function createLocalPTPortfolioFolder(input: {
  id?: string;
  source?: "local" | "system-local";
  title: string;
  thumbnailDataUrl?: string;
  color?: LocalPTPortfolioFolderColor;
  tags?: string[];
  assets?: LocalPTPortfolioAsset[];
  exercises?: string[];
  pinned?: boolean;
}): LocalPTPortfolioFolder {
  return {
    id: input.id ?? createLocalPTDraftId(),
    source: input.source ?? "local",
    title: input.title.trim(),
    updatedAt: new Date().toISOString(),
    thumbnailDataUrl: input.thumbnailDataUrl?.trim() || undefined,
    color: input.color ?? "grey",
    tags: Array.isArray(input.tags) ? input.tags.map((item) => item.trim()).filter(Boolean) : [],
    assets: Array.isArray(input.assets)
      ? input.assets
          .map((asset) => normalizePortfolioAsset(asset))
          .filter((asset): asset is LocalPTPortfolioAsset => asset !== null)
      : [],
    exercises: Array.isArray(input.exercises)
      ? input.exercises.map((item) => item.trim()).filter(Boolean)
      : [],
    pinned: Boolean(input.pinned),
  };
}

export function readLocalPTPortfolioFolderOverlays(): LocalPTPortfolioFolderOverlay[] {
  return readDrafts<LocalPTPortfolioFolderOverlay>(
    PT_TRAINING_PORTFOLIO_FOLDER_OVERLAYS_STORAGE_KEY,
  ).flatMap((overlay) => {
    if (!overlay || overlay.source !== "bff") {
      return [];
    }

    return [{
      id: overlay.id,
      source: "bff",
      updatedAt: overlay.updatedAt ?? new Date().toISOString(),
      thumbnailDataUrl: overlay.thumbnailDataUrl?.trim() || undefined,
      color:
        overlay.color === "green" ||
        overlay.color === "purple" ||
        overlay.color === "blue" ||
        overlay.color === "amber" ||
        overlay.color === "grey"
          ? overlay.color
          : "grey",
      tags: Array.isArray(overlay.tags)
        ? overlay.tags.map((item) => item.trim()).filter(Boolean)
        : [],
      assets: Array.isArray(overlay.assets)
        ? overlay.assets
            .map((asset) => normalizePortfolioAsset(asset))
            .filter((asset): asset is LocalPTPortfolioAsset => asset !== null)
        : [],
      exercises: Array.isArray(overlay.exercises)
        ? overlay.exercises.map((item) => item.trim()).filter(Boolean)
        : [],
    }];
  });
}

export function writeLocalPTPortfolioFolderOverlays(overlays: LocalPTPortfolioFolderOverlay[]) {
  writeDrafts(PT_TRAINING_PORTFOLIO_FOLDER_OVERLAYS_STORAGE_KEY, overlays);
}

export function readLocalPTPortfolioDisplayMode(): LocalPTPortfolioDisplayMode {
  if (typeof window === "undefined") {
    return "recent";
  }

  const stored = window.localStorage.getItem(PT_TRAINING_PORTFOLIO_DISPLAY_MODE_STORAGE_KEY);
  return stored === "pinned" ? "pinned" : "recent";
}

export function writeLocalPTPortfolioDisplayMode(mode: LocalPTPortfolioDisplayMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PT_TRAINING_PORTFOLIO_DISPLAY_MODE_STORAGE_KEY, mode);
}

export function readLocalPTPinnedPortfolioFolders(): string[] {
  return readDrafts<string>(PT_TRAINING_PINNED_PORTFOLIO_FOLDERS_STORAGE_KEY).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

export function writeLocalPTPinnedPortfolioFolders(folderIds: string[]) {
  writeDrafts(
    PT_TRAINING_PINNED_PORTFOLIO_FOLDERS_STORAGE_KEY,
    folderIds.map((item) => item.trim()).filter(Boolean),
  );
}

export function readLocalPTRoutineDrafts(): LocalPTRoutineDraft[] {
  return readDrafts<LocalPTRoutineDraft>(PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY).flatMap((draft) => {
    if (!draft || draft.type !== "routine") {
      return [];
    }

    const publishTargets: LocalPTRoutineDraftPublishTarget[] = Array.isArray(draft.publishTargets)
      ? draft.publishTargets.reduce<LocalPTRoutineDraftPublishTarget[]>((next, target) => {
          if (!target || typeof target.name !== "string" || target.name.trim().length === 0) {
            return next;
          }

          next.push({
            type:
              target.type === "local-folder-draft"
                ? "local-folder-draft"
                : "existing-folder",
            id: target.id?.trim() || undefined,
            name: target.name.trim(),
          });
          return next;
        }, [])
      : typeof draft.publishTargetName === "string" && draft.publishTargetName.trim().length > 0
        ? [{
            type:
              draft.publishTargetType === "local-folder-draft"
                ? "local-folder-draft"
                : "existing-folder",
            id: draft.publishTargetId?.trim() || undefined,
            name: draft.publishTargetName.trim(),
          }]
        : [];

    return [{
      ...draft,
      routineName: draft.routineName?.trim() ?? "",
      description: draft.description?.trim() ?? "",
      fitnessTargets: Array.isArray(draft.fitnessTargets)
        ? draft.fitnessTargets.map((item) => item.trim()).filter(Boolean)
        : [],
      fitnessAttributes: Array.isArray(draft.fitnessAttributes)
        ? draft.fitnessAttributes.map((item) => item.trim()).filter(Boolean)
        : [],
      timedByDuration: Boolean(draft.timedByDuration),
      setAmount: typeof draft.setAmount === "number" ? draft.setAmount : 0,
      exercises: Array.isArray(draft.exercises)
        ? draft.exercises.map((exercise) => ({
            id: exercise.id,
            exerciseName: exercise.exerciseName?.trim() ?? "",
            repGoal: typeof exercise.repGoal === "number" ? exercise.repGoal : 0,
            instructions: exercise.instructions?.trim() ?? "",
            weightsInvolved: Boolean(exercise.weightsInvolved),
            media: normalizeDraftMedia(exercise.media),
          }))
        : [],
      createdAt: draft.createdAt ?? new Date().toISOString(),
      editedAt: draft.editedAt ?? draft.createdAt,
      publishStatus:
        draft.publishStatus === "ready" || publishTargets.length > 0 ? "ready" : "draft",
      publishTargets,
      publishTargetType:
        draft.publishTargetType === "existing-folder" || draft.publishTargetType === "local-folder-draft"
          ? draft.publishTargetType
          : undefined,
      publishTargetId: draft.publishTargetId?.trim() || undefined,
      publishTargetName: draft.publishTargetName?.trim() || undefined,
    }];
  });
}

export function writeLocalPTRoutineDrafts(drafts: LocalPTRoutineDraft[]) {
  writeDrafts(PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY, drafts);
}

export function createLocalPTRoutineDraft(input: {
  id?: string;
  routineName: string;
  description: string;
  fitnessTargets: string[];
  fitnessAttributes: string[];
  timedByDuration: boolean;
  setAmount: number;
  exercises: LocalPTRoutineExerciseDraft[];
  createdAt?: string;
  editedAt?: string;
  publishStatus?: LocalPTRoutineDraftPublishStatus;
  publishTargets?: LocalPTRoutineDraftPublishTarget[];
  publishTargetType?: LocalPTRoutineDraftPublishTargetType;
  publishTargetId?: string;
  publishTargetName?: string;
}): LocalPTRoutineDraft {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const editedAt = input.editedAt ?? createdAt;
  const publishTargets: LocalPTRoutineDraftPublishTarget[] = Array.isArray(input.publishTargets)
    ? input.publishTargets.reduce<LocalPTRoutineDraftPublishTarget[]>((next, target) => {
        const name = target.name.trim();
        if (!name) {
          return next;
        }

        next.push({
          type: target.type,
          id: target.id?.trim() || undefined,
          name,
        });
        return next;
      }, [])
    : [];

  return {
    id: input.id ?? createLocalPTDraftId(),
    type: "routine",
    routineName: input.routineName.trim(),
    description: input.description.trim(),
    fitnessTargets: input.fitnessTargets.map((item) => item.trim()).filter(Boolean),
    fitnessAttributes: input.fitnessAttributes.map((item) => item.trim()).filter(Boolean),
    timedByDuration: input.timedByDuration,
    setAmount: input.setAmount,
    exercises: input.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseName: exercise.exerciseName.trim(),
      repGoal: exercise.repGoal,
      instructions: exercise.instructions.trim(),
      weightsInvolved: exercise.weightsInvolved,
      media: normalizeDraftMedia(exercise.media),
    })),
    createdAt,
    editedAt,
    publishStatus: input.publishStatus ?? "draft",
    publishTargets,
    publishTargetType: input.publishTargetType,
    publishTargetId: input.publishTargetId?.trim() || undefined,
    publishTargetName: input.publishTargetName?.trim() || undefined,
  };
}

export function readLocalPTCustomFitnessTargets(): string[] {
  return readDrafts<string>(PT_TRAINING_CUSTOM_FITNESS_TARGETS_STORAGE_KEY).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

export function writeLocalPTCustomFitnessTargets(targets: string[]) {
  writeDrafts(PT_TRAINING_CUSTOM_FITNESS_TARGETS_STORAGE_KEY, targets);
}

export function readLocalPTCustomFitnessAttributes(): string[] {
  return readDrafts<string>(PT_TRAINING_CUSTOM_FITNESS_ATTRIBUTES_STORAGE_KEY).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

export function writeLocalPTCustomFitnessAttributes(attributes: string[]) {
  writeDrafts(PT_TRAINING_CUSTOM_FITNESS_ATTRIBUTES_STORAGE_KEY, attributes);
}
