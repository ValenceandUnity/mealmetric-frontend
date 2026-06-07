import type { JsonValue } from "@/lib/types/api";

import { getArray, getId, isObject, pickOptionalText } from "@/lib/adapters/common";
import {
  adaptAssignmentDetail,
  adaptTrainingAssignments,
} from "@/lib/adapters/training";
import { adaptWorkoutHistoryPage } from "@/lib/adapters/workout-history";
import {
  formatDateTimeLabel,
  getGradient,
  getNestedArray,
  getTextLike,
  parseLeadingCount,
} from "@/lib/view-models/common";

export type MobileWorkoutJournalCardView = {
  id: string;
  title: string;
  subtitle: string;
  performedAtLabel: string;
  durationLabel: string;
  modeLabel: string;
  notesPreview: string | null;
};

export type MobileWorkoutChecklistItemView = {
  id: string;
  label: string;
  complete: boolean;
  note: string | null;
};

export type MobileLogYourRepsEntryView = {
  id: string;
  label: string;
  setsLabel: string;
  repsLabel: string;
  weightLabel: string;
  timingLabel: string;
  notes: string | null;
};

export type MobileRoutineDetailView = {
  id: string | null;
  title: string;
  subtitle: string;
  completionLabel: string | null;
  checklist: MobileWorkoutChecklistItemView[];
  logEntries: MobileLogYourRepsEntryView[];
  gradient: string;
};

export type MobileClientTrainingAssignmentCardView = {
  id: string | null;
  title: string;
  subtitle: string;
  taskCount: number;
  progressLabel: string | null;
  href: string;
  gradient: string;
};

export type MobileClientTrainingView = {
  assignmentCards: MobileClientTrainingAssignmentCardView[];
  routineDetails: MobileRoutineDetailView[];
  workoutJournalCards: MobileWorkoutJournalCardView[];
  hasAssignments: boolean;
  hasChecklistItems: boolean;
};

function adaptAssignmentCards(assignments: JsonValue | null): MobileClientTrainingAssignmentCardView[] {
  return adaptTrainingAssignments(assignments).map((assignment, index) => ({
    id: assignment.id,
    title: assignment.title,
    subtitle: assignment.description,
    taskCount: Math.max(
      parseLeadingCount(assignment.checklistCount),
      parseLeadingCount(assignment.routineCount),
    ),
    progressLabel: assignment.progressLabel,
    href: assignment.id ? `/client/training/${assignment.id}` : "/client/training",
    gradient: getGradient(index),
  }));
}

function adaptChecklist(detail: JsonValue | null): MobileWorkoutChecklistItemView[] {
  const checklistCollections = getNestedArray(detail, ["checklist", "items", "tasks", "exercises"]);
  if (checklistCollections.length > 0) {
    return checklistCollections.flatMap((item, index) => {
      if (typeof item === "string" && item.trim().length > 0) {
        return [{
          id: `checklist-${index}`,
          label: item,
          complete: false,
          note: null,
        }];
      }

      if (!isObject(item)) {
        return [];
      }

      const complete =
        item.completed === true ||
        item.done === true ||
        pickOptionalText(item, ["status"])?.toLowerCase() === "completed";

      return [{
        id: getId(item) ?? `checklist-${index}`,
        label:
          getTextLike(item, ["name", "title", "label", "exercise_name"]) ??
          `Checklist item ${index + 1}`,
        complete,
        note: getTextLike(item, ["notes", "description"]),
      }];
    });
  }

  return adaptAssignmentDetail(detail).checklist.map((label, index) => ({
    id: `checklist-${index}`,
    label,
    complete: false,
    note: null,
  }));
}

function adaptLogEntries(routine: ReturnType<typeof adaptAssignmentDetail>["routines"][number], gradient: string): MobileRoutineDetailView {
  return {
    id: routine.id,
    title: routine.title || "Routine detail",
    subtitle: routine.label ?? "Routine detail is available through the client assignment payload.",
    completionLabel: routine.completionLabel,
    checklist: [],
    logEntries: routine.exercises.map((exercise, index) => ({
      id: exercise.id ?? `exercise-${index}`,
      label: exercise.title,
      setsLabel: exercise.sets ? `${exercise.sets} sets` : "Sets not assigned",
      repsLabel: exercise.reps ? `${exercise.reps} reps` : "Reps not assigned",
      weightLabel: exercise.weightGuidance ?? "Weight not logged",
      timingLabel: exercise.duration ? `${exercise.duration} min` : "Timing not logged",
      notes: null,
    })),
    gradient,
  };
}

function adaptRoutineDetails(detail: JsonValue | null): MobileRoutineDetailView[] {
  const adapted = adaptAssignmentDetail(detail);
  const checklist = adaptChecklist(detail);

  return adapted.routines.map((routine, index) => ({
    ...adaptLogEntries(routine, getGradient(index)),
    checklist,
  }));
}

function adaptWorkoutJournalCards(history: JsonValue | null): MobileWorkoutJournalCardView[] {
  return adaptWorkoutHistoryPage(history).items.map((item, index) => ({
    id: item.id || `journal-${index}`,
    title: item.routineContext ?? `Workout ${index + 1}`,
    subtitle: item.completionStatus ?? "Workout history entry",
    performedAtLabel: formatDateTimeLabel(item.performedAt, "No workout date"),
    durationLabel:
      item.durationMinutes !== null ? `${item.durationMinutes} min` : "Timing not logged",
    modeLabel: item.mode.replace(/_/g, " "),
    notesPreview: item.clientNotes ?? item.ptNotes,
  }));
}

export function adaptClientTrainingView(args: {
  assignments: JsonValue | null;
  assignmentDetail?: JsonValue | null;
  workoutHistory?: JsonValue | null;
}): MobileClientTrainingView {
  const checklist = adaptChecklist(args.assignmentDetail ?? null);

  return {
    assignmentCards: adaptAssignmentCards(args.assignments),
    routineDetails: adaptRoutineDetails(args.assignmentDetail ?? null),
    workoutJournalCards: adaptWorkoutJournalCards(args.workoutHistory ?? null),
    hasAssignments: getArray(args.assignments).length > 0,
    hasChecklistItems: checklist.length > 0,
  };
}
