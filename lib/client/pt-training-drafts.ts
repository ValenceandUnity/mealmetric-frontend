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
  type: "exercise";
  description: string;
  instructions: string;
  objective: string;
  createdAt: string;
};

export type LocalPTPortfolioFolderColor = "grey" | "green" | "purple" | "blue" | "amber";
export type LocalPTPortfolioFolder = {
  id: string;
  source: "local";
  title: string;
  updatedAt: string;
  thumbnailDataUrl?: string;
  color?: LocalPTPortfolioFolderColor;
  tags: string[];
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
  exercises: string[];
};

export type LocalPTPortfolioDisplayMode = "recent" | "pinned";

export type LocalPTRoutineExerciseDraft = {
  id: string;
  exerciseName: string;
  repGoal: number;
  instructions: string;
  weightsInvolved: boolean;
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
  return readDrafts<LocalPTExerciseDraft>(PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY);
}

export function writeLocalPTExerciseDrafts(drafts: LocalPTExerciseDraft[]) {
  writeDrafts(PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY, drafts);
}

export function createLocalPTExerciseDraft(input: {
  description: string;
  instructions: string;
  objective: string;
}): LocalPTExerciseDraft {
  return {
    id: createLocalPTDraftId(),
    type: "exercise",
    description: input.description.trim(),
    instructions: input.instructions.trim(),
    objective: input.objective.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function readLocalPTPortfolioFolders(): LocalPTPortfolioFolder[] {
  return readDrafts<LocalPTPortfolioFolder>(PT_TRAINING_LOCAL_PORTFOLIO_FOLDERS_STORAGE_KEY).flatMap(
    (folder) => {
      if (!folder || folder.source !== "local") {
        return [];
      }

      return [{
        id: folder.id,
        source: "local",
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
  title: string;
  thumbnailDataUrl?: string;
  color?: LocalPTPortfolioFolderColor;
  tags?: string[];
  exercises?: string[];
  pinned?: boolean;
}): LocalPTPortfolioFolder {
  return {
    id: createLocalPTDraftId(),
    source: "local",
    title: input.title.trim(),
    updatedAt: new Date().toISOString(),
    thumbnailDataUrl: input.thumbnailDataUrl?.trim() || undefined,
    color: input.color ?? "grey",
    tags: Array.isArray(input.tags) ? input.tags.map((item) => item.trim()).filter(Boolean) : [],
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
