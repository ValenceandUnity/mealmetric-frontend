export const PT_TRAINING_FOLDER_DRAFTS_STORAGE_KEY = "mealmetric:pt-training:folder-drafts";
export const PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY = "mealmetric:pt-training:exercise-drafts";
export const PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY = "mealmetric:pt-training:routine-drafts";
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

export type LocalPTRoutineExerciseDraft = {
  id: string;
  exerciseName: string;
  repGoal: number;
  instructions: string;
  weightsInvolved: boolean;
};

export type LocalPTRoutineDraftPublishStatus = "draft" | "ready";
export type LocalPTRoutineDraftPublishTargetType = "existing-folder" | "local-folder-draft";

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

export function readLocalPTRoutineDrafts(): LocalPTRoutineDraft[] {
  return readDrafts<LocalPTRoutineDraft>(PT_TRAINING_ROUTINE_DRAFTS_STORAGE_KEY).flatMap((draft) => {
    if (!draft || draft.type !== "routine") {
      return [];
    }

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
      publishStatus: draft.publishStatus === "ready" ? "ready" : "draft",
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
  publishTargetType?: LocalPTRoutineDraftPublishTargetType;
  publishTargetId?: string;
  publishTargetName?: string;
}): LocalPTRoutineDraft {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const editedAt = input.editedAt ?? createdAt;

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
