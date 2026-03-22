import type { JsonValue } from "@/lib/types/api";

import {
  formatDateRange,
  getArray,
  getId,
  isObject,
  pickOptionalText,
  pickText,
  startCase,
} from "@/lib/adapters/common";

export type TrainingAssignmentView = {
  id: string | null;
  title: string;
  description: string;
  packageId: string | null;
  status: string | null;
  coachName: string | null;
  schedule: string;
  checklistCount: string;
  routineCount: string | null;
  progressLabel: string | null;
};

export type TrainingRoutineView = {
  id: string | null;
  title: string;
  label: string | null;
  completionLabel: string | null;
  metadata: Array<{ label: string; value: string }>;
  exercises: TrainingExerciseView[];
};

export type TrainingExerciseView = {
  id: string | null;
  title: string;
  sets: string | null;
  reps: string | null;
  weightGuidance: string | null;
  duration: string | null;
};

export type AssignmentDetailView = {
  summary: TrainingAssignmentView;
  checklist: string[];
  routines: TrainingRoutineView[];
};

function getChecklistItems(value: JsonValue | null): string[] {
  if (!isObject(value)) {
    return [];
  }

  const keys = ["checklist", "items", "routines", "exercises", "tasks"];
  for (const key of keys) {
    const items = getArray(value[key]);
    if (items.length > 0) {
      return items.map((item, index) => {
        const label = pickOptionalText(item, ["name", "title", "label", "exercise_name"]);
        return label ?? `${startCase(key.slice(0, -1))} ${index + 1}`;
      });
    }
  }

  return [];
}

function getRoutineCount(value: JsonValue | null): string | null {
  if (!isObject(value)) {
    return null;
  }

  const routineCollections = [value.routines, value.workouts, value.sessions, value.exercises];
  for (const candidate of routineCollections) {
    const items = getArray(candidate);
    if (items.length > 0) {
      return `${items.length} routine${items.length === 1 ? "" : "s"}`;
    }
  }

  const explicitCount = pickOptionalText(value, [
    "routine_count",
    "workout_count",
    "session_count",
    "exercise_count",
  ]);

  if (explicitCount) {
    return `${explicitCount} routine${explicitCount === "1" ? "" : "s"}`;
  }

  return null;
}

function getProgressLabel(value: JsonValue | null): string | null {
  if (!isObject(value)) {
    return null;
  }

  const completed = pickOptionalText(value, ["completed_count", "completed_routines"]);
  const total = pickOptionalText(value, ["total_count", "total_routines"]);
  if (completed && total) {
    return `${completed}/${total} complete`;
  }

  const percent = pickOptionalText(value, [
    "progress_percent",
    "completion_percent",
    "percent_complete",
  ]);
  if (percent) {
    return `${percent}% complete`;
  }

  return pickOptionalText(value, ["progress", "progress_label", "completion_status"]);
}

function getRoutineId(value: JsonValue | null | undefined): string | null {
  if (!isObject(value)) {
    return null;
  }

  return pickOptionalText(value, ["routine_id", "workout_id", "session_id", "exercise_id", "id"]);
}

function getRoutineCompletionLabel(value: JsonValue | null | undefined): string | null {
  if (!isObject(value)) {
    return null;
  }

  const completed = value.completed;
  if (typeof completed === "boolean") {
    return completed ? "Completed" : "Not completed";
  }

  const completedAt = pickOptionalText(value, ["completed_at"]);
  if (completedAt) {
    return "Completed";
  }

  const percent = pickOptionalText(value, ["progress_percent", "completion_percent", "percent_complete"]);
  if (percent) {
    return `${percent}% complete`;
  }

  return pickOptionalText(value, ["completion_status", "status", "progress", "progress_label"]);
}

function getExerciseId(value: JsonValue | null | undefined): string | null {
  if (!isObject(value)) {
    return null;
  }

  return pickOptionalText(value, ["exercise_id", "id"]);
}

function getNumberLikeText(value: JsonValue | null | undefined, keys: string[]): string | null {
  if (!isObject(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

function getRoutineMetadata(value: JsonValue | null | undefined): Array<{ label: string; value: string }> {
  if (!isObject(value)) {
    return [];
  }

  const label = pickOptionalText(value, ["label", "tag", "day", "category", "type"]);
  const duration = getNumberLikeText(value, ["duration_minutes", "duration"]);
  const status = pickOptionalText(value, ["status"]);

  return [
    ...(label ? [{ label: "Label", value: label }] : []),
    ...(duration ? [{ label: "Duration", value: duration }] : []),
    ...(status ? [{ label: "Status", value: status }] : []),
  ];
}

function adaptExerciseItems(value: JsonValue | null | undefined): TrainingExerciseView[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => adaptExerciseEntry(item, index));
  }

  if (!isObject(value)) {
    return [];
  }

  const candidates = [value.exercises, value.items, value.movements, value.tasks];
  for (const candidate of candidates) {
    const items = getArray(candidate);
    if (items.length > 0) {
      return items.flatMap((item, index) => adaptExerciseEntry(item, index));
    }
  }

  return [];
}

function adaptExerciseEntry(value: JsonValue | null | undefined, index: number): TrainingExerciseView[] {
  if (typeof value === "string" && value.trim().length > 0) {
    return [
      {
        id: null,
        title: value,
        sets: null,
        reps: null,
        weightGuidance: null,
        duration: null,
      },
    ];
  }

  if (!isObject(value)) {
    return [];
  }

  const title =
    pickOptionalText(value, ["exercise_name", "name", "title", "movement_name"]) ??
    `Exercise ${index + 1}`;

  const weightValue = getNumberLikeText(value, ["weight_guidance", "weight", "target_weight"]);
  const weightUnit = pickOptionalText(value, ["weight_unit"]);

  return [
    {
      id: getExerciseId(value),
      title,
      sets: getNumberLikeText(value, ["sets", "set_count"]),
      reps: getNumberLikeText(value, ["reps", "rep_count"]),
      weightGuidance: weightValue ? `${weightValue}${weightUnit ? ` ${weightUnit}` : ""}` : null,
      duration: getNumberLikeText(value, ["duration_minutes", "duration", "seconds"]),
    },
  ];
}

function adaptRoutineItems(value: JsonValue | null): TrainingRoutineView[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => adaptRoutineEntry(item, index));
  }

  if (!isObject(value)) {
    return [];
  }

  const candidates = [value.routines, value.workouts, value.sessions, value.exercises, value.items];
  for (const candidate of candidates) {
    const items = getArray(candidate);
    if (items.length > 0) {
      return items.flatMap((item, index) => adaptRoutineEntry(item, index));
    }
  }

  return [];
}

function adaptRoutineEntry(value: JsonValue | null | undefined, index: number): TrainingRoutineView[] {
  if (typeof value === "string" && value.trim().length > 0) {
    return [
      {
        id: null,
        title: value,
        label: null,
        completionLabel: null,
        metadata: [],
        exercises: [],
      },
    ];
  }

  if (!isObject(value)) {
    return [];
  }

  const title =
    pickOptionalText(value, ["name", "title", "routine_name", "workout_name", "session_name"]) ??
    `Routine ${index + 1}`;

  return [
    {
      id: getRoutineId(value),
      title,
      label: pickOptionalText(value, ["label", "tag", "day", "category", "type"]),
      completionLabel: getRoutineCompletionLabel(value),
      metadata: getRoutineMetadata(value),
      exercises: adaptExerciseItems(value),
    },
  ];
}

export function adaptTrainingAssignments(value: JsonValue | null): TrainingAssignmentView[] {
  return getArray(value).map((item, index) => {
    const checklist = getChecklistItems(item);

    return {
      id: getId(item),
      title:
        pickOptionalText(item, ["title", "name", "package_name", "assignment_name"]) ??
        `Assignment ${index + 1}`,
      description:
        pickOptionalText(item, ["description", "summary", "notes"]) ??
        "Structured training assignment delivered through the BFF.",
      packageId: pickOptionalText(item, ["training_package_id", "package_id"]),
      status: pickOptionalText(item, ["status"]),
      coachName: pickOptionalText(item, ["pt_name", "trainer_name", "coach_name", "assigned_by_name"]),
      schedule: formatDateRange(
        pickOptionalText(item, ["start_date", "assigned_at"]),
        pickOptionalText(item, ["end_date", "completed_at"]),
      ),
      checklistCount:
        checklist.length > 0
          ? `${checklist.length} checkpoint${checklist.length === 1 ? "" : "s"}`
          : "Checklist pending",
      routineCount: getRoutineCount(item),
      progressLabel: getProgressLabel(item),
    };
  });
}

export function adaptAssignmentDetail(value: JsonValue | null): AssignmentDetailView {
  const summary = adaptTrainingAssignments(value ? [value] : [])[0] ?? {
    id: null,
    title: "Assignment detail",
    description: "No assignment detail returned.",
    packageId: null,
    status: null,
    coachName: null,
    schedule: "Dates not provided",
    checklistCount: "Checklist pending",
    routineCount: null,
    progressLabel: null,
  };

  return {
    summary,
    checklist: getChecklistItems(value),
    routines: adaptRoutineItems(value),
  };
}
