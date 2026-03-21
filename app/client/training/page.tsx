"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { AssignmentCard } from "@/components/training/AssignmentCard";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { adaptTrainingAssignments } from "@/lib/adapters/training";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type TrainingHubResponse = ApiResponse<JsonValue>;

export default function ClientTrainingHubPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [trainingData, setTrainingData] = useState<JsonValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/client/training", { cache: "no-store" });
        const payload = (await response.json()) as TrainingHubResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setTrainingData(null);
          return;
        }

        setTrainingData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load the training hub.");
          setTrainingData(null);
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
  }, [status, user]);

  if (status === "loading") {
    return <LoadingBlock title="Loading training hub" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client training routes require an authenticated client session." />;
  }

  const assignments = adaptTrainingAssignments(trainingData);

  return (
    <PageShell
      title="Training hub"
      user={user}
      navigation={<Link className="link-button" href="/client">Back to client home</Link>}
    >
      {loading ? <LoadingBlock title="Loading assignments" message="Fetching your current training assignments." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load assignments" message={errorMessage} /> : null}

      <Section title="Assignments">
        {assignments.length > 0 ? (
          <div className="stacked-list">
            {assignments.map((assignment) => (
              <AssignmentCard key={assignment.id ?? assignment.title} assignment={assignment} />
            ))}
          </div>
        ) : (
          <EmptyState title="No assignments found" message="Assignments will appear here when the BFF returns active training work." />
        )}
      </Section>

      {trainingData && assignments.length === 0 ? (
        <Section title="Debug fallback">
          <DebugPreview value={trainingData} label="Training payload fallback" />
        </Section>
      ) : null}
    </PageShell>
  );
}
