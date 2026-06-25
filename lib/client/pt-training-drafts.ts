export const PT_TRAINING_FOLDER_DRAFTS_STORAGE_KEY = "mealmetric:pt-training:folder-drafts";
export const PT_TRAINING_EXERCISE_DRAFTS_STORAGE_KEY = "mealmetric:pt-training:exercise-drafts";

export type LocalPTFolderDraft = {
  id: string;
  name: string;
  note: string;
  createdAt: string;
};

export type LocalPTExerciseDraftKind = "rep" | "set" | "routine" | "cues";

export type LocalPTExerciseDraft = {
  id: string;
  kind: LocalPTExerciseDraftKind;
  title: string;
  note: string;
  createdAt: string;
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

function createDraftId() {
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
    id: createDraftId(),
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
  kind: LocalPTExerciseDraftKind;
  title: string;
  note: string;
}): LocalPTExerciseDraft {
  return {
    id: createDraftId(),
    kind: input.kind,
    title: input.title.trim(),
    note: input.note.trim(),
    createdAt: new Date().toISOString(),
  };
}
