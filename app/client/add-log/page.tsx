"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { getId } from "@/lib/adapters/common";
import {
  adaptWorkoutHistoryPage,
  type WorkoutHistoryExerciseEntryView,
  type WorkoutHistoryItemView,
} from "@/lib/adapters/workout-history";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import type {
  CreateWorkoutLogInput,
  WorkoutLogExerciseEntryInput,
  WorkoutLogMode,
} from "@/lib/types/training";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import { FULL_LOG_HISTORY_ROUTE } from "@/lib/workout-history-routes";

type WorkoutLogResponse = ApiResponse<JsonValue>;
type ContextMode = "rep" | "set" | "general";
type EntryModalTab = "log" | "recent-history";
type WorkoutTypeFilter = "all" | WorkoutLogMode;
type TimerTypeFilter = "all" | "rep" | "set" | "routine";
type ExerciseInputRowState = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  time: string;
};
type WorkoutHistoryTableRow = {
  id: string;
  mode: WorkoutLogMode;
  performedAtLabel: string;
  performedAtRaw: string | null;
  performedAtTimestamp: number;
  typeLabel: string;
  exerciseName: string;
  sets: string;
  reps: string;
  weight: string;
  weightValue: number | null;
  duration: string;
  durationSeconds: number | null;
  notes: string;
};
type GoalTemplateIconName = "pushup" | "running" | "bench" | "jumpRope";
type GoalTemplateTheme = "emerald" | "lime" | "amber" | "orange" | "rose" | "coral";
type StapleGoalTemplateTheme = "stapleBlue" | "stapleOrange" | "stapleLavender";
type GoalTemplateCardTheme = GoalTemplateTheme | StapleGoalTemplateTheme;
type GoalTemplateCard = {
  id: string;
  label: string;
  value: string;
  progressText: string;
  theme: GoalTemplateTheme;
  iconName: GoalTemplateIconName;
  createdAt: string;
};
type StapleGoalTemplateCard = {
  id: string;
  label: string;
  value: string;
  progressText: string;
  theme: StapleGoalTemplateTheme;
  iconName: GoalTemplateIconName;
};
type GoalTemplateFormState = {
  label: string;
  value: string;
  progressText: string;
  theme: GoalTemplateTheme;
  iconName: GoalTemplateIconName;
};

type ActionPillLinkProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type StateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

const GOAL_TEMPLATE_STORAGE_KEY = "mealmetric:add-log:goal-templates";
const GOAL_TEMPLATE_PAGE_SIZE = 4;
const EXERCISE_SUGGESTIONS_LIST_ID = "client-add-log-exercise-suggestions";
const TIMER_EXERCISE_ROW_LIMIT = 5;
const TIMER_FILTER_POPOVER_ID = "client-add-log-timer-filter-popover";
const GOAL_TEMPLATE_THEMES: GoalTemplateTheme[] = [
  "emerald",
  "lime",
  "amber",
  "orange",
  "rose",
  "coral",
];
const GOAL_TEMPLATE_THEME_LABELS: Record<GoalTemplateTheme, string> = {
  emerald: "Emerald",
  lime: "Lime",
  amber: "Amber",
  orange: "Orange",
  rose: "Rose",
  coral: "Coral",
};
const GOAL_TEMPLATE_ICON_LABELS: Record<GoalTemplateIconName, string> = {
  pushup: "Push-up",
  running: "Running",
  bench: "Bench press",
  jumpRope: "Jump rope",
};
const DEFAULT_GOAL_TEMPLATE_FORM: GoalTemplateFormState = {
  label: "",
  value: "",
  progressText: "",
  theme: "emerald",
  iconName: "pushup",
};
const STAPLE_GOAL_TEMPLATE_CARDS: StapleGoalTemplateCard[] = [
  {
    id: "staple-pushup",
    label: "100",
    value: "PUSH UP",
    progressText: "",
    iconName: "pushup",
    theme: "stapleBlue",
  },
  {
    id: "staple-running",
    label: "RUN A",
    value: "MILE",
    progressText: "",
    iconName: "running",
    theme: "stapleBlue",
  },
  {
    id: "staple-bench",
    label: "BENCH",
    value: "200LBS",
    progressText: "",
    iconName: "bench",
    theme: "stapleOrange",
  },
  {
    id: "staple-jump-rope",
    label: "10 MINS STRAIGHT",
    value: "JUMP ROPE",
    progressText: "",
    iconName: "jumpRope",
    theme: "stapleLavender",
  },
];

function ActionPillLink({
  href,
  children,
  tone = "purple",
}: ActionPillLinkProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function StateCard({ title, message, action }: StateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-training-state-card">
      <div className="mobile-section__copy">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-training-action-row">{action}</div> : null}
    </MobileCard>
  );
}

function TimerHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="client-add-log-timer-icon"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M9 3h6M12 7v5l3 2.2M7.4 5.6l1.5 1.5M16.6 7.1l1.5-1.5M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function createExerciseRow(): ExerciseInputRowState {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    sets: "",
    reps: "",
    weight: "",
    time: "",
  };
}

function normalizeOptionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function normalizeOptionalInteger(value: string): number | undefined {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  if (!/^\d+$/.test(normalized)) {
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function isGoalTemplateTheme(value: unknown): value is GoalTemplateTheme {
  return typeof value === "string" && GOAL_TEMPLATE_THEMES.includes(value as GoalTemplateTheme);
}

function isGoalTemplateIconName(value: unknown): value is GoalTemplateIconName {
  return (
    value === "pushup" ||
    value === "running" ||
    value === "bench" ||
    value === "jumpRope"
  );
}

function GoalTemplateIcon({
  iconName,
  className,
}: {
  iconName: GoalTemplateIconName;
  className?: string;
}) {
  switch (iconName) {
    case "running":
      return (
        <svg viewBox="0 0 72 72" className={className} aria-hidden="true" focusable="false">
          <circle cx="46" cy="12" r="5" fill="currentColor" />
          <path
            d="M38 24l10-6 9 4m-19 2l7 8 9 3m-14-11l-7 10m12-2l-7 13m15-10l11 10m-30 1l-12 8m17-20l-14-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 22h10M6 31h13"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.72"
          />
        </svg>
      );
    case "bench":
      return (
        <svg viewBox="0 0 72 72" className={className} aria-hidden="true" focusable="false">
          <path
            d="M10 14h52M16 9v10m40-10v10M23 27h26m-14 0v12m-14 2h28m-30 0l-7 15m44-15l7 15m-40-1v8m26-8v8"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="36" cy="34" r="3.5" fill="currentColor" />
        </svg>
      );
    case "jumpRope":
      return (
        <svg viewBox="0 0 72 72" className={className} aria-hidden="true" focusable="false">
          <circle cx="36" cy="13" r="5" fill="currentColor" />
          <path
            d="M36 20v15m0 0l-10 11m10-11l10 11m-14 4l-4 13m18-13l4 13"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 52c2-18 10-26 14-29M58 52c-2-18-10-26-14-29"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.88"
          />
        </svg>
      );
    case "pushup":
    default:
      return (
        <svg viewBox="0 0 72 72" className={className} aria-hidden="true" focusable="false">
          <circle cx="56" cy="20" r="5" fill="currentColor" />
          <path
            d="M16 40h18l12-14m-22 14l-5 16m9-16l10 18m8-32l11 8m-20 8h22"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function GoalTemplateCardSurface({
  card,
  onClick,
}: {
  card: {
    id: string;
    label: string;
    value: string;
    progressText: string;
    theme: GoalTemplateCardTheme;
    iconName: GoalTemplateIconName;
  };
  onClick?: () => void;
}) {
  const isStapleCard = card.theme.startsWith("staple");
  const className = [
    "client-add-log-option-card",
    isStapleCard ? "client-add-log-staple-card" : "client-add-log-template-card",
    isStapleCard
      ? `client-add-log-staple-card--${card.theme.replace("staple", "").toLowerCase()}`
      : `client-add-log-template-card--${card.theme}`,
  ].join(" ");

  const content = (
    <>
      <div className="client-add-log-template-card__copy">
        <p className="client-add-log-template-card__label">{card.label}</p>
        <h3 className="client-add-log-template-card__value">{card.value}</h3>
        {card.progressText.trim().length > 0 ? (
          <p className="client-add-log-template-card__progress">{card.progressText}</p>
        ) : null}
      </div>
      <div className="client-add-log-template-card__icon">
        <GoalTemplateIcon iconName={card.iconName} className="client-add-log-template-card__icon-svg" />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`${className} mobile-focus-ring`}
        onClick={onClick}
        aria-label={`Use staple goal ${card.label} ${card.value}`}
      >
        {content}
      </button>
    );
  }

  return (
    <MobileCard as="article" variant="soft" className={className}>
      {content}
    </MobileCard>
  );
}

function createGoalTemplateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readGoalTemplatesFromStorage(): GoalTemplateCard[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(GOAL_TEMPLATE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const record = entry as Record<string, unknown>;
      if (
        typeof record.id !== "string" ||
        typeof record.label !== "string" ||
        typeof record.value !== "string" ||
        !isGoalTemplateTheme(record.theme) ||
        typeof record.createdAt !== "string"
      ) {
        return [];
      }

      return [{
        id: record.id,
        label: record.label,
        value: record.value,
        progressText:
          typeof record.progressText === "string" && record.progressText.trim().length > 0
            ? record.progressText
            : "Stored on this browser only.",
        theme: record.theme,
        iconName: isGoalTemplateIconName(record.iconName) ? record.iconName : "pushup",
        createdAt: record.createdAt,
      }];
    });
  } catch {
    return [];
  }
}

function chunkGoalTemplates(goalTemplates: GoalTemplateCard[]): GoalTemplateCard[][] {
  if (goalTemplates.length === 0) {
    return [];
  }

  const pages: GoalTemplateCard[][] = [];

  for (let index = 0; index < goalTemplates.length; index += GOAL_TEMPLATE_PAGE_SIZE) {
    pages.push(goalTemplates.slice(index, index + GOAL_TEMPLATE_PAGE_SIZE));
  }

  return pages;
}

function hasInvalidIntegerValue(value: string): boolean {
  return !isBlank(value) && normalizeOptionalInteger(value) === undefined;
}

function getQuadPageAriaLabel(pageIndex: number): string {
  if (pageIndex === 0) {
    return "Show starter quad";
  }

  if (pageIndex === 1) {
    return "Show staple goal templates";
  }

  return `Show goal template page ${pageIndex - 1}`;
}

function buildExerciseSuggestions(rows: WorkoutHistoryTableRow[]): string[] {
  const seen = new Set<string>();

  for (const row of rows) {
    const name = row.exerciseName.trim();
    if (name.length > 0 && name !== "-") {
      seen.add(name);
    }
  }

  return Array.from(seen).sort((left, right) => left.localeCompare(right));
}

function formatStopwatchDisplay(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function matchesTimerSearch(row: WorkoutHistoryTableRow, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return true;
  }

  const typeLabels =
    row.mode === "general_workout"
      ? [row.typeLabel, "Routine", "Workout Routine"]
      : [row.typeLabel];
  const searchableValues = [
    row.exerciseName,
    row.performedAtLabel,
    ...typeLabels,
    `Sets ${row.sets}`,
    `Reps ${row.reps}`,
    `Weight ${row.weight}`,
    `Time ${row.duration}`,
  ];

  return searchableValues.some((value) => value.toLowerCase().includes(normalizedQuery));
}

function buildTimerExerciseRows(
  rows: WorkoutHistoryTableRow[],
  timerTypeFilter: TimerTypeFilter,
  activeQuery: string,
): WorkoutHistoryTableRow[] {
  const filteredRows = rows.filter(
    (row) =>
      row.exerciseName.trim().length > 0 &&
      row.exerciseName !== "-" &&
      (timerTypeFilter === "all" ||
        (timerTypeFilter === "routine"
          ? row.mode === "general_workout"
          : row.mode === timerTypeFilter)) &&
      matchesTimerSearch(row, activeQuery),
  );
  const selectedIds = new Set<string>();
  const selectedNames = new Set<string>();
  const prioritizedRows: WorkoutHistoryTableRow[] = [];

  function trySelect(row: WorkoutHistoryTableRow, allowDuplicateName: boolean) {
    if (prioritizedRows.length >= TIMER_EXERCISE_ROW_LIMIT || selectedIds.has(row.id)) {
      return;
    }

    const normalizedName = row.exerciseName.trim().toLowerCase();
    if (!allowDuplicateName && selectedNames.has(normalizedName)) {
      return;
    }

    prioritizedRows.push(row);
    selectedIds.add(row.id);
    if (normalizedName.length > 0) {
      selectedNames.add(normalizedName);
    }
  }

  const timedRows = filteredRows.filter((row) => (row.durationSeconds ?? 0) > 0);

  for (const row of timedRows) {
    trySelect(row, false);
  }

  for (const row of filteredRows) {
    trySelect(row, false);
  }

  for (const row of filteredRows) {
    trySelect(row, true);
  }

  return prioritizedRows;
}

function normalizeExerciseEntries(
  exercises: ExerciseInputRowState[],
  contextMode: ContextMode,
  selectedExerciseName: string,
): WorkoutLogExerciseEntryInput[] {
  const scopedExercises = contextMode === "rep" ? exercises.slice(0, 1) : exercises;
  const normalizedSelectedExerciseName = normalizeOptionalText(selectedExerciseName);

  return scopedExercises.flatMap((exercise, index) => {
    const exerciseName =
      contextMode === "general"
        ? normalizeOptionalText(exercise.name)
        : normalizedSelectedExerciseName;
    const sets =
      contextMode === "general" ? normalizeOptionalInteger(exercise.sets) : undefined;
    const reps =
      contextMode === "rep" ? undefined : normalizeOptionalInteger(exercise.reps);
    const weight = normalizeOptionalNumber(exercise.weight);
    const durationMinutes = normalizeOptionalNumber(exercise.time);
    const durationSeconds =
      durationMinutes === undefined ? undefined : Math.round(durationMinutes * 60);

    const hasMeaningfulContent =
      exerciseName !== undefined ||
      sets !== undefined ||
      reps !== undefined ||
      weight !== undefined ||
      durationSeconds !== undefined;

    if (!hasMeaningfulContent) {
      return [];
    }

    return [{
      exercise_name: exerciseName,
      sets,
      reps,
      weight,
      duration_seconds: durationSeconds,
      position: index,
    }];
  });
}

function getWorkoutModePayload(contextMode: ContextMode): WorkoutLogMode {
  if (contextMode === "general") {
    return "general_workout";
  }

  return contextMode;
}

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

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
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

function formatTimerWorkoutType(mode: WorkoutLogMode): string {
  if (mode === "general_workout") {
    return "Routine";
  }

  return formatWorkoutType(mode);
}

function flattenExerciseEntries(logs: WorkoutHistoryItemView[]): WorkoutHistoryTableRow[] {
  return logs
    .flatMap((log, logIndex) => {
      const typeLabel = formatWorkoutType(log.mode);
      const performedAtLabel = formatPerformedAt(log.performedAt);
      const performedAtTimestamp = getPerformedTimestamp(log.performedAt);

      if (log.exerciseEntries.length === 0) {
        const notes = [log.clientNotes, log.ptNotes].filter(Boolean).join(" ").trim();

        return [{
          id: `${log.id}-entryless-${logIndex}`,
          mode: log.mode,
          performedAtLabel,
          performedAtRaw: log.performedAt,
          performedAtTimestamp,
          typeLabel,
          exerciseName: "-",
          sets: "-",
          reps: "-",
          weight: "-",
          weightValue: null,
          duration: "-",
          durationSeconds: null,
          notes: notes.length > 0 ? notes : "-",
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
    })
    .sort((left, right) => right.performedAtTimestamp - left.performedAtTimestamp);
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
}): WorkoutHistoryTableRow {
  const notes = [entry.notes, log.clientNotes, log.ptNotes].filter(Boolean).join(" ").trim();
  const exerciseName = entry.exerciseName ?? `Exercise ${entryIndex + 1}`;

  return {
    id: `${log.id}-${entry.id}-${entryIndex}-${logIndex}`,
    mode: log.mode,
    performedAtLabel,
    performedAtRaw: log.performedAt,
    performedAtTimestamp,
    typeLabel: formatWorkoutType(log.mode),
    exerciseName,
    sets: formatCellNumber(entry.sets),
    reps: formatCellNumber(entry.reps),
    weight: formatCellNumber(entry.weight),
    weightValue: entry.weight,
    duration: formatDuration(entry.durationSeconds),
    durationSeconds: entry.durationSeconds,
    notes: notes.length > 0 ? notes : "-",
  };
}

async function fetchWorkoutHistory({
  limit,
  typeFilter,
  searchValue,
  offset,
  signal,
}: {
  limit: number;
  typeFilter: WorkoutTypeFilter;
  searchValue: string;
  offset: number;
  signal?: AbortSignal;
}): Promise<JsonValue> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const normalizedSearch = searchValue.trim();

  if (typeFilter !== "all") {
    params.set("mode", typeFilter);
  }

  if (normalizedSearch.length > 0) {
    params.set("search", normalizedSearch);
  }

  const response = await fetch(`/api/client/training/workout-logs?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  const payload = (await response.json()) as WorkoutLogResponse;

  if (!payload.ok) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}

function createExercisesForMode(contextMode: ContextMode): ExerciseInputRowState[] {
  const nextRow = createExerciseRow();
  return [{
    ...nextRow,
    sets: contextMode === "general" ? nextRow.sets : "",
  }];
}

function AddLogPageContent() {
  const searchParams = useSearchParams();
  const historySectionRef = useRef<HTMLElement | null>(null);
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const initialRoutineName = searchParams.get("routineName")?.trim() ?? "";
  const initialRoutineId = searchParams.get("routineId")?.trim() ?? "";
  const initialAssignmentId = searchParams.get("assignmentId")?.trim() ?? "";

  const [contextMode, setContextMode] = useState<ContextMode>(
    initialRoutineName ? "rep" : "general",
  );
  const [routineName, setRoutineName] = useState(initialRoutineName);
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 16));
  const [exercises, setExercises] = useState<ExerciseInputRowState[]>([createExerciseRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [timerPickerOpen, setTimerPickerOpen] = useState(false);
  const [timerSessionOpen, setTimerSessionOpen] = useState(false);
  const [timerSelectedExercise, setTimerSelectedExercise] = useState<WorkoutHistoryTableRow | null>(
    null,
  );
  const [timerDraftSearchQuery, setTimerDraftSearchQuery] = useState("");
  const [timerActiveSearchQuery, setTimerActiveSearchQuery] = useState("");
  const [timerTypeFilter, setTimerTypeFilter] = useState<TimerTypeFilter>("all");
  const [timerFilterPopoverOpen, setTimerFilterPopoverOpen] = useState(false);
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<number | null>(null);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerRepName, setTimerRepName] = useState("");
  const [timerWeight, setTimerWeight] = useState("");
  const [timerSubmitError, setTimerSubmitError] = useState<string | null>(null);
  const [timerSubmitSuccess, setTimerSubmitSuccess] = useState<string | null>(null);
  const [timerSubmitting, setTimerSubmitting] = useState(false);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [entryModalTab, setEntryModalTab] = useState<EntryModalTab>("log");
  const [portalReady, setPortalReady] = useState(false);
  const [goalTemplates, setGoalTemplates] = useState<GoalTemplateCard[]>([]);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalTemplateForm, setGoalTemplateForm] = useState<GoalTemplateFormState>(
    DEFAULT_GOAL_TEMPLATE_FORM,
  );
  const [goalTemplateError, setGoalTemplateError] = useState<string | null>(null);
  const [quadPageIndex, setQuadPageIndex] = useState(0);
  const [quadSlideDirection, setQuadSlideDirection] = useState<"forward" | "backward">(
    "forward",
  );
  const [goalTemplatesHydrated, setGoalTemplatesHydrated] = useState(false);
  const [historyData, setHistoryData] = useState<JsonValue | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);

  const hasValidAnchor = initialAssignmentId.length > 0;
  const showsTopExerciseSelector = contextMode !== "general";
  const showsSetsField = contextMode === "general";
  const showsRepsField = contextMode !== "rep";
  const visibleExercises = contextMode === "rep" ? exercises.slice(0, 1) : exercises;
  const topExerciseSelectorLabel = contextMode === "set" ? "Set" : "Rep";
  const topExerciseSelectorPlaceholder =
    contextMode === "set" ? "Enter set name" : "Enter rep name";
  const requiresTopExerciseSelector =
    showsTopExerciseSelector && isBlank(routineName);
  const hasInvalidExerciseIntegers = visibleExercises.some(
    (exercise) =>
      (showsSetsField && hasInvalidIntegerValue(exercise.sets)) ||
      (showsRepsField && hasInvalidIntegerValue(exercise.reps)),
  );
  const blockingMessage = requiresTopExerciseSelector
    ? "Exercise name is required before saving."
    : hasInvalidExerciseIntegers
      ? showsSetsField
        ? "Sets and reps must be non-negative whole numbers before saving."
        : "Reps must be non-negative whole numbers before saving."
      : null;
  const userTemplatePages = chunkGoalTemplates(goalTemplates);
  const userTemplatePageCount = userTemplatePages.length;
  const totalQuadPages = 2 + userTemplatePageCount;
  const quadPageNumbers = Array.from({ length: totalQuadPages }, (_, index) => index);
  const currentUserTemplatePage =
    quadPageIndex <= 1 ? [] : (userTemplatePages[quadPageIndex - 2] ?? []);
  const visibleTemplateTiles: Array<GoalTemplateCard | null> = [...currentUserTemplatePage];
  const activeUserTemplatePageNumber = Math.max(1, quadPageIndex - 1);

  while (visibleTemplateTiles.length < GOAL_TEMPLATE_PAGE_SIZE) {
    visibleTemplateTiles.push(null);
  }

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setGoalTemplates(readGoalTemplatesFromStorage());
    setGoalTemplatesHydrated(true);
  }, []);

  useEffect(() => {
    if (!goalTemplatesHydrated || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(GOAL_TEMPLATE_STORAGE_KEY, JSON.stringify(goalTemplates));
    } catch {
      // Ignore storage write failures and keep the in-memory templates active.
    }
  }, [goalTemplates, goalTemplatesHydrated]);

  useEffect(() => {
    if (quadPageIndex <= totalQuadPages - 1) {
      return;
    }

    setQuadPageIndex(totalQuadPages - 1);
  }, [quadPageIndex, totalQuadPages]);

  useEffect(() => {
    if (!goalModalOpen || typeof window === "undefined") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setGoalModalOpen(false);
        setGoalTemplateError(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goalModalOpen]);

  useEffect(() => {
    if (!entryFormOpen || typeof window === "undefined") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEntryFormOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [entryFormOpen]);

  useEffect(() => {
    if ((!timerPickerOpen && !timerSessionOpen) || typeof window === "undefined") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (timerFilterPopoverOpen) {
        setTimerFilterPopoverOpen(false);
        return;
      }

      if (timerSessionOpen) {
        setTimerRunning(false);
        setTimerSessionOpen(false);
        setTimerSelectedExercise(null);
        setTimerStartTimestamp(null);
        setTimerElapsedSeconds(0);
        setTimerRepName("");
        setTimerWeight("");
        setTimerSubmitError(null);
        setTimerSubmitting(false);
        return;
      }

      setTimerPickerOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [timerFilterPopoverOpen, timerPickerOpen, timerSessionOpen]);

  useEffect(() => {
    if ((!entryFormOpen && !timerPickerOpen && !timerSessionOpen) || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [entryFormOpen, timerPickerOpen, timerSessionOpen]);

  useEffect(() => {
    if (!timerRunning || timerStartTimestamp === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimerElapsedSeconds(Math.max(0, Math.floor((Date.now() - timerStartTimestamp) / 1000)));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timerRunning, timerStartTimestamp]);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryErrorMessage(null);

      try {
        const data = await fetchWorkoutHistory({
          limit: 5,
          typeFilter: "all",
          searchValue: "",
          offset: 0,
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setHistoryData(data);
      } catch (error) {
        if (!active || controller.signal.aborted) {
          return;
        }

        setHistoryErrorMessage(
          error instanceof Error ? error.message : "Unable to load workout history.",
        );
        setHistoryData(null);
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
      controller.abort();
    };
  }, [status, user]);

  if (status === "loading") {
    return <LoadingBlock title="Loading log workout" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="Workout logging requires an authenticated client session."
      />
    );
  }

  function navigateToQuadPage(nextPageIndex: number) {
    const clampedPageIndex = Math.max(0, Math.min(nextPageIndex, totalQuadPages - 1));
    if (clampedPageIndex === quadPageIndex) {
      return;
    }

    setQuadSlideDirection(clampedPageIndex > quadPageIndex ? "forward" : "backward");
    setQuadPageIndex(clampedPageIndex);
  }

  function openEntryForm(mode: ContextMode) {
    setEntryModalTab("log");
    setContextMode(mode);
    setRoutineName(mode === "general" ? "" : initialRoutineName);
    setExercises(createExercisesForMode(mode));
    setEntryFormOpen(true);
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function closeEntryForm() {
    setEntryFormOpen(false);
    setEntryModalTab("log");
  }

  function resetTimerSession() {
    setTimerRunning(false);
    setTimerSessionOpen(false);
    setTimerSelectedExercise(null);
    setTimerStartTimestamp(null);
    setTimerElapsedSeconds(0);
    setTimerRepName("");
    setTimerWeight("");
    setTimerSubmitError(null);
    setTimerSubmitting(false);
    setTimerFilterPopoverOpen(false);
  }

  function openTimerPicker() {
    setTimerPickerOpen(true);
    setTimerSessionOpen(false);
    setTimerDraftSearchQuery("");
    setTimerActiveSearchQuery("");
    setTimerTypeFilter("all");
    setTimerFilterPopoverOpen(false);
    setTimerSubmitError(null);
    setTimerSubmitSuccess(null);
  }

  function closeTimerPicker() {
    setTimerPickerOpen(false);
    setTimerDraftSearchQuery("");
    setTimerActiveSearchQuery("");
    setTimerFilterPopoverOpen(false);
  }

  function applyTimerSearch() {
    setTimerActiveSearchQuery(timerDraftSearchQuery.trim());
  }

  function handleTimerExerciseSelect(row: WorkoutHistoryTableRow) {
    setTimerSelectedExercise(row);
    setTimerPickerOpen(false);
    setTimerSessionOpen(true);
    setTimerRepName(row.exerciseName);
    setTimerWeight(row.weightValue === null ? "" : String(row.weightValue));
    setTimerElapsedSeconds(0);
    setTimerStartTimestamp(null);
    setTimerRunning(false);
    setTimerFilterPopoverOpen(false);
    setTimerSubmitError(null);
    setTimerSubmitSuccess(null);
  }

  function handleTimerStart() {
    setTimerSubmitError(null);
    setTimerStartTimestamp(Date.now() - timerElapsedSeconds * 1000);
    setTimerRunning(true);
  }

  async function handleTimerSave() {
    const elapsedSeconds =
      timerStartTimestamp === null
        ? timerElapsedSeconds
        : Math.max(0, Math.floor((Date.now() - timerStartTimestamp) / 1000));
    const normalizedRepName = normalizeOptionalText(timerRepName);
    const normalizedWeight = normalizeOptionalNumber(timerWeight);

    setTimerElapsedSeconds(elapsedSeconds);
    setTimerRunning(false);
    setTimerStartTimestamp(null);
    setTimerSubmitting(true);
    setTimerSubmitError(null);
    setTimerSubmitSuccess(null);

    if (!normalizedRepName) {
      setTimerSubmitError("Rep name is required before saving.");
      setTimerSubmitting(false);
      return;
    }

    if (timerWeight.trim().length > 0 && normalizedWeight === undefined) {
      setTimerSubmitError("Weight must be a non-negative number.");
      setTimerSubmitting(false);
      return;
    }

    const durationSeconds = Math.max(1, elapsedSeconds);

    try {
      const requestBody: CreateWorkoutLogInput = {
        mode: "rep",
        performed_at: new Date().toISOString(),
        completion_status: "completed",
        exercise_entries: [{
          exercise_name: normalizedRepName,
          weight: normalizedWeight,
          duration_seconds: durationSeconds,
          position: 0,
        }],
      };

      const response = await fetch("/api/client/training/workout-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const payload = (await response.json()) as WorkoutLogResponse;

      if (!payload.ok) {
        setTimerSubmitError(payload.error.message);
        return;
      }

      const confirmedSavedLog = await refreshConfirmedHistory(getId(payload.data));
      if (!confirmedSavedLog) {
        setTimerSubmitError(
          "The workout request completed, but the refreshed log history could not confirm the saved entry.",
        );
        return;
      }

      setTimerSubmitSuccess("Timed workout saved.");
      resetTimerSession();
    } catch (error) {
      setTimerSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to complete the timed workout save confirmation.",
      );
    } finally {
      setTimerSubmitting(false);
    }
  }

  function handleTimerPrimaryAction() {
    if (timerRunning) {
      void handleTimerSave();
      return;
    }

    handleTimerStart();
  }

  function openGoalModal(prefill?: Partial<GoalTemplateFormState>) {
    setGoalTemplateError(null);
    setGoalTemplateForm({ ...DEFAULT_GOAL_TEMPLATE_FORM, ...prefill });
    setGoalModalOpen(true);
  }

  function closeGoalModal() {
    setGoalModalOpen(false);
    setGoalTemplateError(null);
    setGoalTemplateForm(DEFAULT_GOAL_TEMPLATE_FORM);
  }

  function handleStapleGoalCardClick(stapleGoalTemplate: StapleGoalTemplateCard) {
    openGoalModal({
      label: stapleGoalTemplate.label,
      value: stapleGoalTemplate.value,
      progressText: stapleGoalTemplate.progressText,
      iconName: stapleGoalTemplate.iconName,
    });
  }

  function handleGoalTemplateFieldChange(
    key: keyof GoalTemplateFormState,
    value: string,
  ) {
    setGoalTemplateForm((current) => ({ ...current, [key]: value }));
    setGoalTemplateError(null);
  }

  function handleGoalTemplateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const label = normalizeOptionalText(goalTemplateForm.label);
    const value = normalizeOptionalText(goalTemplateForm.value);
    const progressText = normalizeOptionalText(goalTemplateForm.progressText);

    if (!label || !value) {
      setGoalTemplateError("Goal label and goal target are required.");
      return;
    }

    const nextTemplate: GoalTemplateCard = {
      id: createGoalTemplateId(),
      label,
      value,
      progressText: progressText ?? "Stored on this browser only.",
      theme: goalTemplateForm.theme,
      iconName: goalTemplateForm.iconName,
      createdAt: new Date().toISOString(),
    };

    setGoalTemplates((current) => [nextTemplate, ...current]);
    setQuadSlideDirection("forward");
    setQuadPageIndex(2);
    closeGoalModal();
  }

  async function refreshConfirmedHistory(savedLogId: string | null): Promise<boolean> {
    const confirmedHistoryData = await fetchWorkoutHistory({
      limit: 5,
      typeFilter: "all",
      searchValue: "",
      offset: 0,
    });
    const confirmedLogs = adaptWorkoutHistoryPage(confirmedHistoryData).items;
    const confirmedSavedLog =
      savedLogId === null ? true : confirmedLogs.some((log) => log.id === savedLogId);

    setHistoryData(confirmedHistoryData);
    setHistoryErrorMessage(null);
    setHistoryLoading(false);

    return confirmedSavedLog;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blockingMessage) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const exerciseEntries = normalizeExerciseEntries(
        visibleExercises,
        contextMode,
        routineName,
      );
      const requestBody: CreateWorkoutLogInput = {
        assignment_id: hasValidAnchor ? initialAssignmentId : undefined,
        routine_id: contextMode === "rep" && initialRoutineId ? initialRoutineId : undefined,
        mode: getWorkoutModePayload(contextMode),
        performed_at: new Date(performedAt).toISOString(),
        completion_status: "completed",
        exercise_entries: exerciseEntries.length > 0 ? exerciseEntries : undefined,
      };

      const response = await fetch("/api/client/training/workout-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const payload = (await response.json()) as WorkoutLogResponse;

      if (!payload.ok) {
        setSubmitError(payload.error.message);
        return;
      }

      const savedLogId = getId(payload.data);
      const confirmedSavedLog = await refreshConfirmedHistory(savedLogId);

      if (!confirmedSavedLog) {
        setSubmitError(
          "The workout request completed, but the refreshed log history could not confirm the saved entry.",
        );
        return;
      }

      setSubmitSuccess("Workout Saved");
      setRoutineName(contextMode === "general" ? "" : initialRoutineName);
      setExercises(createExercisesForMode(contextMode));
      closeEntryForm();
      historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to complete the workout save confirmation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleExerciseChange(
    id: string,
    key: keyof Omit<ExerciseInputRowState, "id">,
    value: string,
  ) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === id ? { ...exercise, [key]: value } : exercise,
      ),
    );
  }

  function handleAddExercise() {
    if (contextMode === "rep") {
      return;
    }

    setExercises((current) => [...current, createExerciseRow()]);
  }

  function handleRemoveExercise(id: string) {
    setExercises((current) => current.filter((exercise) => exercise.id !== id));
  }

  const historyPage = adaptWorkoutHistoryPage(historyData);
  const allHistoryRows = flattenExerciseEntries(historyPage.items);
  const exerciseSuggestions = buildExerciseSuggestions(allHistoryRows);
  const historyRows = allHistoryRows.slice(0, 3);
  const timerExerciseRows = buildTimerExerciseRows(
    allHistoryRows,
    timerTypeFilter,
    timerActiveSearchQuery,
  );
  const timerDisplay = formatStopwatchDisplay(timerElapsedSeconds);
  const timerDialogsOpen = timerPickerOpen || timerSessionOpen;
  const recentHistoryMode = getWorkoutModePayload(contextMode);
  const recentHistoryRows = allHistoryRows
    .filter((row) => row.mode === recentHistoryMode)
    .slice(0, 5);
  const recentHistoryDescription =
    contextMode === "rep"
      ? "Recent rep logs"
      : contextMode === "set"
        ? "Recent set logs"
        : "Recent general workout logs";
  const addEntryLabel = contextMode === "set" ? "Add Rep" : "Add Exercise";
  const showAddEntryButton = contextMode !== "rep";
  const entryModalTitle =
    contextMode === "rep"
      ? "Log A Rep"
      : contextMode === "set"
        ? "Log A Set"
        : "Log a Workout Routine";
  const entryModalMarkup = entryFormOpen ? (
    <div
      className="client-add-log-entry-modal-portal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeEntryForm();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-add-log-entry-modal-title"
        className="client-add-log-entry-modal-portal"
      >
        <div className="client-add-log-entry-modal-portal__header">
          <div className="mobile-section__copy">
            <p className="mobile-section__eyebrow">Entry Form</p>
            <h2
              id="client-add-log-entry-modal-title"
              className="mobile-section__title"
            >
              {entryModalTitle}
            </h2>
          </div>
          <button
            type="button"
            className="mobile-pill mobile-pill--purple mobile-focus-ring"
            onClick={closeEntryForm}
          >
            Close
          </button>
        </div>

        <div className="client-add-log-entry-modal-portal__body">
          <div
            className="client-add-log-entry-tabs"
            role="tablist"
            aria-label="Add log modal sections"
          >
            <button
              id="client-add-log-entry-log-tab"
              type="button"
              role="tab"
              aria-label="Show log form"
              aria-selected={entryModalTab === "log"}
              aria-controls="client-add-log-entry-log-panel"
              tabIndex={entryModalTab === "log" ? 0 : -1}
              className={[
                "client-add-log-entry-tab",
                entryModalTab === "log" ? "client-add-log-entry-tab--active" : "",
                "mobile-focus-ring",
              ].filter(Boolean).join(" ")}
              onClick={() => setEntryModalTab("log")}
            >
              Log
            </button>
            <button
              id="client-add-log-entry-history-tab"
              type="button"
              role="tab"
              aria-label="Show recent history"
              aria-selected={entryModalTab === "recent-history"}
              aria-controls="client-add-log-entry-history-panel"
              tabIndex={entryModalTab === "recent-history" ? 0 : -1}
              className={[
                "client-add-log-entry-tab",
                entryModalTab === "recent-history" ? "client-add-log-entry-tab--active" : "",
                "mobile-focus-ring",
              ].filter(Boolean).join(" ")}
              onClick={() => setEntryModalTab("recent-history")}
            >
              Recent History
            </button>
          </div>

          <MobileCard
            as="div"
            variant="action"
            className={[
              "mobile-training-log-card",
              "client-add-log-parity-card",
              "client-add-log-entry-tab-viewport",
              "client-add-log-entry-modal-portal__tab-viewport",
            ].join(" ")}
          >
            <div className="client-add-log-entry-tab-stack">
              <div
                id="client-add-log-entry-log-panel"
                role="tabpanel"
                aria-labelledby="client-add-log-entry-log-tab"
                aria-hidden={entryModalTab !== "log"}
                className={[
                  "client-add-log-entry-tab-panel",
                  entryModalTab === "log"
                    ? "client-add-log-entry-tab-panel--active"
                    : "client-add-log-entry-tab-panel--inactive",
                ].join(" ")}
              >
                <form
                  id="client-workout-entry-form"
                  className="mobile-training-form"
                  onSubmit={handleSubmit}
                >
                  <div className="mobile-training-form__grid">
                    {showsTopExerciseSelector ? (
                      <div className="field">
                        <label htmlFor="routine-context-name">{topExerciseSelectorLabel}</label>
                        <input
                          id="routine-context-name"
                          value={routineName}
                          onChange={(event) => setRoutineName(event.target.value)}
                          placeholder={topExerciseSelectorPlaceholder}
                          list={EXERCISE_SUGGESTIONS_LIST_ID}
                          disabled={submitting}
                        />
                      </div>
                    ) : null}

                    <div className="field">
                      <label htmlFor="performed-at">Performed at</label>
                      <input
                        id="performed-at"
                        type="datetime-local"
                        value={performedAt}
                        onChange={(event) => setPerformedAt(event.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  {showsTopExerciseSelector ? (
                    <datalist id={EXERCISE_SUGGESTIONS_LIST_ID}>
                      {exerciseSuggestions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  ) : null}

                  {visibleExercises.length > 0 ? (
                    <div className="mobile-training-exercise-grid">
                      {visibleExercises.map((exercise, index) => (
                        <MobileCard
                          key={exercise.id}
                          as="article"
                          variant="soft"
                          padding="compact"
                          className="mobile-training-exercise-card client-add-log-parity-row"
                        >
                          <div className="mobile-training-checklist-card__header">
                            <div className="mobile-section__copy">
                              <p className="mobile-section__eyebrow">Exercise row {index + 1}</p>
                              <h3 className="mobile-training-exercise-card__title">
                                {contextMode === "general"
                                  ? exercise.name.trim() || `Exercise ${index + 1}`
                                  : routineName.trim() ||
                                    (contextMode === "rep" ? "Rep entry" : "Set entry")}
                              </h3>
                              <p className="mobile-section__description">Track this movement for today.</p>
                            </div>
                            <button
                              type="button"
                              className="button--danger"
                              onClick={() => handleRemoveExercise(exercise.id)}
                              disabled={submitting || visibleExercises.length === 1}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mobile-training-form__grid">
                            {contextMode === "general" ? (
                              <div className="field">
                                <label htmlFor={`exercise-name-${exercise.id}`}>Exercise name</label>
                                <input
                                  id={`exercise-name-${exercise.id}`}
                                  value={exercise.name}
                                  onChange={(event) =>
                                    handleExerciseChange(exercise.id, "name", event.target.value)
                                  }
                                  placeholder="Bench press"
                                  disabled={submitting}
                                />
                              </div>
                            ) : null}
                            {contextMode === "general" ? (
                              <div className="field">
                                <label htmlFor={`exercise-sets-${exercise.id}`}>Sets</label>
                                <input
                                  id={`exercise-sets-${exercise.id}`}
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={exercise.sets}
                                  onChange={(event) =>
                                    handleExerciseChange(exercise.id, "sets", event.target.value)
                                  }
                                  placeholder="3"
                                  disabled={submitting}
                                />
                              </div>
                            ) : null}
                            {showsRepsField ? (
                              <div className="field">
                                <label htmlFor={`exercise-reps-${exercise.id}`}>Reps</label>
                                <input
                                  id={`exercise-reps-${exercise.id}`}
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={exercise.reps}
                                  onChange={(event) =>
                                    handleExerciseChange(exercise.id, "reps", event.target.value)
                                  }
                                  placeholder="10"
                                  disabled={submitting}
                                />
                              </div>
                            ) : null}
                            <div className="field">
                              <label htmlFor={`exercise-weight-${exercise.id}`}>Weight</label>
                              <input
                                id={`exercise-weight-${exercise.id}`}
                                type="number"
                                min="0"
                                value={exercise.weight}
                                onChange={(event) =>
                                  handleExerciseChange(exercise.id, "weight", event.target.value)
                                }
                                placeholder="135"
                                disabled={submitting}
                              />
                            </div>
                            <div className="field">
                              <label htmlFor={`exercise-time-${exercise.id}`}>
                                Time (minutes)
                              </label>
                              <input
                                id={`exercise-time-${exercise.id}`}
                                type="number"
                                min="0"
                                step="0.1"
                                value={exercise.time}
                                onChange={(event) =>
                                  handleExerciseChange(exercise.id, "time", event.target.value)
                                }
                                placeholder="15"
                                disabled={submitting}
                              />
                            </div>
                          </div>
                        </MobileCard>
                      ))}
                    </div>
                  ) : null}

                  {visibleExercises.length === 0 ? (
                    <EmptyState
                      title="Start your workout log"
                      message="Add an exercise row to begin capturing this workout."
                    />
                  ) : null}

                  {blockingMessage ? (
                    <p className="mobile-section__description">{blockingMessage}</p>
                  ) : null}

                  <div className="mobile-training-action-row">
                    {showAddEntryButton ? (
                      <button
                        type="button"
                        className="mobile-pill mobile-pill--purple mobile-focus-ring"
                        onClick={handleAddExercise}
                        disabled={submitting}
                      >
                        {addEntryLabel}
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      className="mobile-training-button mobile-training-button--primary mobile-focus-ring"
                      disabled={submitting || blockingMessage !== null}
                    >
                      {submitting ? "Saving..." : "Save Log Entry"}
                    </button>
                  </div>
                </form>
              </div>

              <section
                id="client-add-log-entry-history-panel"
                role="tabpanel"
                aria-labelledby="client-add-log-entry-history-tab"
                aria-hidden={entryModalTab !== "recent-history"}
                className={[
                  "client-add-log-entry-tab-panel",
                  "client-add-log-recent-history-panel",
                  entryModalTab === "recent-history"
                    ? "client-add-log-entry-tab-panel--active"
                    : "client-add-log-entry-tab-panel--inactive",
                ].join(" ")}
              >
                <div className="mobile-section__copy">
                  <h3 className="mobile-section__title">Recent History</h3>
                  <p className="mobile-section__description">{recentHistoryDescription}</p>
                </div>

                {historyLoading ? (
                  <p className="mobile-section__description">Loading recent history...</p>
                ) : historyErrorMessage ? (
                  <p className="mobile-section__description">Unable to load recent history.</p>
                ) : recentHistoryRows.length === 0 ? (
                  <p className="mobile-section__description">
                    No recent history for this log type yet.
                  </p>
                ) : (
                  <div className="stacked-list">
                    {recentHistoryRows.map((row) => (
                      <article key={row.id} className="client-add-log-recent-history-row">
                        <div className="mobile-section__copy">
                          <p className="mobile-section__eyebrow">{row.performedAtLabel}</p>
                          <h4 className="mobile-section__title">{row.exerciseName}</h4>
                        </div>
                        <div
                          className="mobile-training-pill-row"
                          aria-label={`${row.exerciseName} recent history`}
                        >
                          <span className="mobile-pill">Sets {row.sets}</span>
                          <span className="mobile-pill">Reps {row.reps}</span>
                          <span className="mobile-pill">Weight {row.weight}</span>
                          <span className="mobile-pill">Time {row.duration}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </MobileCard>
        </div>
      </section>
    </div>
  ) : null;
  const timerPickerMarkup = timerPickerOpen ? (
    <div
      className="client-add-log-timer-picker-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeTimerPicker();
        }
      }}
    >
      <section
        id="client-add-log-timer-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-add-log-timer-picker-title"
        className="client-add-log-timer-picker"
      >
        <div className="client-add-log-timer-picker__header">
          <div className="mobile-section__copy">
            <p className="mobile-section__eyebrow">Workout timer</p>
            <h2
              id="client-add-log-timer-picker-title"
              className="mobile-section__title"
            >
              SET TIMER
            </h2>
            <p className="mobile-section__description">
              Quick access to your latest timed or logged exercise rows.
            </p>
          </div>
          <button
            type="button"
            className="mobile-pill mobile-pill--purple mobile-focus-ring client-add-log-timer-button-reset"
            onClick={closeTimerPicker}
          >
            Close
          </button>
        </div>

        <div className="client-add-log-timer-picker__search">
          <label htmlFor="client-add-log-timer-search" className="sr-only">
            Search timer exercises
          </label>
          <div className="client-add-log-timer-picker__search-shell">
            <input
              id="client-add-log-timer-search"
              className="client-add-log-timer-picker__search-input mobile-focus-ring"
              type="search"
              value={timerDraftSearchQuery}
              onChange={(event) => setTimerDraftSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
              placeholder="Search recent exercises"
            />
            <button
              type="button"
              className="client-add-log-timer-picker__search-submit mobile-focus-ring client-add-log-timer-button-reset"
              aria-label="Search timer exercises"
              onClick={applyTimerSearch}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="m20 20-4.2-4.2M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
          </div>
          <div className="client-add-log-timer-picker__filter">
            <button
              type="button"
              className="client-add-log-timer-picker__filter-button mobile-focus-ring client-add-log-timer-button-reset"
              aria-label="Open timer exercise filters"
              aria-haspopup="dialog"
              aria-expanded={timerFilterPopoverOpen}
              aria-controls={TIMER_FILTER_POPOVER_ID}
              onClick={() => setTimerFilterPopoverOpen((current) => !current)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M12 3.75a2.25 2.25 0 1 0 0 4.5a2.25 2.25 0 0 0 0-4.5Zm0 12a2.25 2.25 0 1 0 0 4.5a2.25 2.25 0 0 0 0-4.5ZM4.5 9.75a2.25 2.25 0 1 0 0 4.5a2.25 2.25 0 0 0 0-4.5Zm15 0a2.25 2.25 0 1 0 0 4.5a2.25 2.25 0 0 0 0-4.5ZM12 6v2.25m0 7.5V18m-5.25-6H4.5m15 0h-2.25"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
            {timerFilterPopoverOpen ? (
              <div
                id={TIMER_FILTER_POPOVER_ID}
                role="dialog"
                aria-modal="false"
                aria-labelledby="client-add-log-timer-filter-title"
                className="client-add-log-timer-picker__filter-popover"
              >
                <p
                  id="client-add-log-timer-filter-title"
                  className="client-add-log-timer-picker__filter-title"
                >
                  Filter exercises
                </p>
                <fieldset
                  className="client-add-log-timer-picker__filter-group"
                  aria-label="Filter exercises by workout type"
                >
                  <legend className="sr-only">Filter exercises by workout type</legend>
                  {([
                    ["all", "All"],
                    ["rep", "Rep"],
                    ["set", "Set"],
                    ["routine", "Routine"],
                  ] as const).map(([value, label]) => (
                    <label
                      key={value}
                      className="client-add-log-timer-picker__filter-option"
                    >
                      <input
                        type="radio"
                        name="client-add-log-timer-type-filter"
                        value={value}
                        checked={timerTypeFilter === value}
                        onChange={() => setTimerTypeFilter(value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
              </div>
            ) : null}
          </div>
        </div>

        {historyLoading ? (
          <p className="mobile-section__description">Loading recent exercises...</p>
        ) : historyErrorMessage ? (
          <p className="mobile-section__description">{historyErrorMessage}</p>
        ) : timerExerciseRows.length === 0 ? (
          <p className="client-add-log-timer-picker__empty">
            No exercises available yet. Log an exercise first, then use the timer.
          </p>
        ) : (
          <div className="client-add-log-timer-picker__list">
            {timerExerciseRows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="client-add-log-timer-picker__item mobile-focus-ring client-add-log-timer-button-reset"
                onClick={() => handleTimerExerciseSelect(row)}
                aria-label={`Open timer session for ${row.exerciseName} from ${row.performedAtLabel}`}
              >
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">{row.performedAtLabel}</p>
                  <h3 className="mobile-section__title">{row.exerciseName}</h3>
                  <p className="mobile-section__description">{formatTimerWorkoutType(row.mode)}</p>
                </div>
                <div
                  className="mobile-training-pill-row"
                  aria-label={`${row.exerciseName} timer summary`}
                >
                  <span className="mobile-pill">Sets {row.sets}</span>
                  <span className="mobile-pill">Reps {row.reps}</span>
                  <span className="mobile-pill">Weight {row.weight}</span>
                  <span className="mobile-pill">Time {row.duration}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  ) : null;
  const timerSessionMarkup =
    timerSessionOpen && timerSelectedExercise ? (
      <div
        className="client-add-log-timer-session-backdrop"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            resetTimerSession();
          }
        }}
      >
        <section
          id="client-add-log-timer-session"
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-add-log-timer-session-title"
          className="client-add-log-timer-session"
        >
          <div className="client-add-log-timer-picker__header">
            <div className="mobile-section__copy">
              <p className="mobile-section__eyebrow">Workout timer</p>
              <h2
                id="client-add-log-timer-session-title"
                className="mobile-section__title"
              >
                SET TIMER
              </h2>
              <p className="mobile-section__description">
                {timerSelectedExercise.performedAtLabel}
              </p>
            </div>
            <button
              type="button"
              className="mobile-pill mobile-pill--purple mobile-focus-ring client-add-log-timer-button-reset"
              onClick={resetTimerSession}
            >
              Cancel
            </button>
          </div>

          <div className="client-add-log-timer-session__display" aria-label={`Elapsed time ${timerDisplay}`}>
            {timerDisplay}
          </div>

          <div className="client-add-log-timer-session__form">
            <div className="field">
              <label htmlFor="client-add-log-timer-rep">Rep</label>
              <input
                id="client-add-log-timer-rep"
                value={timerRepName}
                onChange={(event) => setTimerRepName(event.target.value)}
                placeholder="Bench Press"
                disabled={timerSubmitting}
              />
            </div>
            <div className="field">
              <label htmlFor="client-add-log-timer-weight">Weight</label>
              <input
                id="client-add-log-timer-weight"
                type="number"
                min="0"
                step="any"
                value={timerWeight}
                onChange={(event) => setTimerWeight(event.target.value)}
                placeholder="135"
                disabled={timerSubmitting}
              />
            </div>
            {timerSubmitError ? (
              <p className="client-add-log-timer-session__error">{timerSubmitError}</p>
            ) : null}
            <button
              type="button"
              className={[
                "client-add-log-timer-session__primary-button",
                timerRunning
                  ? "client-add-log-timer-session__primary-button--clock"
                  : "client-add-log-timer-session__primary-button--start",
                "mobile-focus-ring",
                "client-add-log-timer-button-reset",
              ].join(" ")}
              disabled={timerSubmitting}
              onClick={handleTimerPrimaryAction}
            >
              {timerSubmitting ? "SAVING..." : timerRunning ? "CLOCK IT" : "START"}
            </button>
          </div>
        </section>
      </div>
    ) : null;

  return (
    <MobileAppShell
      className="client-training-parity-shell client-training-parity-shell--add-log"
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="Log Workout"
      subtitle="Capture a workout quickly"
      onAvatarClick={openTimerPicker}
      avatarControls="client-add-log-timer-picker"
      avatarExpanded={timerDialogsOpen}
      avatarButtonLabel="Open workout timer"
      avatarContent={<TimerHubIcon />}
      notificationSlot={<ActionPillLink href="/client/settings">Settings</ActionPillLink>}
      activePath="/client/add-log"
    >
      {submitError ? (
        <FeedbackBanner
          tone="error"
          title="Error: Unable To Save"
          message={submitError}
        />
      ) : null}
      {submitSuccess ? (
        <FeedbackBanner
          tone="success"
          title="Workout Saved"
          message="The workout was saved through the protected BFF route and confirmed in refreshed log history."
        />
      ) : null}
      {timerSubmitSuccess ? (
        <FeedbackBanner
          tone="success"
          title="Timed workout saved"
          message={timerSubmitSuccess}
        />
      ) : null}
      {goalModalOpen ? (
        <div
          className="client-add-log-goal-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeGoalModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-add-log-goal-modal-title"
            className="client-add-log-goal-modal"
          >
            <div className="client-add-log-goal-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local browser templates</p>
                <h2
                  id="client-add-log-goal-modal-title"
                  className="mobile-section__title"
                >
                  Create Goal Template
                </h2>
                <p className="mobile-section__description">
                  These templates stay in local browser state only during this phase.
                </p>
              </div>
              <button
                type="button"
                className="mobile-pill mobile-pill--purple mobile-focus-ring"
                onClick={closeGoalModal}
              >
                Close
              </button>
            </div>

            <form className="client-add-log-goal-modal__form" onSubmit={handleGoalTemplateSubmit}>
              <div className="field">
                <label htmlFor="goal-template-label">Goal label</label>
                <input
                  id="goal-template-label"
                  value={goalTemplateForm.label}
                  onChange={(event) =>
                    handleGoalTemplateFieldChange("label", event.target.value)
                  }
                  placeholder="Push Ups"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="goal-template-value">Goal target</label>
                <input
                  id="goal-template-value"
                  value={goalTemplateForm.value}
                  onChange={(event) =>
                    handleGoalTemplateFieldChange("value", event.target.value)
                  }
                  placeholder="50 Push Ups"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="goal-template-note">Goal note</label>
                <textarea
                  id="goal-template-note"
                  value={goalTemplateForm.progressText}
                  onChange={(event) =>
                    handleGoalTemplateFieldChange("progressText", event.target.value)
                  }
                  placeholder="Complete every Monday and Thursday"
                  rows={3}
                />
              </div>

              <fieldset className="client-add-log-icon-picker">
                <legend>Icon</legend>
                <div
                  className="client-add-log-icon-picker__options"
                  role="radiogroup"
                  aria-label="Goal template icon"
                >
                  {(Object.keys(GOAL_TEMPLATE_ICON_LABELS) as GoalTemplateIconName[]).map((iconName) => {
                    const selected = goalTemplateForm.iconName === iconName;

                    return (
                      <label
                        key={iconName}
                        className={[
                          "client-add-log-icon-picker__option",
                          selected ? "client-add-log-icon-picker__option--active" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        <input
                          type="radio"
                          name="goal-template-icon"
                          value={iconName}
                          checked={selected}
                          aria-label={GOAL_TEMPLATE_ICON_LABELS[iconName]}
                          onChange={(event) =>
                            handleGoalTemplateFieldChange("iconName", event.target.value)
                          }
                        />
                        <GoalTemplateIcon
                          iconName={iconName}
                          className="client-add-log-icon-picker__icon"
                        />
                        <span>{GOAL_TEMPLATE_ICON_LABELS[iconName]}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="client-add-log-goal-theme-picker">
                <legend>Color theme</legend>
                <div
                  className="client-add-log-goal-theme-picker__options"
                  role="radiogroup"
                  aria-label="Goal template color theme"
                >
                  {GOAL_TEMPLATE_THEMES.map((theme) => {
                    const selected = goalTemplateForm.theme === theme;

                    return (
                      <label
                        key={theme}
                        className={[
                          "client-add-log-goal-theme-chip",
                          `client-add-log-goal-theme-chip--${theme}`,
                          selected ? "is-selected" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        <input
                          type="radio"
                          name="goal-template-theme"
                          value={theme}
                          checked={selected}
                          onChange={(event) =>
                            handleGoalTemplateFieldChange("theme", event.target.value)
                          }
                        />
                        <span>{GOAL_TEMPLATE_THEME_LABELS[theme]}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {goalTemplateError ? (
                <p className="mobile-section__description">{goalTemplateError}</p>
              ) : null}

              <div className="mobile-training-action-row">
                <button
                  type="button"
                  className="mobile-pill mobile-pill--purple mobile-focus-ring"
                  onClick={closeGoalModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mobile-training-button mobile-training-button--primary mobile-focus-ring"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {portalReady && timerPickerMarkup ? createPortal(timerPickerMarkup, document.body) : null}
      {portalReady && timerSessionMarkup ? createPortal(timerSessionMarkup, document.body) : null}
      {entryFormOpen && portalReady && entryModalMarkup
        ? createPortal(entryModalMarkup, document.body)
        : null}

      <MobileSection
        className="client-add-log-parity-hero"
        title="Log Your Reps"
        variant="accent"
      >
        <div className="client-add-log-quad-frame">
          <div className="client-add-log-quad-frame__header">
            <div className="mobile-section__copy">
              <p className="mobile-section__eyebrow">
                {quadPageIndex === 0
                  ? "Starter quad"
                  : quadPageIndex === 1
                    ? "Staple goals"
                    : `Goal templates page ${activeUserTemplatePageNumber} of ${userTemplatePageCount}`}
              </p>
              <p className="mobile-section__description">
                {quadPageIndex === 0
                  ? "Choose a quick logging lane, or open Goals and Aspirations to build reusable templates."
                  : quadPageIndex === 1
                    ? "Tap a staple goal card to prefill the template modal with its icon and copy."
                    : "Your goal templates are saved in this browser only for this phase."}
              </p>
            </div>
            {quadPageIndex > 0 ? (
              <button
                type="button"
                className="mobile-pill mobile-pill--yellow mobile-focus-ring"
                onClick={() => openGoalModal()}
              >
                Create Goal
              </button>
            ) : null}
          </div>

          <div
            key={`quad-page-${quadPageIndex}`}
            className={[
              "client-add-log-quad-page",
              `client-add-log-quad-page--${quadSlideDirection}`,
            ].join(" ")}
          >
            {quadPageIndex === 0 ? (
              <div className="mobile-training-meta-grid">
                <button
                  type="button"
                  className="client-add-log-entry-trigger mobile-focus-ring"
                  onClick={() => openEntryForm("rep")}
                  aria-label="Open Log A Rep form"
                >
                  <MobileStatCard
                    className="client-add-log-option-card"
                    label="Rep"
                    value="Log A Rep"
                    progressText="Log Singular Reps here"
                  />
                </button>
                <button
                  type="button"
                  className="client-add-log-entry-trigger mobile-focus-ring"
                  onClick={() => openEntryForm("set")}
                  aria-label="Open Log A Set form"
                >
                  <MobileStatCard
                    className="client-add-log-option-card"
                    label="Set"
                    value="Log A Set"
                    progressText="Log multiple Reps"
                  />
                </button>
                <button
                  type="button"
                  className="client-add-log-entry-trigger mobile-focus-ring"
                  onClick={() => openEntryForm("general")}
                  aria-label="Open Log a Workout Routine form"
                >
                  <MobileStatCard
                    className="client-add-log-option-card"
                    label="Workout Routine"
                    value="Log a Workout Routine"
                    progressText="Log Your Entire Routine"
                  />
                </button>
                <button
                  type="button"
                  className="client-add-log-goals-card-button mobile-focus-ring"
                  onClick={() => openGoalModal()}
                  aria-haspopup="dialog"
                >
                  <MobileStatCard
                    className="client-add-log-option-card client-add-log-goals-card"
                    label="Goals"
                    value="Goals and Aspirations"
                    progressText="Establish and track your goals and progress"
                  />
                </button>
              </div>
            ) : quadPageIndex === 1 ? (
              <div className="mobile-training-meta-grid">
                {STAPLE_GOAL_TEMPLATE_CARDS.map((stapleGoalTemplate) => (
                  <GoalTemplateCardSurface
                    key={stapleGoalTemplate.id}
                    card={stapleGoalTemplate}
                    onClick={() => handleStapleGoalCardClick(stapleGoalTemplate)}
                  />
                ))}
              </div>
            ) : (
              <div className="mobile-training-meta-grid">
                {visibleTemplateTiles.map((goalTemplate, index) =>
                  goalTemplate ? (
                    <GoalTemplateCardSurface
                      key={goalTemplate.id}
                      card={goalTemplate}
                    />
                  ) : (
                    <MobileCard
                      key={`goal-template-placeholder-${quadPageIndex}-${index}`}
                      as="article"
                      variant="soft"
                      className="client-add-log-option-card client-add-log-template-placeholder"
                    >
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">Add Goal</p>
                        <h3 className="mobile-section__title">Template slot open</h3>
                        <p className="mobile-section__description">
                          Use Goals and Aspirations to create a new template.
                        </p>
                      </div>
                    </MobileCard>
                  ),
                )}
              </div>
            )}
          </div>

          <div className="client-add-log-quad-pager" aria-label="Goal template page navigation">
            <div className="client-add-log-quad-pager__dots">
              {quadPageNumbers.map((index) => (
                <button
                  key={`quad-page-button-${index}`}
                  type="button"
                  className={[
                    "client-add-log-quad-page-button",
                    quadPageIndex === index ? "client-add-log-quad-page-button--active" : "",
                    "mobile-focus-ring",
                  ].filter(Boolean).join(" ")}
                  onClick={() => navigateToQuadPage(index)}
                  aria-label={getQuadPageAriaLabel(index)}
                  aria-current={quadPageIndex === index ? "page" : undefined}
                >
                  <span aria-hidden="true">{index + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </MobileSection>

      <section id="client-inline-workout-history" ref={historySectionRef}>
        <MobileSection
          eyebrow="History"
          title="Log history"
          description="Preview recent saved workout entries from the protected client workout-log route."
          action={<ActionPillLink href={FULL_LOG_HISTORY_ROUTE}>Full History</ActionPillLink>}
        >
          <p className="mobile-section__description">
            Open the calendar view for filters, search, and older entries.
          </p>

          {historyLoading ? (
            <LoadingBlock
              title="Loading history"
              message="Fetching the latest workout logs through the protected client route."
            />
          ) : historyErrorMessage ? (
            <ErrorBlock title="Unable to load workout history" message={historyErrorMessage} />
          ) : historyRows.length > 0 ? (
            <div className="stacked-list">
              {historyRows.map((row, index) => (
                <MobileCard
                  key={row.id}
                  as="article"
                  variant={index === 0 ? "accent" : "soft"}
                  className="mobile-training-checklist-card"
                >
                  <div className="mobile-training-checklist-card__header">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">{row.performedAtLabel}</p>
                      <h3 className="mobile-section__title">{row.exerciseName}</h3>
                      <p className="mobile-section__description">Notes: {row.notes}</p>
                    </div>
                    <span className="mobile-pill mobile-pill--yellow">{row.typeLabel}</span>
                  </div>

                  <div className="mobile-training-pill-row" aria-label={`${row.exerciseName} preview`}>
                    <span className="mobile-pill">Sets {row.sets}</span>
                    <span className="mobile-pill">Reps {row.reps}</span>
                    <span className="mobile-pill">Weight {row.weight}</span>
                    <span className="mobile-pill">Time {row.duration}</span>
                  </div>
                </MobileCard>
              ))}
            </div>
          ) : (
            <StateCard
              title="No logged workouts yet."
              message="Save your first workout entry and it will appear in this protected history preview."
            />
          )}

          {historyPage.hasMore ? (
            <div className="mobile-training-action-row">
              <ActionPillLink href={FULL_LOG_HISTORY_ROUTE} tone="yellow">
                View Full Log History
              </ActionPillLink>
            </div>
          ) : null}
        </MobileSection>
      </section>
    </MobileAppShell>
  );
}

export default function AddLogPage() {
  return (
    <Suspense
      fallback={
        <LoadingBlock
          title="Loading log workout"
          message="Preparing your workout logging form."
        />
      }
    >
      <AddLogPageContent />
    </Suspense>
  );
}
