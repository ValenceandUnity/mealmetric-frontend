"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import type { TrainingExerciseView } from "@/lib/adapters/training";

import { ExerciseItem } from "@/components/training/ExerciseItem";

type ExerciseListProps = {
  exercises: TrainingExerciseView[];
};

export function ExerciseList({ exercises }: ExerciseListProps) {
  if (exercises.length === 0) {
    return (
      <EmptyState
        title="No exercises available for this routine"
        message="This routine is connected, but the current detail payload does not expose exercise entries."
      />
    );
  }

  return (
    <div className="client-training-exercise-list">
      {exercises.map((exercise, index) => (
        <ExerciseItem key={exercise.id ?? `${exercise.title}-${index}`} exercise={exercise} />
      ))}
    </div>
  );
}
