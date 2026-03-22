"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ContextSelector } from "@/components/training/ContextSelector";
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
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { CreateWorkoutLogInput, WorkoutLogExerciseEntryInput } from "@/lib/types/training";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type WorkoutLogResponse = ApiResponse<JsonValue>;
type ContextMode = "routine" | "general";

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

export function AddLogPageClient() {
  const searchParams = useSearchParams();
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const initialRoutineName = searchParams.get("routineName")?.trim() ?? "";
  const initialRoutineId = searchParams.get("routineId")?.trim() ?? "";
  const initialAssignmentId = searchParams.get("assignmentId")?.trim() ?? "";
  const initialRoutineLabel = searchParams.get("routineLabel")?.trim() ?? "";

  const [contextMode, setContextMode] = useState<ContextMode>(initialRoutineName ? "routine" : "general");
  const [routineName, setRoutineName] = useState(initialRoutineName);
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 16));
  const [durationMinutes, setDurationMinutes] = useState("");
  const [exercises, setExercises] = useState<ExerciseInputRowState[]>([createExerciseRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const hasPrefilledRoutine = initialRoutineName.length > 0;
  const hasValidAnchor = initialAssignmentId.length > 0;
  const visibleRoutineLabel = useMemo(() => {
    if (contextMode !== "routine" || routineName.trim().length === 0) {
      return null;
    }

    return initialRoutineLabel.length > 0 ? `${initialRoutineLabel} - ${routineName.trim()}` : routineName.trim();
  }, [contextMode, initialRoutineLabel, routineName]);
  const hasInvalidDurationMinutes = hasInvalidIntegerValue(durationMinutes);
  const hasInvalidExerciseIntegers = exercises.some(
    (exercise) =>
      hasInvalidIntegerValue(exercise.sets) ||
      hasInvalidIntegerValue(exercise.reps),
  );
  const blockingMessage = !hasValidAnchor
    ? "Workout logs require valid training context. Open this form from a training assignment to save the workout."
    : hasInvalidDurationMinutes
      ? "Workout time must be a non-negative whole number of minutes."
      : hasInvalidExerciseIntegers
        ? "Sets and reps must be non-negative whole numbers before saving."
        : null;

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
      const normalizedDurationMinutes = normalizeOptionalInteger(durationMinutes);
      const requestBody: CreateWorkoutLogInput = {
        assignment_id: initialAssignmentId,
        routine_id: contextMode === "routine" && initialRoutineId ? initialRoutineId : undefined,
        performed_at: new Date(performedAt).toISOString(),
        duration_minutes: normalizedDurationMinutes,
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

      setSubmitSuccess("Workout saved through the protected client workout-log route.");
      setExercises([createExerciseRow()]);
      setDurationMinutes("");
    } catch {
      setSubmitError("Unable to save workout.");
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

  return (
    <PageShell
      title="Log Workout"
      user={user}
      className="app-shell--client-add-log"
      navigation={
        <Link className="link-button" href={hasValidAnchor ? `/client/training/${initialAssignmentId}` : "/client/training"}>
          Back to training
        </Link>
      }
    >
      {blockingMessage ? (
        <ErrorBlock title="Workout log blocked" message={blockingMessage} />
      ) : null}
      {submitError ? <ErrorBlock title="Unable to save workout" message={submitError} /> : null}
      {submitSuccess ? (
        <FeedbackBanner
          tone="success"
          title="Workout saved"
          message={submitSuccess}
        />
      ) : null}

      <Card className="client-add-log-hero" variant="accent" as="section">
        <PageHeader
          eyebrow="Workout log"
          title="Log Workout"
          description="Capture a workout quickly through the existing protected client logging route."
          chips={visibleRoutineLabel ? [visibleRoutineLabel] : ["No routine context"]}
        />
      </Card>

      <SectionBlock
        eyebrow="Context"
        title="Workout context"
        description="Use routine context when it exists, or log a general workout without requiring extra lookup."
      >
        <ContextSelector
          mode={contextMode}
          routineName={routineName}
          hasPrefilledRoutine={hasPrefilledRoutine}
          onModeChange={setContextMode}
          onRoutineNameChange={setRoutineName}
        />
      </SectionBlock>

      <SectionBlock
        eyebrow="Exercises"
        title="Exercise List"
        description="Add one or more exercise rows for this workout."
      >
        <form className="client-add-log-form" onSubmit={handleSubmit}>
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
            <div className="field">
              <label htmlFor="duration-minutes">Workout time (minutes)</label>
              <input
                id="duration-minutes"
                type="number"
                min="0"
                step="1"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                placeholder="45"
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
              Add Exercise
            </button>
            <button type="submit" disabled={submitting || durationMinutes.trim().length === 0 || blockingMessage !== null}>
              {submitting ? "Saving..." : "Save Workout"}
            </button>
          </ActionRow>
        </form>
      </SectionBlock>
    </PageShell>
  );
}
