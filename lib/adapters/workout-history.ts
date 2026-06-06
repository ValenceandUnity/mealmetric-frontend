import type { JsonValue } from "@/lib/types/api";
import type { WorkoutLogMode } from "@/lib/types/training";

import {
  getArray,
  getId,
  isObject,
  pickNumber,
  pickOptionalText,
} from "@/lib/adapters/common";

export type WorkoutHistoryExerciseEntryView = {
  id: string;
  exerciseName: string | null;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  durationSeconds: number | null;
  notes: string | null;
  position: number;
};

export type WorkoutHistoryItemView = {
  id: string;
  performedAt: string | null;
  mode: WorkoutLogMode;
  routineContext: string | null;
  durationMinutes: number | null;
  completionStatus: string | null;
  clientNotes: string | null;
  ptNotes: string | null;
  exerciseEntries: WorkoutHistoryExerciseEntryView[];
};

export type WorkoutHistoryPageView = {
  items: WorkoutHistoryItemView[];
  count: number | null;
  limit: number | null;
  offset: number | null;
  nextOffset: number | null;
  hasMore: boolean;
};

function getExerciseEntries(value: JsonValue | null | undefined): WorkoutHistoryExerciseEntryView[] {
  if (!isObject(value)) {
    return [];
  }

  const entries = getArray(value.exercise_entries);
  return entries
    .flatMap((entry, index) => {
      if (!isObject(entry)) {
        return [];
      }

      const position = pickNumber(entry, ["position"]) ?? index;

      return [{
        id: getId(entry) ?? `exercise-${position}`,
        exerciseName: pickOptionalText(entry, ["exercise_name"]),
        sets: pickNumber(entry, ["sets"]),
        reps: pickNumber(entry, ["reps"]),
        weight: pickNumber(entry, ["weight"]),
        durationSeconds: pickNumber(entry, ["duration_seconds"]),
        notes: pickOptionalText(entry, ["notes"]),
        position,
      }];
    })
    .sort((left, right) => left.position - right.position);
}

function getRoutineContext(value: JsonValue | null | undefined): string | null {
  if (!isObject(value)) {
    return null;
  }

  return pickOptionalText(value, [
    "routine_name",
    "routine_title",
    "routine_label",
    "routine_id",
  ]);
}

function getWorkoutMode(value: JsonValue | null | undefined): WorkoutLogMode {
  if (isObject(value)) {
    const candidate = value.mode;
    if (
      candidate === "rep" ||
      candidate === "set" ||
      candidate === "general_workout"
    ) {
      return candidate;
    }
  }

  return getRoutineContext(value) ? "rep" : "general_workout";
}

export function adaptWorkoutHistory(value: JsonValue | null): WorkoutHistoryItemView[] {
  return getArray(value).flatMap((item, index) => {
    if (!isObject(item)) {
      return [];
    }

    return [{
      id: getId(item) ?? `workout-log-${index}`,
      performedAt: pickOptionalText(item, ["performed_at"]),
      mode: getWorkoutMode(item),
      routineContext: getRoutineContext(item),
      durationMinutes: pickNumber(item, ["duration_minutes"]),
      completionStatus: pickOptionalText(item, ["completion_status"]),
      clientNotes: pickOptionalText(item, ["client_notes"]),
      ptNotes: pickOptionalText(item, ["pt_notes"]),
      exerciseEntries: getExerciseEntries(item),
    }];
  });
}

export function adaptWorkoutHistoryPage(value: JsonValue | null): WorkoutHistoryPageView {
  const items = adaptWorkoutHistory(value);

  if (!isObject(value)) {
    return {
      items,
      count: null,
      limit: null,
      offset: null,
      nextOffset: null,
      hasMore: false,
    };
  }

  return {
    items,
    count: pickNumber(value, ["count"]),
    limit: pickNumber(value, ["limit"]),
    offset: pickNumber(value, ["offset"]),
    nextOffset: pickNumber(value, ["next_offset"]),
    hasMore: value.has_more === true,
  };
}
