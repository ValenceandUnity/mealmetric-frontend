"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { WorkoutHistoryList } from "@/components/training/WorkoutHistoryList";
import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { adaptWorkoutHistory } from "@/lib/adapters/workout-history";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type WorkoutHistoryResponse = ApiResponse<JsonValue>;

export default function ClientWorkoutHistoryPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [historyData, setHistoryData] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/client/training/workout-logs", { cache: "no-store" });
        const payload = (await response.json()) as WorkoutHistoryResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setHistoryData(null);
          return;
        }

        setHistoryData(payload.data);
      } catch {
        if (!active) {
          return;
        }

        setErrorMessage("Unable to load workout history.");
        setHistoryData(null);
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
  }, [status, user]);

  const logs = useMemo(() => adaptWorkoutHistory(historyData), [historyData]);

  if (status === "loading") {
    return <LoadingBlock title="Loading workout history" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Workout history requires an authenticated client session." />;
  }

  return (
    <PageShell
      title="Workout History"
      user={user}
      className="app-shell--client-workout-history"
      navigation={<Link className="link-button" href="/client/training">Back to training</Link>}
    >
      {loading ? <LoadingBlock title="Loading history" message="Fetching saved workout logs through the protected client route." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load workout history" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Card className="client-workout-history-hero" variant="accent" as="section">
            <PageHeader
              eyebrow="Client training"
              title="Workout History"
              description="Review saved workout logs and inspect the structured exercise rows exactly as returned by the current workout-log route."
              chips={[`${logs.length} log${logs.length === 1 ? "" : "s"}`]}
              actions={
                <ActionRow>
                  <Link className="link-button" href="/client/training">
                    Training
                  </Link>
                  <Link className="link-button" href="/client">
                    Client home
                  </Link>
                </ActionRow>
              }
            />
          </Card>

          <SectionBlock
            eyebrow="Read only"
            title="Saved workout logs"
            description="Open any log to inspect the structured exercise rows in their recorded order."
          >
            {logs.length === 0 ? (
              <EmptyState
                title="No workout logs yet"
                message="Saved workout logs will appear here after you complete a workout through the current logging flow."
              />
            ) : (
              <WorkoutHistoryList logs={logs} />
            )}
          </SectionBlock>
        </>
      ) : null}
    </PageShell>
  );
}
