"use client";

import { ExerciseInputRow, type ExerciseInputRowState } from "@/components/training/ExerciseInputRow";

type ExerciseInputListProps = {
  exercises: ExerciseInputRowState[];
  onChange: (id: string, key: keyof Omit<ExerciseInputRowState, "id">, value: string) => void;
  onRemove: (id: string) => void;
};

export function ExerciseInputList({
  exercises,
  onChange,
  onRemove,
}: ExerciseInputListProps) {
  return (
    <div className="client-add-log-list">
      {exercises.map((exercise) => (
        <ExerciseInputRow
          key={exercise.id}
          exercise={exercise}
          onChange={onChange}
          onRemove={onRemove}
          disableRemove={exercises.length === 1}
        />
      ))}
    </div>
  );
}
