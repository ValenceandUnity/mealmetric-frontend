"use client";

import { Card } from "@/components/ui/Card";
import type { TrainingExerciseView } from "@/lib/adapters/training";

type ExerciseItemProps = {
  exercise: TrainingExerciseView;
};

export function ExerciseItem({ exercise }: ExerciseItemProps) {
  const metadata = [
    ...(exercise.sets ? [{ label: "Sets", value: exercise.sets }] : []),
    ...(exercise.reps ? [{ label: "Reps", value: exercise.reps }] : []),
    ...(exercise.weightGuidance ? [{ label: "Weight", value: exercise.weightGuidance }] : []),
    ...(exercise.duration ? [{ label: "Duration", value: exercise.duration }] : []),
  ];

  return (
    <Card className="client-training-exercise-item" variant="ghost">
      <div className="client-training-exercise-item__copy">
        <p className="client-training-exercise-item__eyebrow">Exercise</p>
        <h4 className="client-training-exercise-item__title">{exercise.title}</h4>
      </div>
      {metadata.length > 0 ? (
        <div className="client-training-exercise-item__meta">
          {metadata.map((item) => (
            <span key={`${item.label}-${item.value}`}>
              <strong>{item.label}:</strong> {item.value}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
