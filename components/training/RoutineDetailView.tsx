"use client";

import Link from "next/link";

import { ExerciseList } from "@/components/training/ExerciseList";
import { ActionRow } from "@/components/ui/ActionRow";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import type { TrainingRoutineView } from "@/lib/adapters/training";

type RoutineDetailViewProps = {
  routine: TrainingRoutineView;
  addLogHref: string;
};

export function RoutineDetailView({
  routine,
  addLogHref,
}: RoutineDetailViewProps) {
  return (
    <div className="client-training-routine-detail">
      <Card className="client-training-routine-detail__header" variant="soft">
        <PageHeader
          eyebrow={routine.label ?? "Routine"}
          title={routine.title}
          description={
            routine.metadata.length > 0
              ? "Routine metadata and exercises shown here come directly from the selected package detail."
              : "This routine is available, but only its direct headline fields are currently exposed."
          }
          status={routine.completionLabel ? { label: routine.completionLabel, tone: "success" } : undefined}
          actions={
            <ActionRow>
              <Link className="link-button link-button--accent" href={addLogHref}>
                {routine.completionLabel ? "Log Workout" : "Start Workout"}
              </Link>
            </ActionRow>
          }
        />
        {routine.metadata.length > 0 ? (
          <div className="client-training-routine-detail__meta">
            {routine.metadata.map((item) => (
              <Badge key={`${item.label}-${item.value}`} label={`${item.label}: ${item.value}`} tone="neutral" />
            ))}
          </div>
        ) : null}
      </Card>

      {routine.exercises.length > 0 ? (
        <ExerciseList exercises={routine.exercises} />
      ) : routine.metadata.length > 0 || routine.title ? (
        <ExerciseList exercises={routine.exercises} />
      ) : (
        <EmptyState
          title="Routine data is not display-ready"
          message="The selected routine does not expose enough structure for a routine detail view."
        />
      )}
    </div>
  );
}
