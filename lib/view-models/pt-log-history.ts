import type { JsonValue } from "@/lib/types/api";
import type { WorkoutLogMode } from "@/lib/types/training";

import {
  adaptWorkoutHistoryPage,
  type WorkoutHistoryExerciseEntryView,
  type WorkoutHistoryItemView,
} from "@/lib/adapters/workout-history";
import { formatCountLabel } from "@/lib/view-models/common";

export type PTLogHistoryModeFilter = "all" | WorkoutLogMode;

export type MobilePTWorkoutLogCardView = {
  id: string;
  performedAtLabel: string;
  typeLabel: string;
  exerciseName: string;
  sets: string;
  reps: string;
  weight: string;
  duration: string;
  notes: string;
};

export type MobilePTLogHistoryView = {
  rows: MobilePTWorkoutLogCardView[];
  count: number | null;
  limit: number | null;
  offset: number | null;
  nextOffset: number | null;
  hasMore: boolean;
  countLabel: string;
  visibleRowsLabel: string;
  pageWindowLabel: string;
  paginationStateLabel: string;
  nextOffsetLabel: string;
};

type SortableWorkoutLogRow = MobilePTWorkoutLogCardView & {
  performedAtTimestamp: number;
};

const performedAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getPerformedTimestamp(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatPerformedAt(value: string | null): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return performedAtFormatter.format(parsed);
}

function formatDuration(value: number | null): string {
  if (value === null) {
    return "-";
  }

  if (value < 60) {
    return `${value}s`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function formatCellNumber(value: number | null): string {
  return value === null ? "-" : String(value);
}

function formatWorkoutType(mode: WorkoutLogMode): string {
  switch (mode) {
    case "rep":
      return "Rep";
    case "set":
      return "Set";
    case "general_workout":
      return "General Workout";
    default:
      return "General Workout";
  }
}

function buildNotes(parts: Array<string | null>): string {
  const resolved = parts.filter((value): value is string => Boolean(value)).join(" ").trim();
  return resolved.length > 0 ? resolved : "-";
}

function buildTableRow({
  entry,
  entryIndex,
  log,
  logIndex,
  performedAtLabel,
  performedAtTimestamp,
}: {
  entry: WorkoutHistoryExerciseEntryView;
  entryIndex: number;
  log: WorkoutHistoryItemView;
  logIndex: number;
  performedAtLabel: string;
  performedAtTimestamp: number;
}): SortableWorkoutLogRow {
  const exerciseName = entry.exerciseName ?? `Exercise ${entryIndex + 1}`;

  return {
    id: `${log.id}-${entry.id}-${entryIndex}-${logIndex}`,
    performedAtLabel,
    performedAtTimestamp,
    typeLabel: formatWorkoutType(log.mode),
    exerciseName,
    sets: formatCellNumber(entry.sets),
    reps: formatCellNumber(entry.reps),
    weight: formatCellNumber(entry.weight),
    duration: formatDuration(entry.durationSeconds),
    notes: buildNotes([entry.notes, log.clientNotes, log.ptNotes]),
  };
}

function flattenExerciseEntries(logs: WorkoutHistoryItemView[]): SortableWorkoutLogRow[] {
  return logs.flatMap((log, logIndex) => {
    const performedAtLabel = formatPerformedAt(log.performedAt);
    const performedAtTimestamp = getPerformedTimestamp(log.performedAt);

    if (log.exerciseEntries.length === 0) {
      return [{
        id: `${log.id}-entryless-${logIndex}`,
        performedAtLabel,
        performedAtTimestamp,
        typeLabel: formatWorkoutType(log.mode),
        exerciseName: "-",
        sets: "-",
        reps: "-",
        weight: "-",
        duration: "-",
        notes: buildNotes([log.clientNotes, log.ptNotes]),
      }];
    }

    return log.exerciseEntries.map((entry, entryIndex) =>
      buildTableRow({
        entry,
        entryIndex,
        log,
        logIndex,
        performedAtLabel,
        performedAtTimestamp,
      }),
    );
  });
}

function formatPageWindowLabel(count: number | null, limit: number | null, offset: number | null): string {
  if (count === null || limit === null || offset === null) {
    return "Page window unavailable";
  }

  if (count <= 0) {
    return "No returned logs";
  }

  const start = Math.min(offset + 1, count);
  const end = Math.min(offset + limit, count);
  return `${start}-${end} of ${count}`;
}

export function adaptPTLogHistoryView(value: JsonValue | null): MobilePTLogHistoryView {
  const historyPage = adaptWorkoutHistoryPage(value);
  const rows = flattenExerciseEntries(historyPage.items)
    .sort((left, right) => right.performedAtTimestamp - left.performedAtTimestamp)
    .map(({ performedAtTimestamp: _performedAtTimestamp, ...row }) => row);

  return {
    rows,
    count: historyPage.count,
    limit: historyPage.limit,
    offset: historyPage.offset,
    nextOffset: historyPage.nextOffset,
    hasMore: historyPage.hasMore,
    countLabel: historyPage.count === null ? "Unavailable" : formatCountLabel(historyPage.count, "log"),
    visibleRowsLabel: formatCountLabel(rows.length, "history row"),
    pageWindowLabel: formatPageWindowLabel(historyPage.count, historyPage.limit, historyPage.offset),
    paginationStateLabel:
      historyPage.hasMore && historyPage.nextOffset !== null ? "Older entries available" : "End reached",
    nextOffsetLabel:
      historyPage.nextOffset !== null ? `Next offset ${historyPage.nextOffset}` : "No next page",
  };
}
