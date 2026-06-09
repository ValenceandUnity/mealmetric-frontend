"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { adaptAssignmentDetail } from "@/lib/adapters/training";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import type { CreateWorkoutLogInput, WorkoutLogExerciseEntryInput } from "@/lib/types/training";
import { adaptClientTrainingView } from "@/lib/view-models/client-training";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type AssignmentDetailResponse = ApiResponse<JsonValue>;
type WorkoutLogResponse = ApiResponse<JsonValue>;

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type TrainingStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

type LogYourRepsFormState = {
  routineId: string;
  performedAt: string;
  durationMinutes: string;
  completionStatus: string;
  clientNotes: string;
  exerciseName: string;
  sets: string;
  reps: string;
  weight: string;
  durationSeconds: string;
  entryNotes: string;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function TrainingStateCard({ title, message, action }: TrainingStateCardProps) {
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

function createInitialFormState(): LogYourRepsFormState {
  return {
    routineId: "",
    performedAt: new Date().toISOString().slice(0, 16),
    durationMinutes: "",
    completionStatus: "completed",
    clientNotes: "",
    exerciseName: "",
    sets: "",
    reps: "",
    weight: "",
    durationSeconds: "",
    entryNotes: "",
  };
}

function normalizeOptionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
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
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function normalizeOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function normalizePerformedAt(value: string): string | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildExerciseEntries(formState: LogYourRepsFormState): WorkoutLogExerciseEntryInput[] | undefined {
  const exerciseName = normalizeOptionalText(formState.exerciseName);
  const sets = normalizeOptionalInteger(formState.sets);
  const reps = normalizeOptionalInteger(formState.reps);
  const weight = normalizeOptionalNumber(formState.weight);
  const durationSeconds = normalizeOptionalInteger(formState.durationSeconds);
  const notes = normalizeOptionalText(formState.entryNotes);

  const hasMeaningfulExerciseContent =
    exerciseName !== undefined ||
    sets !== undefined ||
    reps !== undefined ||
    weight !== undefined ||
    durationSeconds !== undefined ||
    notes !== undefined;

  if (!hasMeaningfulExerciseContent) {
    return undefined;
  }

  return [{
    exercise_name: exerciseName,
    sets,
    reps,
    weight,
    duration_seconds: durationSeconds,
    notes,
    position: 0,
  }];
}

function parseNumericFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  return null;
}

function collectEstimatedMinutes(value: JsonValue | null | undefined): number | null {
  if (Array.isArray(value)) {
    let total = 0;
    let found = false;

    for (const entry of value) {
      const candidate = collectEstimatedMinutes(entry);
      if (candidate !== null) {
        total += candidate;
        found = true;
      }
    }

    return found ? total : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const directMinutes =
    parseNumericFromUnknown(value.estimated_minutes) ??
    parseNumericFromUnknown(value.duration_minutes);
  if (directMinutes !== null) {
    return directMinutes;
  }

  const directSeconds = parseNumericFromUnknown(value.duration_seconds);
  if (directSeconds !== null) {
    return Math.round(directSeconds / 60);
  }

  for (const key of ["routines", "workouts", "sessions", "exercises", "items"]) {
    const candidate = collectEstimatedMinutes(value[key]);
    if (candidate !== null) {
      return candidate;
    }
  }

  return null;
}

function getEstimatedMinutesLabel(detail: JsonValue | null): string {
  const estimatedMinutes = collectEstimatedMinutes(detail);
  return estimatedMinutes !== null ? `${estimatedMinutes} min` : "Estimated minutes unavailable";
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function AssignmentDetailPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = typeof params?.assignmentId === "string" ? params.assignmentId : "";

  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [detailData, setDetailData] = useState<JsonValue | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [formState, setFormState] = useState<LogYourRepsFormState>(createInitialFormState());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    setFormState(createInitialFormState());
  }, [assignmentId]);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client" || !assignmentId) {
      return;
    }

    let active = true;

    async function load() {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const response = await fetch(`/api/client/training/assignments/${assignmentId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as AssignmentDetailResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setDetailError(payload.error.message ?? "Unable to load assignment detail.");
          setDetailData(null);
          return;
        }

        setDetailData(payload.data);
      } catch {
        if (active) {
          setDetailError("Unable to load assignment detail.");
          setDetailData(null);
        }
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [assignmentId, status, user]);

  const detailView = adaptAssignmentDetail(detailData);
  const mobileView = adaptClientTrainingView({
    assignments: null,
    assignmentDetail: detailData,
  });
  const estimatedMinutesLabel = getEstimatedMinutesLabel(detailData);
  const showLoadingState = detailLoading && !detailData && !detailError;

  useEffect(() => {
    if (formState.routineId || mobileView.routineDetails.length === 0) {
      return;
    }

    setFormState((current) => ({
      ...current,
      routineId: mobileView.routineDetails[0]?.id ?? "",
    }));
  }, [formState.routineId, mobileView.routineDetails]);

  if (status === "loading") {
    return <LoadingBlock title="Loading assignment detail" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client training routes require an authenticated client session." />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const performedAt = normalizePerformedAt(formState.performedAt);
    if (!performedAt) {
      setSubmitLoading(false);
      setSubmitError("Performed at must be a valid date and time.");
      return;
    }

    if (
      (formState.sets.trim().length > 0 && normalizeOptionalInteger(formState.sets) === undefined) ||
      (formState.reps.trim().length > 0 && normalizeOptionalInteger(formState.reps) === undefined) ||
      (formState.durationSeconds.trim().length > 0 && normalizeOptionalInteger(formState.durationSeconds) === undefined) ||
      (formState.weight.trim().length > 0 && normalizeOptionalNumber(formState.weight) === undefined)
    ) {
      setSubmitLoading(false);
      setSubmitError("Sets, reps, weight, and duration must be non-negative numbers.");
      return;
    }

    try {
      const requestBody: CreateWorkoutLogInput = {
        assignment_id: assignmentId || undefined,
        routine_id: normalizeOptionalText(formState.routineId),
        performed_at: performedAt,
        duration_minutes: normalizeOptionalInteger(formState.durationMinutes),
        completion_status: normalizeOptionalText(formState.completionStatus) ?? "completed",
        client_notes: normalizeOptionalText(formState.clientNotes),
        exercise_entries: buildExerciseEntries(formState),
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
        setSubmitError(payload.error.message ?? "Unable to submit workout log.");
        return;
      }

      setSubmitSuccess("Workout log submitted through the protected client BFF route.");
      setFormState((current) => ({
        ...createInitialFormState(),
        routineId: current.routineId,
        completionStatus: current.completionStatus,
      }));
    } catch {
      setSubmitError("Unable to submit workout log.");
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <MobileAppShell
      className="client-training-parity-shell client-training-parity-shell--detail"
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title={detailView.summary.title || "Training assignment"}
      subtitle="Routine detail, checklist, and rep logging through the current protected client routes."
      notificationSlot={<ActionPill href="/client/training" tone="purple">Training hub</ActionPill>}
      topHubAction={<a href="#log-your-reps" className="mobile-pill mobile-pill--yellow mobile-focus-ring">Log your reps</a>}
      activePath="/client/training"
      statusStrip={(
        <>
          <span className="mobile-pill mobile-pill--purple">{estimatedMinutesLabel}</span>
          <span className="mobile-pill">{detailView.summary.checklistCount}</span>
        </>
      )}
    >
      {detailError ? (
        <MobileSection
          eyebrow="Assignment sync"
          title="Assignment unavailable"
          description="This page stays on the existing client assignment detail BFF route and does not fall back to direct backend calls."
        >
          <TrainingStateCard
            title="Unable to load assignment detail"
            message={detailError}
            action={<ActionPill href="/client/training">Back to training</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading routine detail"
          description="Fetching the selected assignment through the current protected client training detail route."
        >
          <TrainingStateCard
            title="Refreshing assignment detail"
            message={`Loading the selected training assignment for ${assignmentId}.`}
          />
        </MobileSection>
      ) : !assignmentId ? (
        <MobileSection eyebrow="Assignment" title="Assignment unavailable" description="A valid assignment route parameter is required.">
          <TrainingStateCard
            title="Missing assignment id"
            message="The training detail screen cannot load safely without an assignment identifier."
            action={<ActionPill href="/client/training">Back to training</ActionPill>}
          />
        </MobileSection>
      ) : (
        <>
          <MobileSection
            className="client-training-detail-hero"
            eyebrow="Assignment"
            title={detailView.summary.title || "Training assignment"}
            description={detailView.summary.description}
            action={<ActionPill href="/client/training" tone="purple">Back to training</ActionPill>}
            variant="accent"
          >
            <div className="client-training-detail-hero__visual" aria-hidden="true">
              <div className="client-training-detail-hero__overlay">
                <span className="mobile-pill mobile-pill--yellow">Log Your Reps</span>
                <span className="mobile-pill">{detailView.summary.status ?? "Assignment"}</span>
              </div>
            </div>
            <div className="mobile-training-meta-grid">
              <MobileCard as="div" variant="soft" padding="compact" className="mobile-training-meta-card">
                <p className="mobile-section__eyebrow">Status</p>
                <p className="mobile-training-meta-card__value">{detailView.summary.status ?? "Unavailable"}</p>
              </MobileCard>
              <MobileCard as="div" variant="soft" padding="compact" className="mobile-training-meta-card">
                <p className="mobile-section__eyebrow">Duration</p>
                <p className="mobile-training-meta-card__value">{detailView.summary.schedule}</p>
              </MobileCard>
              <MobileCard as="div" variant="soft" padding="compact" className="mobile-training-meta-card">
                <p className="mobile-section__eyebrow">Routines</p>
                <p className="mobile-training-meta-card__value">{detailView.summary.routineCount ?? `${mobileView.routineDetails.length} routines`}</p>
              </MobileCard>
              <MobileCard as="div" variant="soft" padding="compact" className="mobile-training-meta-card">
                <p className="mobile-section__eyebrow">Checklist</p>
                <p className="mobile-training-meta-card__value">{detailView.summary.checklistCount}</p>
              </MobileCard>
              <MobileCard as="div" variant="soft" padding="compact" className="mobile-training-meta-card">
                <p className="mobile-section__eyebrow">Estimated minutes</p>
                <p className="mobile-training-meta-card__value">{estimatedMinutesLabel}</p>
              </MobileCard>
              <MobileCard as="div" variant="soft" padding="compact" className="mobile-training-meta-card">
                <p className="mobile-section__eyebrow">Package</p>
                <p className="mobile-training-meta-card__value">{detailView.summary.packageId ?? "Unavailable"}</p>
              </MobileCard>
            </div>
          </MobileSection>

          <MobileSection
            className="client-training-detail-section client-training-detail-section--checklist"
            eyebrow="Checklist"
            title="Workout Checklist For the Week"
            description="Only explicit checklist items from the assignment detail response are shown here."
          >
            {mobileView.checklistItems.length > 0 ? (
              <ul className="mobile-training-checklist-list" aria-label="Assignment checklist">
                {mobileView.checklistItems.map((item) => (
                  <li key={item.id} className="mobile-training-checklist-list__item">
                    <span className={`mobile-pill ${item.complete ? "mobile-pill--yellow" : "mobile-pill--purple"}`}>
                      {item.complete ? "Done" : "Open"}
                    </span>
                    <div className="mobile-section__copy">
                      <p className="mobile-training-checklist-item__label">{item.label}</p>
                      {item.note ? <p className="mobile-section__description">{item.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <TrainingStateCard
                title="Checklist unavailable"
                message="The current assignment detail payload did not expose explicit checklist items."
              />
            )}
          </MobileSection>

          <MobileSection
            className="client-training-detail-section client-training-detail-section--routines"
            eyebrow="Routines"
            title="Routine detail"
            description="Expand a routine to view the exercise detail that is already returned by the existing assignment route."
            action={<ActionPill href="/client/training/history" tone="purple">Workout history</ActionPill>}
          >
            {mobileView.routineDetails.length > 0 ? (
              mobileView.routineDetails.map((routine, index) => (
                <details
                  key={routine.id ?? `${routine.title}-${index}`}
                  className="mobile-training-accordion"
                  open={index === 0}
                >
                  <summary className="mobile-training-accordion__summary">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">{routine.completionLabel ?? `Routine ${index + 1}`}</p>
                      <h3 className="mobile-section__title">{routine.title}</h3>
                      <p className="mobile-section__description">{routine.subtitle}</p>
                    </div>
                    <span className="mobile-pill mobile-pill--yellow">
                      {countLabel(routine.logEntries.length, "exercise")}
                    </span>
                  </summary>

                  <div className="mobile-training-accordion__body">
                    <div className="client-training-detail-routine-card" aria-hidden="true">
                      <div className="client-training-detail-routine-card__copy">
                        <p className="client-training-detail-routine-card__eyebrow">Routine focus</p>
                        <p className="client-training-detail-routine-card__title">{routine.title}</p>
                        <p className="client-training-detail-routine-card__subtitle">{routine.subtitle}</p>
                      </div>
                    </div>
                    {routine.logEntries.length > 0 ? (
                      <div className="mobile-training-exercise-grid">
                        {routine.logEntries.map((entry) => (
                          <MobileCard key={entry.id} as="article" variant="soft" padding="compact" className="mobile-training-exercise-card client-training-detail-exercise-card">
                            <div className="mobile-section__copy">
                              <p className="mobile-section__eyebrow">Exercise detail</p>
                              <h4 className="mobile-training-exercise-card__title">{entry.label}</h4>
                              <p className="mobile-section__description">Last weight: unavailable</p>
                              <p className="mobile-section__description">Last timing: unavailable</p>
                            </div>
                            <div className="mobile-training-pill-row">
                              <span className="mobile-pill">{entry.setsLabel}</span>
                              <span className="mobile-pill">{entry.repsLabel}</span>
                              <span className="mobile-pill">{entry.weightLabel}</span>
                              <span className="mobile-pill">{entry.timingLabel}</span>
                            </div>
                            {entry.notes ? <p className="mobile-section__description">{entry.notes}</p> : null}
                          </MobileCard>
                        ))}
                      </div>
                    ) : (
                      <TrainingStateCard
                        title="Exercise detail is unavailable"
                        message="This routine is present, but the current assignment payload does not include exercise-level instructions."
                      />
                    )}
                  </div>
                </details>
              ))
            ) : (
              <TrainingStateCard
                title="Routine detail unavailable"
                message="The current assignment detail response did not expose routine-ready entries for this screen."
              />
            )}
          </MobileSection>

          <section id="log-your-reps">
            <MobileSection
              eyebrow="Workout log"
              title="Log your reps"
              description="This form submits only to the existing /api/client/training/workout-logs BFF route."
            >
              <MobileCard as="div" variant="action" className="mobile-training-log-card client-training-detail-log-card">
                <form className="mobile-training-form" onSubmit={handleSubmit}>
                  <div className="client-training-detail-log-card__intro">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">Log Your Reps</p>
                      <h3 className="mobile-section__title">Save a routine entry</h3>
                      <p className="mobile-section__description">
                        Last weight and timing stay neutral unless that data is already available in the current assignment payload.
                      </p>
                    </div>
                  </div>
                  <div className="mobile-training-form__grid">
                    <div className="field">
                      <label htmlFor="routineId">Routine</label>
                      <select
                        id="routineId"
                        value={formState.routineId}
                        onChange={(event) => setFormState((current) => ({ ...current, routineId: event.target.value }))}
                        disabled={submitLoading || mobileView.routineDetails.length === 0}
                      >
                        <option value="">No routine selected</option>
                        {mobileView.routineDetails.map((routine) => (
                          <option key={routine.id ?? routine.title} value={routine.id ?? ""}>
                            {routine.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor="performedAt">Performed at</label>
                      <input
                        id="performedAt"
                        type="datetime-local"
                        value={formState.performedAt}
                        onChange={(event) => setFormState((current) => ({ ...current, performedAt: event.target.value }))}
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="durationMinutes">Duration minutes</label>
                      <input
                        id="durationMinutes"
                        type="number"
                        min="0"
                        value={formState.durationMinutes}
                        onChange={(event) => setFormState((current) => ({ ...current, durationMinutes: event.target.value }))}
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="completionStatus">Completion status</label>
                      <input
                        id="completionStatus"
                        value={formState.completionStatus}
                        onChange={(event) => setFormState((current) => ({ ...current, completionStatus: event.target.value }))}
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="exerciseName">Exercise name</label>
                      <input
                        id="exerciseName"
                        value={formState.exerciseName}
                        onChange={(event) => setFormState((current) => ({ ...current, exerciseName: event.target.value }))}
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="sets">Sets</label>
                      <input
                        id="sets"
                        type="number"
                        min="0"
                        value={formState.sets}
                        onChange={(event) => setFormState((current) => ({ ...current, sets: event.target.value }))}
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="reps">Reps</label>
                      <input
                        id="reps"
                        type="number"
                        min="0"
                        value={formState.reps}
                        onChange={(event) => setFormState((current) => ({ ...current, reps: event.target.value }))}
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="weight">Weight</label>
                      <input
                        id="weight"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formState.weight}
                        onChange={(event) => setFormState((current) => ({ ...current, weight: event.target.value }))}
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="durationSeconds">Exercise duration seconds</label>
                      <input
                        id="durationSeconds"
                        type="number"
                        min="0"
                        value={formState.durationSeconds}
                        onChange={(event) => setFormState((current) => ({ ...current, durationSeconds: event.target.value }))}
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="clientNotes">Client notes</label>
                      <textarea
                        id="clientNotes"
                        rows={4}
                        value={formState.clientNotes}
                        onChange={(event) => setFormState((current) => ({ ...current, clientNotes: event.target.value }))}
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="entryNotes">Exercise notes</label>
                      <textarea
                        id="entryNotes"
                        rows={4}
                        value={formState.entryNotes}
                        onChange={(event) => setFormState((current) => ({ ...current, entryNotes: event.target.value }))}
                        disabled={submitLoading}
                      />
                    </div>
                  </div>

                  <p className="mobile-section__description">
                    Previous weight and timing values are unavailable unless they are already present in the current assignment payload.
                  </p>

                  <div className="mobile-training-action-row">
                    <button
                      type="submit"
                      className="mobile-training-button mobile-training-button--primary mobile-focus-ring"
                      disabled={submitLoading}
                    >
                      {submitLoading ? "Saving log entry..." : "Save Log Entry"}
                    </button>
                  </div>
                </form>

                {submitSuccess ? (
                  <FeedbackBanner
                    tone="success"
                    title="Workout log submitted"
                    message={submitSuccess}
                  />
                ) : null}

                {submitError ? (
                  <FeedbackBanner
                    tone="error"
                    title="Workout log submission failed"
                    message={submitError}
                  />
                ) : null}
              </MobileCard>
            </MobileSection>
          </section>
        </>
      )}
    </MobileAppShell>
  );
}
