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

function hasInvalidIntegerValue(value: string): boolean {
  return !isBlank(value) && normalizeOptionalInteger(value) === undefined;
}

function normalizeExerciseEntries(
  exercises: ExerciseInputRowState[],
): WorkoutLogExerciseEntryInput[] {
  return exercises.flatMap((exercise, index) => {
    const exerciseName = normalizeOptionalText(exercise.name);
    const sets = normalizeOptionalInteger(exercise.sets);
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
  const [historyData, setHistoryData] = useState<JsonValue | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);

  const hasPrefilledRoutine = initialRoutineName.length > 0;
  const hasValidAnchor = initialAssignmentId.length > 0;
  const hasInvalidExerciseIntegers = exercises.some(
    (exercise) =>
      hasInvalidIntegerValue(exercise.sets) ||
      hasInvalidIntegerValue(exercise.reps),
  );
  const blockingMessage = hasInvalidExerciseIntegers
    ? "Sets and reps must be non-negative whole numbers before saving."
    : null;

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blockingMessage) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const exerciseEntries = normalizeExerciseEntries(exercises);
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
      setExercises([createExerciseRow()]);
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
    setExercises((current) => [...current, createExerciseRow()]);
  }

  function handleRemoveExercise(id: string) {
    setExercises((current) => current.filter((exercise) => exercise.id !== id));
  }

  const historyPage = adaptWorkoutHistoryPage(historyData);
  const historyRows = flattenExerciseEntries(historyPage.items).slice(0, 3);
  const addEntryLabel = contextMode === "set" ? "Add Rep" : "Add Exercise";
  const contextCaption =
    "For one offs, select Rep. For logging consecutive Reps, select Set. For logging an entire routine with multiple sets, select General Workout";

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

      <MobileSection
        className="client-add-log-parity-hero"
        title="Log Your Reps"
        variant="accent"
      >
        <div className="mobile-training-meta-grid">
          <MobileStatCard
            className="client-add-log-option-card"
            label="Rep"
            value="Log A Rep"
            progressText="Log Singular Reps here"
          />
          <MobileStatCard
            className="client-add-log-option-card"
            label="Set"
            value="Log A Set"
            progressText="Log multiple Reps"
          />
          <MobileStatCard
            className="client-add-log-option-card"
            label="General Workout"
            value="Log a General Workout"
            progressText="Log Your Entire Routine"
          />
          <MobileStatCard
            className="client-add-log-option-card client-add-log-goals-card"
            label="Goals"
            value="Goals and Aspirations"
            progressText="Establish and track your goals and progress"
          />
        </div>
      </MobileSection>

      <MobileSection
        className="client-add-log-parity-section"
        eyebrow="Entry form"
        title="Log Your Reps"
        description={contextCaption}
      >
        <MobileCard as="div" variant="action" className="mobile-training-log-card client-add-log-parity-card">
          <form
            id="client-workout-entry-form"
            className="mobile-training-form"
            onSubmit={handleSubmit}
          >
            <div className="client-add-log-parity-context">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Routine context</p>
                <h3 className="mobile-section__title">
                  {initialRoutineLabel || routineName || "Workout entry"}
                </h3>
                <p className="mobile-section__description">
                  Last weight: unavailable
                </p>
                <p className="mobile-section__description">
                  Last timing: unavailable
                </p>
              </div>
            </div>
            <div className="mobile-training-pill-row" role="radiogroup" aria-label="Workout type">
              {(["rep", "set", "general"] as const).map((mode) => {
                const active = contextMode === mode;
                const label =
                  mode === "general"
                    ? "General Workout"
                    : mode === "set"
                      ? "Set"
                      : "Rep";

                return (
                  <button
                    key={mode}
                    type="button"
                    className={[
                      "mobile-pill",
                      active ? "mobile-pill--yellow" : "mobile-pill--purple",
                      "mobile-focus-ring",
                    ].join(" ")}
                    onClick={() => setContextMode(mode)}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

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

            {exercises.length > 0 ? (
              <div className="mobile-training-exercise-grid">
                {exercises.map((exercise, index) => (
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
                        <p className="mobile-section__description">Rep-row styling preserves the current add-log payload mapping.</p>
                      </div>
                      <button
                        type="button"
                        className="button--danger"
                        onClick={() => handleRemoveExercise(exercise.id)}
                        disabled={submitting || exercises.length === 1}
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
              <button
                type="button"
                className="mobile-pill mobile-pill--purple mobile-focus-ring"
                onClick={handleAddExercise}
                disabled={submitting}
              >
                {addEntryLabel}
              </button>
              <button
                type="submit"
                className="mobile-training-button mobile-training-button--primary mobile-focus-ring"
                disabled={submitting || blockingMessage !== null}
              >
                {submitting ? "Saving..." : "Save Log Entry"}
              </button>
            </div>
          </form>
        </MobileCard>
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
