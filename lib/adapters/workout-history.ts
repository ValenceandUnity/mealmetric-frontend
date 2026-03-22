import type { JsonValue } from "@/lib/types/api";

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
  routineContext: string | null;
  durationMinutes: number | null;
  completionStatus: string | null;
  clientNotes: string | null;
  ptNotes: string | null;
  exerciseEntries: WorkoutHistoryExerciseEntryView[];
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

export function adaptWorkoutHistory(value: JsonValue | null): WorkoutHistoryItemView[] {
  return getArray(value).flatMap((item, index) => {
    if (!isObject(item)) {
      return [];
    }

    return [{
      id: getId(item) ?? `workout-log-${index}`,
      performedAt: pickOptionalText(item, ["performed_at"]),
      routineContext: getRoutineContext(item),
      durationMinutes: pickNumber(item, ["duration_minutes"]),
      completionStatus: pickOptionalText(item, ["completion_status"]),
      clientNotes: pickOptionalText(item, ["client_notes"]),
      ptNotes: pickOptionalText(item, ["pt_notes"]),
      exerciseEntries: getExerciseEntries(item),
    }];
  });
}
