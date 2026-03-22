"use client";

import type { TrainingRoutineView } from "@/lib/adapters/training";

import { RoutineItem } from "@/components/training/RoutineItem";
import { EmptyState } from "@/components/ui/EmptyState";

type RoutineListProps = {
  routines: TrainingRoutineView[];
  onOpenRoutine: (routine: TrainingRoutineView) => void;
};

export function RoutineList({ routines, onOpenRoutine }: RoutineListProps) {
  if (routines.length === 0) {
    return (
      <EmptyState
        title="Routines are not available"
        message="This package is connected, but the current detail payload does not expose routine-ready structure."
      />
    );
  }

  return (
    <div className="client-training-routine-list">
      {routines.map((routine, index) => (
        <RoutineItem
          key={routine.id ?? `${routine.title}-${index}`}
          routine={routine}
          callToActionLabel={routine.completionLabel ? "View Routine" : "Start Routine"}
          onOpen={() => onOpenRoutine(routine)}
        />
      ))}
    </div>
  );
}
