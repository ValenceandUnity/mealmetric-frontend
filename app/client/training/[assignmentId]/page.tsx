"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { JsonPreview } from "@/components/JsonPreview";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type AssignmentDetailResponse = ApiResponse<JsonValue>;
type WorkoutLogResponse = ApiResponse<JsonValue>;

type WorkoutLogFormState = {
  assignmentId: string;
  routineId: string;
  performedAt: string;
  durationMinutes: string;
  completionStatus: string;
  clientNotes: string;
};

function createInitialFormState(assignmentId: string): WorkoutLogFormState {
  return {
    assignmentId,
    routineId: "",
    performedAt: new Date().toISOString(),
    durationMinutes: "30",
    completionStatus: "completed",
    clientNotes: "",
  };
}

export default function AssignmentDetailPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = useMemo(() => {
    const raw = params?.assignmentId;
    return typeof raw === "string" ? raw : "";
  }, [params]);

  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [detailData, setDetailData] = useState<JsonValue | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  const [formState, setFormState] = useState<WorkoutLogFormState>(createInitialFormState(assignmentId));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    setFormState(createInitialFormState(assignmentId));
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
          setDetailError(payload.error.message);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch("/api/client/training/workout-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignment_id: formState.assignmentId,
          routine_id: formState.routineId || undefined,
          performed_at: formState.performedAt,
          duration_minutes: Number(formState.durationMinutes),
          completion_status: formState.completionStatus,
          client_notes: formState.clientNotes || undefined,
        }),
      });

      const payload = (await response.json()) as WorkoutLogResponse;

      if (!payload.ok) {
        setSubmitError(payload.error.message);
        return;
      }

      setSubmitSuccess("Workout log submitted through the BFF.");
      setFormState((current) => ({
        ...current,
        routineId: "",
        clientNotes: "",
      }));
    } catch {
      setSubmitError("Unable to submit workout log.");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <section>
        <h2>Loading assignment detail</h2>
        <p>Validating your client session.</p>
      </section>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <section>
        <h2>Redirecting</h2>
        <p>Client training routes require an authenticated client session.</p>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section>
        <h2 style={{ marginTop: 0 }}>Assignment Detail</h2>
        <p>
          Assignment id: <code>{assignmentId || "missing"}</code>
        </p>
        <nav>
          <Link href="/client/training">Back to Training Hub</Link>
        </nav>
      </section>

      {detailLoading ? (
        <section>
          <h3>Loading assignment</h3>
          <p>Fetching assignment detail from <code>/api/client/training/assignments/{assignmentId}</code>.</p>
        </section>
      ) : null}

      {detailError ? (
        <section>
          <h3>Unable to load assignment detail</h3>
          <p style={{ color: "#fca5a5" }}>{detailError}</p>
        </section>
      ) : null}

      {detailData ? (
        <>
          <section>
            <h3 style={{ marginTop: 0 }}>Assignment Summary</h3>
            <JsonPreview value={detailData} />
          </section>

          <section>
            <h3 style={{ marginTop: 0 }}>Checklist / Structure Preview</h3>
            <JsonPreview value={detailData} />
          </section>
        </>
      ) : null}

      <section>
        <h3 style={{ marginTop: 0 }}>Submit Workout Log</h3>
        <p>This posts only to <code>/api/client/training/workout-logs</code>.</p>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="assignmentId">Assignment Id</label>
            <input
              id="assignmentId"
              value={formState.assignmentId}
              onChange={(event) =>
                setFormState((current) => ({ ...current, assignmentId: event.target.value }))
              }
            />
          </div>
          <div>
            <label htmlFor="routineId">Routine Id</label>
            <input
              id="routineId"
              value={formState.routineId}
              onChange={(event) =>
                setFormState((current) => ({ ...current, routineId: event.target.value }))
              }
            />
          </div>
          <div>
            <label htmlFor="performedAt">Performed At</label>
            <input
              id="performedAt"
              value={formState.performedAt}
              onChange={(event) =>
                setFormState((current) => ({ ...current, performedAt: event.target.value }))
              }
            />
          </div>
          <div>
            <label htmlFor="durationMinutes">Duration Minutes</label>
            <input
              id="durationMinutes"
              type="number"
              min="0"
              value={formState.durationMinutes}
              onChange={(event) =>
                setFormState((current) => ({ ...current, durationMinutes: event.target.value }))
              }
            />
          </div>
          <div>
            <label htmlFor="completionStatus">Completion Status</label>
            <input
              id="completionStatus"
              value={formState.completionStatus}
              onChange={(event) =>
                setFormState((current) => ({ ...current, completionStatus: event.target.value }))
              }
            />
          </div>
          <div>
            <label htmlFor="clientNotes">Client Notes</label>
            <textarea
              id="clientNotes"
              rows={4}
              value={formState.clientNotes}
              onChange={(event) =>
                setFormState((current) => ({ ...current, clientNotes: event.target.value }))
              }
            />
          </div>
          <button type="submit" disabled={submitLoading}>
            {submitLoading ? "Submitting..." : "Submit Workout Log"}
          </button>
        </form>

        {submitSuccess ? <p style={{ color: "#86efac" }}>{submitSuccess}</p> : null}
        {submitError ? <p style={{ color: "#fca5a5" }}>{submitError}</p> : null}
      </section>
    </div>
  );
}
