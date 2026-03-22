"use client";

import Link from "next/link";

import { RoutineCard } from "@/components/training/RoutineCard";
import type { TrainingAssignmentView } from "@/lib/adapters/training";

export function AssignmentCard({ assignment }: { assignment: TrainingAssignmentView }) {
  return (
    <RoutineCard
      eyebrow="Assignment"
      title={assignment.title}
      description={assignment.description}
      status={assignment.status ? { label: assignment.status, tone: "accent" } : undefined}
      metadata={[
        { label: "Package", value: assignment.packageId ?? "Unavailable" },
        { label: "Window", value: assignment.schedule },
        { label: "Checklist", value: assignment.checklistCount },
      ]}
      footer={
        assignment.id ? (
          <Link className="link-button" href={`/client/training/${assignment.id}`}>
            Open assignment
          </Link>
        ) : null
      }
    />
  );
}
