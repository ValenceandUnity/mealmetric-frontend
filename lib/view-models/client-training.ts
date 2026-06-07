import type { JsonValue } from "@/lib/types/api";

import { getArray, getId, isObject, pickOptionalText } from "@/lib/adapters/common";
import {
  adaptAssignmentDetail,
  adaptTrainingAssignments,
} from "@/lib/adapters/training";
import { adaptWorkoutHistoryPage } from "@/lib/adapters/workout-history";
import {
  formatDateTimeLabel,
  formatCountLabel,
  getGradient,
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
  statusLabel: string | null;
  coachLabel: string | null;
  scheduleLabel: string;
  checklistLabel: string;
  routineCountLabel: string;
  href: string;
  gradient: string;
};

export type MobileTrainingChecklistPreviewView = {
  id: string;
  title: string;
  statusLabel: string | null;
  items: MobileWorkoutChecklistItemView[];
  guidance: string;
  href: string;
};

export type MobileClientTrainingView = {
  assignmentCards: MobileClientTrainingAssignmentCardView[];
  weeklyChecklist: MobileTrainingChecklistPreviewView[];
  checklistItems: MobileWorkoutChecklistItemView[];
  routineDetails: MobileRoutineDetailView[];
  workoutJournalCards: MobileWorkoutJournalCardView[];
  hasAssignments: boolean;
  hasChecklistItems: boolean;
};

function adaptChecklistCollection(items: JsonValue[]): MobileWorkoutChecklistItemView[] {
  return items.flatMap((item, index) => {
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

    const label = getTextLike(item, ["name", "title", "label"]);
    if (!label) {
      return [];
    }

    const complete =
      item.completed === true ||
      item.done === true ||
      pickOptionalText(item, ["status"])?.toLowerCase() === "completed";

    return [{
      id: getId(item) ?? `checklist-${index}`,
      label,
      complete,
      note: getTextLike(item, ["notes", "description"]),
    }];
  });
}

function adaptChecklist(value: JsonValue | null): MobileWorkoutChecklistItemView[] {
  if (!isObject(value)) {
    return [];
  }

  for (const key of ["checklist", "tasks", "items"]) {
    const items = adaptChecklistCollection(getArray(value[key]));
    if (items.length > 0) {
      return items;
    }
  }

  return [];
}

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
    statusLabel: assignment.status,
    coachLabel: assignment.coachName ? `With ${assignment.coachName}` : null,
    scheduleLabel: assignment.schedule,
    checklistLabel: assignment.checklistCount,
    routineCountLabel: assignment.routineCount ?? "Open routine for detail",
    href: assignment.id ? `/client/training/${assignment.id}` : "/client/training",
    gradient: getGradient(index),
  }));
}

function adaptWeeklyChecklist(assignments: JsonValue | null): MobileTrainingChecklistPreviewView[] {
  const assignmentCards = adaptAssignmentCards(assignments);
  const rawAssignments = getArray(assignments);

  return assignmentCards.map((assignment, index) => {
    const items = adaptChecklist(rawAssignments[index] ?? null).slice(0, 3);

    return {
      id: assignment.id ?? `assignment-${index}`,
      title: assignment.title,
      statusLabel: assignment.statusLabel,
      items,
      guidance:
        items.length > 0
          ? `${formatCountLabel(items.length, "checklist item")} available from the training list response.`
          : "Open routine to view checklist.",
      href: assignment.href,
    };
  });
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
    weeklyChecklist: adaptWeeklyChecklist(args.assignments),
    checklistItems: checklist,
    routineDetails: adaptRoutineDetails(args.assignmentDetail ?? null),
    workoutJournalCards: adaptWorkoutJournalCards(args.workoutHistory ?? null),
    hasAssignments: getArray(args.assignments).length > 0,
    hasChecklistItems: checklist.length > 0,
  };
}
