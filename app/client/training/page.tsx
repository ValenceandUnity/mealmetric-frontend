"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { AssignmentCard } from "@/components/training/AssignmentCard";
import { RoutineCard } from "@/components/training/RoutineCard";
import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
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
  const focusAssignment = assignments[0] ?? null;
  const scheduledAssignments = assignments.filter(
    (assignment) => assignment.schedule !== "Dates not provided",
  ).length;
  const packagedAssignments = assignments.filter(
    (assignment) => assignment.packageId && assignment.packageId !== "Unavailable",
  ).length;
  const checklistReadyAssignments = assignments.filter(
    (assignment) => !assignment.checklistCount.toLowerCase().includes("pending"),
  ).length;

  return (
    <PageShell
      title="Training hub"
      user={user}
      navigation={<Link className="link-button" href="/client">Back to client home</Link>}
    >
      {loading ? <LoadingBlock title="Loading assignments" message="Fetching your current training assignments." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load assignments" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Card className="client-training-hero" variant="accent" as="section">
            <PageHeader
              eyebrow="Client training"
              title="Focused training workspace"
              description="Stay on top of assigned work, review what is active now, and move directly into the next training step."
              chips={[
                `${assignments.length} assignment${assignments.length === 1 ? "" : "s"}`,
                `${checklistReadyAssignments} checklist-ready`,
              ]}
            />
            <div className="client-training-hero__stats">
              <StatPill
                label="Assignments"
                value={`${assignments.length}`}
                hint="Current training items returned by the protected training route."
                active
              />
              <StatPill
                label="Scheduled"
                value={`${scheduledAssignments}`}
                hint="Assignments that include at least one scheduling date."
              />
              <StatPill
                label="Packaged"
                value={`${packagedAssignments}`}
                hint="Assignments tied to a returned training package identifier."
              />
              <StatPill
                label="Checklist ready"
                value={`${checklistReadyAssignments}`}
                hint="Assignments that expose checklist-style structure."
              />
            </div>
            <ActionRow>
              {focusAssignment?.id ? (
                <Link className="link-button link-button--accent" href={`/client/training/${focusAssignment.id}`}>
                  Continue training
                </Link>
              ) : (
                <Link className="link-button link-button--accent" href="/client">
                  Back to dashboard
                </Link>
              )}
              <Link className="link-button" href="/client/metrics">
                Review metrics
              </Link>
              <Link className="link-button" href="/client">
                Client home
              </Link>
            </ActionRow>
          </Card>

          <SectionBlock
            eyebrow="Focus"
            title="Current assignment"
            description="The lead training item is surfaced here for quick continuation."
          >
            {focusAssignment ? (
              <RoutineCard
                eyebrow="In focus"
                title={focusAssignment.title}
                description={focusAssignment.description}
                status={
                  focusAssignment.status
                    ? { label: focusAssignment.status, tone: "accent" }
                    : undefined
                }
                metadata={[
                  { label: "Package", value: focusAssignment.packageId ?? "Unavailable" },
                  { label: "Window", value: focusAssignment.schedule },
                  { label: "Checklist", value: focusAssignment.checklistCount },
                ]}
                active
                footer={
                  focusAssignment.id ? (
                    <>
                      <Link className="link-button link-button--accent" href={`/client/training/${focusAssignment.id}`}>
                        Open assignment
                      </Link>
                      <Link className="link-button" href="/client/training">
                        Training overview
                      </Link>
                    </>
                  ) : null
                }
              />
            ) : (
              <EmptyState
                title="No active assignment"
                message="As soon as the training route returns work, the current assignment will be featured here."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Structure"
            title="Training overview"
            description="Quick scan of the training workload currently visible in the client workspace."
          >
            {assignments.length > 0 ? (
              <Card className="client-training-overview" variant="soft">
                <ListRow
                  eyebrow="Assignment queue"
                  title={`${assignments.length} assignment${assignments.length === 1 ? "" : "s"} in this workspace`}
                  description="Use this summary to understand how much structured work is currently exposed by the BFF training slice."
                  metadata={[
                    { label: "Scheduled", value: `${scheduledAssignments}` },
                    { label: "Packaged", value: `${packagedAssignments}` },
                    { label: "Checklist ready", value: `${checklistReadyAssignments}` },
                  ]}
                />
              </Card>
            ) : (
              <EmptyState
                title="Training structure unavailable"
                message="No assignment metadata is available yet for the current training workspace."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Assignments"
            title="Assignment stack"
            description="All currently visible assignments returned through `/api/client/training`."
            actions={
              <Link className="link-button" href="/client">
                Back to home
              </Link>
            }
          >
            {assignments.length > 0 ? (
              <div className="stacked-list">
                {assignments.map((assignment, index) => (
                  <AssignmentCard key={assignment.id ?? `${assignment.title}-${index}`} assignment={assignment} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No assignments found"
                message="Assignments will appear here when the BFF returns active training work."
              />
            )}
          </SectionBlock>

          {trainingData && assignments.length === 0 ? (
            <SectionBlock
              eyebrow="Fallback"
              title="Training payload fallback"
              description="The raw payload is available for inspection because the current route did not adapt into assignment cards."
            >
              <DebugPreview value={trainingData} label="Training payload fallback" />
            </SectionBlock>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
