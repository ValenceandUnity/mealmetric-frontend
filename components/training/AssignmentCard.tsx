"use client";

import Link from "next/link";

import { DetailCard } from "@/components/cards/DetailCard";
import type { TrainingAssignmentView } from "@/lib/adapters/training";

export function AssignmentCard({ assignment }: { assignment: TrainingAssignmentView }) {
  return (
    <DetailCard
      eyebrow={assignment.status ?? "Assignment"}
      title={assignment.title}
      description={assignment.description}
      metadata={
        <>
          <span>
            <strong>Package:</strong> {assignment.packageId ?? "Unavailable"}
          </span>
          <span>
            <strong>Window:</strong> {assignment.schedule}
          </span>
          <span>
            <strong>Checklist:</strong> {assignment.checklistCount}
          </span>
        </>
      }
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
