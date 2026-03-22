"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { WorkoutLogForm, type WorkoutLogFormState } from "@/components/training/WorkoutLogForm";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { adaptAssignmentDetail } from "@/lib/adapters/training";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type AssignmentDetailResponse = ApiResponse<JsonValue>;
type WorkoutLogResponse = ApiResponse<JsonValue>;

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
  const assignmentId = typeof params?.assignmentId === "string" ? params.assignmentId : "";

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
    return <LoadingBlock title="Loading assignment detail" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client training routes require an authenticated client session." />;
  }

  const view = adaptAssignmentDetail(detailData);

  return (
    <PageShell
      title={view.summary.title}
      user={user}
      navigation={<Link className="link-button" href="/client/training">Back to training hub</Link>}
    >
      {detailLoading ? <LoadingBlock title="Loading assignment" message={`Fetching assignment detail for ${assignmentId}.`} /> : null}
      {detailError ? <ErrorBlock title="Unable to load assignment detail" message={detailError} /> : null}

      {!detailLoading && !detailError ? (
        <>
          <Section title="Assignment summary">
            <div className="meta-list">
              <span><strong>Status:</strong> {view.summary.status ?? "Unavailable"}</span>
              <span><strong>Package:</strong> {view.summary.packageId ?? "Unavailable"}</span>
              <span><strong>Window:</strong> {view.summary.schedule}</span>
              <span><strong>Checklist:</strong> {view.summary.checklistCount}</span>
            </div>
            <p className="section__copy">{view.summary.description}</p>
          </Section>

          <Section title="Checklist">
            {view.checklist.length > 0 ? (
              <ul className="checklist">
                {view.checklist.map((item) => (
                  <li key={item}>
                    <span className="checklist__dot" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Checklist unavailable" message="The assignment detail payload did not expose checklist entries." />
            )}
          </Section>

          <Section title="Workout log">
            <p className="section__copy">This submits only to /api/client/training/workout-logs.</p>
            <WorkoutLogForm
              formState={formState}
              onChange={(key, value) => setFormState((current) => ({ ...current, [key]: value }))}
              onSubmit={handleSubmit}
              loading={submitLoading}
            />
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
          </Section>

          {detailData && view.checklist.length === 0 ? (
            <Section title="Debug fallback">
              <DebugPreview value={detailData} label="Assignment payload fallback" />
            </Section>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
