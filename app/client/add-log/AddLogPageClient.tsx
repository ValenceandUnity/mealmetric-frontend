"use client";

import { useSearchParams } from "next/navigation";
import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";

import {
  ExerciseInputList,
} from "@/components/training/ExerciseInputList";
import type { ExerciseInputRowState } from "@/components/training/ExerciseInputRow";
import { PageShell } from "@/components/layout/PageShell";
import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { SectionBlock } from "@/components/ui/SectionBlock";
import {
  adaptWorkoutHistoryPage,
  type WorkoutHistoryExerciseEntryView,
  type WorkoutHistoryItemView,
} from "@/lib/adapters/workout-history";
import { getId } from "@/lib/adapters/common";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import type {
  CreateWorkoutLogInput,
  WorkoutLogExerciseEntryInput,
  WorkoutLogMode,
} from "@/lib/types/training";

type WorkoutLogResponse = ApiResponse<JsonValue>;
type ContextMode = "rep" | "set" | "general";
type WorkoutTypeFilter = "all" | WorkoutLogMode;
type WorkoutHistoryTableRow = {
  id: string;
  performedAtLabel: string;
  performedAtTimestamp: number;
  typeMode: WorkoutLogMode;
  typeLabel: string;
  exerciseName: string;
  sets: string;
  reps: string;
  weight: string;
  duration: string;
  notes: string;
};

const HISTORY_PAGE_LIMIT = 30;

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

function normalizeExerciseEntries(exercises: ExerciseInputRowState[]): WorkoutLogExerciseEntryInput[] {
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
          typeMode: log.mode,
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
    typeMode: log.mode,
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
  typeFilter,
  searchValue,
  offset,
  signal,
}: {
  typeFilter: WorkoutTypeFilter;
  searchValue: string;
  offset: number;
  signal?: AbortSignal;
}): Promise<JsonValue> {
  const params = new URLSearchParams({
    limit: String(HISTORY_PAGE_LIMIT),
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

export function AddLogPageClient() {
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

  const [contextMode, setContextMode] = useState<ContextMode>(initialRoutineName ? "rep" : "general");
  const [routineName, setRoutineName] = useState(initialRoutineName);
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 16));
  const [exercises, setExercises] = useState<ExerciseInputRowState[]>([createExerciseRow()]);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<JsonValue | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<WorkoutTypeFilter>("all");
  const [historySearchValue, setHistorySearchValue] = useState("");
  const [historyOffset, setHistoryOffset] = useState(0);

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
          typeFilter: historyTypeFilter,
          searchValue: historySearchValue,
          offset: historyOffset,
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
  }, [historyOffset, historySearchValue, historyTypeFilter, status, user]);

  if (status === "loading") {
    return <LoadingBlock title="Loading log workout" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Workout logging requires an authenticated client session." />;
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
        typeFilter: "all",
        searchValue: "",
        offset: 0,
      });
      const confirmedLogs = adaptWorkoutHistoryPage(confirmedHistoryData).items;
      const confirmedSavedLog = savedLogId !== null
        ? confirmedLogs.some((log) => log.id === savedLogId)
        : false;

      setHistoryTypeFilter("all");
      setHistorySearchValue("");
      setHistoryOffset(0);
      setHistoryData(confirmedHistoryData);
      setHistoryErrorMessage(null);
      setHistoryLoading(false);

      if (!confirmedSavedLog) {
        setSubmitError("The workout request completed, but the refreshed log history could not confirm the saved entry.");
        return;
      }

      setSubmitSuccess("Workout Saved");
      setExercises([createExerciseRow()]);
      setShowWorkoutForm(false);
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
      current.map((exercise) => (exercise.id === id ? { ...exercise, [key]: value } : exercise)),
    );
  }

  function handleAddExercise() {
    setExercises((current) => [...current, createExerciseRow()]);
  }

  function handleRemoveExercise(id: string) {
    setExercises((current) => current.filter((exercise) => exercise.id !== id));
  }

  function handleViewInlineHistory() {
    historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const contextCaption =
    "For one offs, select Rep. For logging consecutive Reps, select Set. For logging an entire routine with multiple sets, select General Workout";
  const centeredActionsStyle: CSSProperties = {
    justifyContent: "center",
  };
  const centeredToggleStyle: CSSProperties = {
    justifyContent: "center",
  };
  const sectionIconStyle: CSSProperties = {
    position: "absolute",
    top: "1.25rem",
    right: "1.25rem",
    zIndex: 1,
  };
  const tableWrapperStyle: CSSProperties = {
    overflowX: "auto",
  };
  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "760px",
  };
  const paginationStyle: CSSProperties = {
    justifyContent: "flex-end",
    marginTop: "1rem",
  };
  const emptyNoteStyle: CSSProperties = {
    marginBottom: "1rem",
  };
  const addEntryLabel = contextMode === "set" ? "Add Rep" : "Add Exercise";
  const historyPage = adaptWorkoutHistoryPage(historyData);
  const historyRows = flattenExerciseEntries(historyPage.items);

  return (
    <PageShell
      title="Log Workout"
      user={user}
      className="app-shell--client-add-log"
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

      <Card className="client-add-log-hero" variant="accent" as="section">
        <div className="page-header">
          <div className="page-header__lead">
            <p className="page-header__eyebrow">LOG A WORKOUT</p>
            <p className="page-header__description">
              Capture a workout quickly through the existing protected client logging route.
            </p>
          </div>
          {!showWorkoutForm ? (
            <div className="page-header__actions" style={centeredActionsStyle}>
              <button
                type="button"
                className="link-button link-button--accent"
                onClick={() => setShowWorkoutForm(true)}
                aria-expanded={showWorkoutForm}
                aria-controls="client-workout-entry-form"
              >
                New Entry
              </button>
            </div>
          ) : null}
        </div>
      </Card>

      {showWorkoutForm ? (
        <>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="utility-icon-link"
              onClick={() => setShowWorkoutForm(false)}
              aria-label="Close workout entry form"
              title="Close workout entry form"
              style={sectionIconStyle}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.97 6.97a.75.75 0 0 1 1.06 0L12 10.94l3.97-3.97a.75.75 0 1 1 1.06 1.06L13.06 12l3.97 3.97a.75.75 0 1 1-1.06 1.06L12 13.06l-3.97 3.97a.75.75 0 1 1-1.06-1.06L10.94 12 6.97 8.03a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
            <SectionBlock
              eyebrow="Context"
              title="Workout Type"
              description={contextCaption}
            >
              <div className="client-add-log-context">
                <div
                  className="client-add-log-context__toggle"
                  role="radiogroup"
                  aria-label="Workout type"
                  style={centeredToggleStyle}
                >
                  <button
                    type="button"
                    className={contextMode === "rep" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                    onClick={() => setContextMode("rep")}
                    aria-pressed={contextMode === "rep"}
                  >
                    Rep
                  </button>
                  <button
                    type="button"
                    className={contextMode === "set" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                    onClick={() => setContextMode("set")}
                    aria-pressed={contextMode === "set"}
                  >
                    Set
                  </button>
                  <button
                    type="button"
                    className={contextMode === "general" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                    onClick={() => setContextMode("general")}
                    aria-pressed={contextMode === "general"}
                  >
                    General Workout
                  </button>
                </div>

                {contextMode === "rep" ? (
                  <div className="field">
                    <label htmlFor="routine-context-name">Rep</label>
                    <input
                      id="routine-context-name"
                      value={routineName}
                      onChange={(event) => setRoutineName(event.target.value)}
                      placeholder={initialRoutineLabel.length > 0 ? initialRoutineLabel : "Enter rep name"}
                      readOnly={hasPrefilledRoutine}
                    />
                  </div>
                ) : null}
              </div>
            </SectionBlock>
          </div>

          <SectionBlock
            eyebrow="Exercises"
            title="Exercise List"
            description="Add one or more exercise rows for this workout."
          >
            <form id="client-workout-entry-form" className="client-add-log-form" onSubmit={handleSubmit}>
              <div className="client-add-log-form__meta">
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
                <ExerciseInputList
                  exercises={exercises}
                  onChange={handleExerciseChange}
                  onRemove={handleRemoveExercise}
                />
              ) : (
                <EmptyState
                  title="Start your workout log"
                  message="Add an exercise row to begin capturing this workout."
                />
              )}

              <ActionRow>
                <button type="button" onClick={handleAddExercise} disabled={submitting}>
                  {addEntryLabel}
                </button>
                <button type="submit" disabled={submitting || blockingMessage !== null}>
                  {submitting ? "Saving..." : "Save Workout"}
                </button>
              </ActionRow>
            </form>
          </SectionBlock>
        </>
      ) : null}

      <div style={{ position: "relative" }}>
        <button
          type="button"
          className="utility-icon-link"
          aria-label="View full workout history"
          title="View full workout history"
          style={sectionIconStyle}
          onClick={handleViewInlineHistory}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7.75 3.75A1.75 1.75 0 0 1 9.5 2h5A1.75 1.75 0 0 1 16.25 3.75V5h1A2.75 2.75 0 0 1 20 7.75v8.5A2.75 2.75 0 0 1 17.25 19h-10.5A2.75 2.75 0 0 1 4 16.25v-8.5A2.75 2.75 0 0 1 6.75 5h1V3.75Zm1.5 0V5h5V3.75a.25.25 0 0 0-.25-.25h-5a.25.25 0 0 0-.25.25ZM5.5 9.25v7a1.25 1.25 0 0 0 1.25 1.25h10.5a1.25 1.25 0 0 0 1.25-1.25v-7h-13Z" />
          </svg>
        </button>
        <SectionBlock
          title="LOG HISTORY"
          description="Review and filter saved workout entries returned by the protected client workout-log route."
        >
          <section id="client-inline-workout-history" ref={historySectionRef}>
            <div className="client-add-log-context">
              <div
                className="client-add-log-context__toggle"
                role="radiogroup"
                aria-label="Workout history type filter"
                style={centeredToggleStyle}
              >
                <button
                  type="button"
                  className={historyTypeFilter === "all" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                  onClick={() => {
                    setHistoryTypeFilter("all");
                    setHistoryOffset(0);
                  }}
                  aria-pressed={historyTypeFilter === "all"}
                >
                  All
                </button>
                <button
                  type="button"
                  className={historyTypeFilter === "rep" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                  onClick={() => {
                    setHistoryTypeFilter("rep");
                    setHistoryOffset(0);
                  }}
                  aria-pressed={historyTypeFilter === "rep"}
                >
                  Rep
                </button>
                <button
                  type="button"
                  className={historyTypeFilter === "set" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                  onClick={() => {
                    setHistoryTypeFilter("set");
                    setHistoryOffset(0);
                  }}
                  aria-pressed={historyTypeFilter === "set"}
                >
                  Set
                </button>
                <button
                  type="button"
                  className={historyTypeFilter === "general_workout" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                  onClick={() => {
                    setHistoryTypeFilter("general_workout");
                    setHistoryOffset(0);
                  }}
                  aria-pressed={historyTypeFilter === "general_workout"}
                >
                  General Workout
                </button>
              </div>

              <div className="field">
                <label htmlFor="history-search">Search</label>
                <input
                  id="history-search"
                  type="search"
                  placeholder="Search exercises, equipment, or notes"
                  value={historySearchValue}
                  onChange={(event) => {
                    setHistorySearchValue(event.target.value);
                    setHistoryOffset(0);
                  }}
                />
              </div>
            </div>

            {historyLoading ? (
              <LoadingBlock
                title="Loading history"
                message="Fetching the latest workout logs through the protected client route."
              />
            ) : historyErrorMessage ? (
              <ErrorBlock title="Unable to load workout history" message={historyErrorMessage} />
            ) : (
              <Card as="section" className="section-block">
                {historyRows.length === 0 ? (
                  <p className="section__copy" style={emptyNoteStyle}>
                    No logged workouts yet.
                  </p>
                ) : null}

                <div style={tableWrapperStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Exercise</th>
                        <th>Sets</th>
                        <th>Reps</th>
                        <th>Weight</th>
                        <th>Time / Duration</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.length > 0 ? (
                        historyRows.map((row) => (
                          <tr key={row.id}>
                            <td>{row.performedAtLabel}</td>
                            <td>{row.typeLabel}</td>
                            <td>{row.exerciseName}</td>
                            <td>{row.sets}</td>
                            <td>{row.reps}</td>
                            <td>{row.weight}</td>
                            <td>{row.duration}</td>
                            <td>{row.notes}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="action-row" style={paginationStyle}>
                  <button
                    type="button"
                    className="utility-icon-link"
                    onClick={() => {
                      if (historyPage.nextOffset !== null) {
                        setHistoryOffset(historyPage.nextOffset);
                      }
                    }}
                    disabled={!historyPage.hasMore || historyPage.nextOffset === null}
                    aria-label="Show older workout entries"
                    title="Show older workout entries"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8.97 5.97a.75.75 0 0 1 1.06 0l5.5 5.5a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 1 1-1.06-1.06L13.94 12 8.97 7.03a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                </div>
              </Card>
            )}
          </section>
        </SectionBlock>
      </div>
    </PageShell>
  );
}
