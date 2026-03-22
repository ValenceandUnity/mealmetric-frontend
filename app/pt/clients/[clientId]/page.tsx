"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { RecordCard } from "@/components/cards/RecordCard";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { WorkoutHistoryList } from "@/components/training/WorkoutHistoryList";
import { adaptWorkoutHistory } from "@/lib/adapters/workout-history";
import { getArray, isObject, pickOptionalText } from "@/lib/adapters/common";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type JsonApiResponse = ApiResponse<JsonValue>;

function replaceWorkoutLogInResponse(current: JsonValue | null, updatedLog: JsonValue): JsonValue | null {
  if (isObject(current) && Array.isArray(current.items) && isObject(updatedLog)) {
    return {
      ...current,
      items: current.items.map((item) => (isObject(item) && item.id === updatedLog.id ? updatedLog : item)),
    };
  }

  if (Array.isArray(current) && isObject(updatedLog)) {
    return current.map((item) => (isObject(item) && item.id === updatedLog.id ? updatedLog : item));
  }

  return current;
}

export default function PTClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = typeof params?.clientId === "string" ? params.clientId : "";

  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [clientDetailData, setClientDetailData] = useState<JsonValue | null>(null);
  const [workoutLogsData, setWorkoutLogsData] = useState<JsonValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function handleSavePtNote(workoutLogId: string, ptNotes: string | null) {
    const response = await fetch(`/api/pt/workout-logs/${workoutLogId}/pt-notes`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pt_notes: ptNotes }),
    });
    const payload = (await response.json()) as JsonApiResponse;

    if (!payload.ok) {
      throw new Error(payload.error.message);
    }

    setWorkoutLogsData((current) => replaceWorkoutLogInResponse(current, payload.data));
  }

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt" || !clientId) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [detailResponse, workoutLogsResponse] = await Promise.all([
          fetch(`/api/pt/clients/${clientId}`, { cache: "no-store" }),
          fetch(`/api/pt/clients/${clientId}/workout-logs`, { cache: "no-store" }),
        ]);
        const [detailPayload, workoutLogsPayload] = (await Promise.all([
          detailResponse.json(),
          workoutLogsResponse.json(),
        ])) as [JsonApiResponse, JsonApiResponse];

        if (!active) {
          return;
        }

        if (!detailPayload.ok) {
          setErrorMessage(detailPayload.error.message);
          setClientDetailData(null);
          setWorkoutLogsData(null);
          return;
        }

        if (!workoutLogsPayload.ok) {
          setErrorMessage(workoutLogsPayload.error.message);
          setClientDetailData(null);
          setWorkoutLogsData(null);
          return;
        }

        setClientDetailData(detailPayload.data);
        setWorkoutLogsData(workoutLogsPayload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load client detail.");
          setClientDetailData(null);
          setWorkoutLogsData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [clientId, status, user]);

  const detail = isObject(clientDetailData) ? clientDetailData : null;
  const client = detail && isObject(detail.client) ? detail.client : null;
  const currentAssignments = detail ? getArray(detail.current_assignments) : [];
  const workoutLogs = useMemo(() => adaptWorkoutHistory(workoutLogsData), [workoutLogsData]);
  const clientName = pickOptionalText(client, ["email"]) ?? `Client ${clientId}`;
  const clientSummary = `${currentAssignments.length} current assignment${currentAssignments.length === 1 ? "" : "s"}`;
  const metadata = [
    { label: "Client ID", value: clientId },
    ...(client ? [{ label: "Email", value: pickOptionalText(client, ["email"]) ?? "Unavailable" }] : []),
    ...(client ? [{ label: "Role", value: pickOptionalText(client, ["role"]) ?? "Unavailable" }] : []),
    {
      label: "Assignments",
      value: `${currentAssignments.length}`,
    },
    {
      label: "Workout logs",
      value: `${workoutLogs.length}`,
    },
  ];

  if (status === "loading") {
    return <LoadingBlock title="Loading client detail" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  return (
    <PageShell
      title={clientName}
      user={user}
      navigation={
        <>
          <Link className="link-button" href="/pt/clients">
            Back to clients
          </Link>
          <Link className="link-button" href={`/pt/clients/${clientId}/metrics`}>
            Metrics
          </Link>
          <Link className="link-button" href={`/pt/clients/${clientId}/assign`}>
            Training
          </Link>
          <Link className="link-button" href={`/pt/clients/${clientId}/recommend-meal-plan`}>
            Meal plans
          </Link>
        </>
      }
    >
      {loading ? <LoadingBlock title="Loading client profile" message="Fetching PT-safe client detail and workout logs." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load client detail" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Section title="Client snapshot">
            <RecordCard
              eyebrow="Client overview"
              title={clientName}
              description={clientSummary}
              metadata={metadata}
              footer={
                <>
                  <Link className="link-button" href={`/pt/clients/${clientId}/metrics`}>
                    Review metrics
                  </Link>
                  <Link className="link-button" href={`/pt/clients/${clientId}/assign`}>
                    Assign training
                  </Link>
                  <Link className="link-button" href={`/pt/clients/${clientId}/recommend-meal-plan`}>
                    Recommend meal plan
                  </Link>
                </>
              }
            />
          </Section>

          <Section title="Next actions">
            <div className="stacked-list">
              <RecordCard
                eyebrow="Metrics"
                title="Track progress"
                description="Review the client metrics slice in a dedicated summary view."
                metadata={[{ label: "Route", value: `/pt/clients/${clientId}/metrics` }]}
                footer={
                  <Link className="link-button link-button--accent" href={`/pt/clients/${clientId}/metrics`}>
                    Open metrics
                  </Link>
                }
              />
              <RecordCard
                eyebrow="Training"
                title="Manage assignments"
                description="Create new assignments and review the client's current training workload."
                metadata={[{ label: "Route", value: `/pt/clients/${clientId}/assign` }]}
                footer={
                  <Link className="link-button" href={`/pt/clients/${clientId}/assign`}>
                    Open assignment flow
                  </Link>
                }
              />
              <RecordCard
                eyebrow="Meal plans"
                title="Guide nutrition planning"
                description="Recommend an existing meal plan with rationale and timing through the PT BFF workflow."
                metadata={[{ label: "Route", value: `/pt/clients/${clientId}/recommend-meal-plan` }]}
                footer={
                  <Link className="link-button" href={`/pt/clients/${clientId}/recommend-meal-plan`}>
                    Open recommendation flow
                  </Link>
                }
              />
            </div>
          </Section>

          <Section title="Workout logs">
            {workoutLogs.length === 0 ? (
              <EmptyState
                title="No workout logs yet"
                message="Saved workout logs will appear here once this linked client records workouts through the current logging flow."
              />
            ) : (
              <WorkoutHistoryList
                logs={workoutLogs}
                ptNoteEditor={{
                  enabled: true,
                  onSave: handleSavePtNote,
                }}
              />
            )}
          </Section>

          {!detail ? (
            <Section title="Fallback detail">
              <EmptyState
                title="Client detail unavailable"
                message="The PT detail route did not return a display-ready payload for this client."
              />
            </Section>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
