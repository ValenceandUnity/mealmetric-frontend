"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

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
  performedAtTimestamp: number;
  typeLabel: string;
  exerciseName: string;
  sets: string;
  reps: string;
  weight: string;
  duration: string;
  notes: string;
};
type GoalTemplateTheme = "emerald" | "lime" | "amber" | "orange" | "rose" | "coral";
type GoalTemplateCard = {
  id: string;
  label: string;
  value: string;
  progressText: string;
  theme: GoalTemplateTheme;
  createdAt: string;
};
type GoalTemplateFormState = {
  label: string;
  value: string;
  progressText: string;
  theme: GoalTemplateTheme;
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
const DEFAULT_GOAL_TEMPLATE_FORM: GoalTemplateFormState = {
  label: "",
  value: "",
  progressText: "",
  theme: "emerald",
};

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
        createdAt: record.createdAt,
      }];
    });
  } catch {
    return [];
  }
}

function chunkGoalTemplates(goalTemplates: GoalTemplateCard[]): GoalTemplateCard[][] {
  if (goalTemplates.length === 0) {
    return [[]];
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
  return pageIndex === 0 ? "Show starter quad" : `Show goal template page ${pageIndex}`;
}

function normalizeExerciseEntries(
  exercises: ExerciseInputRowState[],
  contextMode: ContextMode,
): WorkoutLogExerciseEntryInput[] {
  const scopedExercises = contextMode === "rep" ? exercises.slice(0, 1) : exercises;

  return scopedExercises.flatMap((exercise, index) => {
    const exerciseName = normalizeOptionalText(exercise.name);
    const sets =
      contextMode === "general" ? normalizeOptionalInteger(exercise.sets) : undefined;
    const reps = normalizeOptionalInteger(exercise.reps);
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
          performedAtTimestamp,
          typeLabel,
          exerciseName: "-",
          sets: "-",
          reps: "-",
          weight: "-",
          duration: "-",
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
    performedAtTimestamp,
    typeLabel: formatWorkoutType(log.mode),
    exerciseName,
    sets: formatCellNumber(entry.sets),
    reps: formatCellNumber(entry.reps),
    weight: formatCellNumber(entry.weight),
    duration: formatDuration(entry.durationSeconds),
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
  const initialRoutineLabel = searchParams.get("routineLabel")?.trim() ?? "";

  const [contextMode, setContextMode] = useState<ContextMode>(
    initialRoutineName ? "rep" : "general",
  );
  const [routineName, setRoutineName] = useState(initialRoutineName);
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 16));
  const [exercises, setExercises] = useState<ExerciseInputRowState[]>([createExerciseRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [recentDrawerOpen, setRecentDrawerOpen] = useState(false);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [entryModalTab, setEntryModalTab] = useState<EntryModalTab>("log");
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

  const hasPrefilledRoutine = initialRoutineName.length > 0;
  const hasValidAnchor = initialAssignmentId.length > 0;
  const showsSetsField = contextMode === "general";
  const visibleExercises = contextMode === "rep" ? exercises.slice(0, 1) : exercises;
  const hasInvalidExerciseIntegers = visibleExercises.some(
    (exercise) =>
      (showsSetsField && hasInvalidIntegerValue(exercise.sets)) ||
      hasInvalidIntegerValue(exercise.reps),
  );
  const blockingMessage = hasInvalidExerciseIntegers
    ? "Sets and reps must be non-negative whole numbers before saving."
    : null;
  const templatePages = chunkGoalTemplates(goalTemplates);
  const templatePageCount = templatePages.length;
  const totalQuadPages = 1 + templatePageCount;
  const quadPageNumbers = Array.from({ length: totalQuadPages }, (_, index) => index);
  const currentTemplatePage = quadPageIndex === 0 ? [] : (templatePages[quadPageIndex - 1] ?? []);
  const visibleTemplateTiles: Array<GoalTemplateCard | null> = [...currentTemplatePage];
  const activeTemplatePageNumber = Math.max(1, quadPageIndex);

  while (visibleTemplateTiles.length < GOAL_TEMPLATE_PAGE_SIZE) {
    visibleTemplateTiles.push(null);
  }

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
    setRoutineName(initialRoutineName);
    setExercises(createExercisesForMode(mode));
    setEntryFormOpen(true);
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function closeEntryForm() {
    setEntryFormOpen(false);
    setEntryModalTab("log");
  }

  function openGoalModal() {
    setGoalTemplateError(null);
    setGoalModalOpen(true);
  }

  function closeGoalModal() {
    setGoalModalOpen(false);
    setGoalTemplateError(null);
    setGoalTemplateForm(DEFAULT_GOAL_TEMPLATE_FORM);
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
      createdAt: new Date().toISOString(),
    };

    setGoalTemplates((current) => [nextTemplate, ...current]);
    setQuadSlideDirection("forward");
    setQuadPageIndex(1);
    closeGoalModal();
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
      const exerciseEntries = normalizeExerciseEntries(visibleExercises, contextMode);
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
      const confirmedHistoryData = await fetchWorkoutHistory({
        limit: 5,
        typeFilter: "all",
        searchValue: "",
        offset: 0,
      });
      const confirmedLogs = adaptWorkoutHistoryPage(confirmedHistoryData).items;
      const confirmedSavedLog =
        savedLogId !== null
          ? confirmedLogs.some((log) => log.id === savedLogId)
          : false;

      setHistoryData(confirmedHistoryData);
      setHistoryErrorMessage(null);
      setHistoryLoading(false);

      if (!confirmedSavedLog) {
        setSubmitError(
          "The workout request completed, but the refreshed log history could not confirm the saved entry.",
        );
        return;
      }

      setSubmitSuccess("Workout Saved");
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
  const historyRows = allHistoryRows.slice(0, 3);
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
        : "Log a General Workout";

  return (
    <MobileAppShell
      className="client-training-parity-shell client-training-parity-shell--add-log"
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="Log Workout"
      subtitle="Capture a workout quickly"
      onAvatarClick={() => setRecentDrawerOpen(true)}
      avatarControls="client-add-log-recent-exercises-drawer"
      avatarExpanded={recentDrawerOpen}
      avatarButtonLabel="Show recent exercises"
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
      {recentDrawerOpen ? (
        <section
          id="client-add-log-recent-exercises-drawer"
          role="dialog"
          aria-labelledby="client-add-log-recent-exercises-title"
          className="client-add-log-recent-drawer"
        >
          <div className="client-add-log-recent-drawer__header">
            <div className="mobile-section__copy">
              <h2
                id="client-add-log-recent-exercises-title"
                className="mobile-section__title"
              >
                Recent Exercises
              </h2>
              <p className="mobile-section__description">
                Quick access to your latest logged exercise rows.
              </p>
            </div>
            <button
              type="button"
              className="mobile-pill mobile-pill--purple mobile-focus-ring"
              onClick={() => setRecentDrawerOpen(false)}
            >
              Close
            </button>
          </div>

          {historyLoading ? (
            <p className="mobile-section__description">Loading recent exercises...</p>
          ) : historyErrorMessage ? (
            <p className="mobile-section__description">Unable to load recent exercises.</p>
          ) : historyRows.length === 0 ? (
            <p className="mobile-section__description">No recent exercises yet.</p>
          ) : (
            <div className="client-add-log-recent-drawer__list">
              {historyRows.map((row) => (
                <article key={row.id} className="client-add-log-recent-drawer__item">
                  <div className="client-add-log-recent-drawer__summary">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">{row.performedAtLabel}</p>
                      <h3 className="mobile-section__title">{row.exerciseName}</h3>
                      <p className="mobile-section__description">{row.typeLabel}</p>
                    </div>
                    <span className="mobile-pill mobile-pill--yellow">{row.typeLabel}</span>
                  </div>
                  <div className="mobile-training-pill-row" aria-label={`${row.exerciseName} recent summary`}>
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

      {entryFormOpen ? (
        <div
          className="client-add-log-entry-modal-backdrop"
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
            className="client-add-log-entry-modal"
          >
            <div className="client-add-log-entry-modal__header">
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

            <MobileCard as="div" variant="action" className="mobile-training-log-card client-add-log-parity-card">
              <form
                id="client-workout-entry-form"
                className="mobile-training-form"
                onSubmit={handleSubmit}
              >
                <div
                  className="client-add-log-entry-tabs"
                  role="tablist"
                  aria-label="Add log modal sections"
                >
                  <button
                    id="client-add-log-entry-tab-log"
                    type="button"
                    role="tab"
                    aria-label="Show log form"
                    aria-selected={entryModalTab === "log"}
                    aria-controls="client-add-log-entry-panel-log"
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
                    id="client-add-log-entry-tab-recent-history"
                    type="button"
                    role="tab"
                    aria-label="Show recent history"
                    aria-selected={entryModalTab === "recent-history"}
                    aria-controls="client-add-log-entry-panel-recent-history"
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

                {entryModalTab === "log" ? (
                  <div
                    id="client-add-log-entry-panel-log"
                    role="tabpanel"
                    aria-labelledby="client-add-log-entry-tab-log"
                  >
                    <div className="mobile-training-form__grid">
                      {contextMode === "rep" ? (
                        <div className="field">
                          <label htmlFor="routine-context-name">Rep</label>
                          <input
                            id="routine-context-name"
                            value={routineName}
                            onChange={(event) => setRoutineName(event.target.value)}
                            placeholder={
                              initialRoutineLabel.length > 0
                                ? initialRoutineLabel
                                : "Enter rep name"
                            }
                            readOnly={hasPrefilledRoutine}
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
                                  {exercise.name.trim() || `Exercise ${index + 1}`}
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
                    ) : (
                      <EmptyState
                        title="Start your workout log"
                        message="Add an exercise row to begin capturing this workout."
                      />
                    )}

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
                  </div>
                ) : (
                  <section
                    id="client-add-log-entry-panel-recent-history"
                    role="tabpanel"
                    aria-labelledby="client-add-log-entry-tab-recent-history"
                    className="client-add-log-recent-history-panel"
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
                )}
              </form>
            </MobileCard>
          </section>
        </div>
      ) : null}

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
                  : `Goal templates page ${activeTemplatePageNumber} of ${templatePageCount}`}
              </p>
              <p className="mobile-section__description">
                {quadPageIndex === 0
                  ? "Choose a quick logging lane, or open Goals and Aspirations to build reusable templates."
                  : "Your goal templates are saved in this browser only for this phase."}
              </p>
            </div>
            {quadPageIndex > 0 ? (
              <button
                type="button"
                className="mobile-pill mobile-pill--yellow mobile-focus-ring"
                onClick={openGoalModal}
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
                  aria-label="Open Log a General Workout form"
                >
                  <MobileStatCard
                    className="client-add-log-option-card"
                    label="General Workout"
                    value="Log a General Workout"
                    progressText="Log Your Entire Routine"
                  />
                </button>
                <button
                  type="button"
                  className="client-add-log-goals-card-button mobile-focus-ring"
                  onClick={openGoalModal}
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
            ) : (
              <div className="mobile-training-meta-grid">
                {visibleTemplateTiles.map((goalTemplate, index) =>
                  goalTemplate ? (
                    <MobileStatCard
                      key={goalTemplate.id}
                      className={[
                        "client-add-log-option-card",
                        "client-add-log-template-card",
                        `client-add-log-template-card--${goalTemplate.theme}`,
                      ].join(" ")}
                      label={goalTemplate.label}
                      value={goalTemplate.value}
                      progressText={goalTemplate.progressText}
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
