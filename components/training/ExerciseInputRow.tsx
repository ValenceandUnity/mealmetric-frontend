"use client";

export type ExerciseInputRowState = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  time: string;
};

type ExerciseInputRowProps = {
  exercise: ExerciseInputRowState;
  onChange: (id: string, key: keyof Omit<ExerciseInputRowState, "id">, value: string) => void;
  onRemove: (id: string) => void;
  disableRemove: boolean;
};

export function ExerciseInputRow({
  exercise,
  onChange,
  onRemove,
  disableRemove,
}: ExerciseInputRowProps) {
  return (
    <div className="client-add-log-row">
      <div className="field">
        <label htmlFor={`exercise-name-${exercise.id}`}>Exercise name</label>
        <input
          id={`exercise-name-${exercise.id}`}
          value={exercise.name}
          onChange={(event) => onChange(exercise.id, "name", event.target.value)}
          placeholder="Bench press"
        />
      </div>
      <div className="client-add-log-row__grid">
        <div className="field">
          <label htmlFor={`exercise-sets-${exercise.id}`}>Sets</label>
          <input
            id={`exercise-sets-${exercise.id}`}
            type="number"
            min="0"
            step="1"
            value={exercise.sets}
            onChange={(event) => onChange(exercise.id, "sets", event.target.value)}
            placeholder="3"
          />
        </div>
        <div className="field">
          <label htmlFor={`exercise-reps-${exercise.id}`}>Reps</label>
          <input
            id={`exercise-reps-${exercise.id}`}
            type="number"
            min="0"
            step="1"
            value={exercise.reps}
            onChange={(event) => onChange(exercise.id, "reps", event.target.value)}
            placeholder="10"
          />
        </div>
        <div className="field">
          <label htmlFor={`exercise-weight-${exercise.id}`}>Weight</label>
          <input
            id={`exercise-weight-${exercise.id}`}
            type="number"
            min="0"
            value={exercise.weight}
            onChange={(event) => onChange(exercise.id, "weight", event.target.value)}
            placeholder="135"
          />
        </div>
        <div className="field">
          <label htmlFor={`exercise-time-${exercise.id}`}>Time (minutes)</label>
          <input
            id={`exercise-time-${exercise.id}`}
            type="number"
            min="0"
            step="0.1"
            value={exercise.time}
            onChange={(event) => onChange(exercise.id, "time", event.target.value)}
            placeholder="15"
          />
        </div>
      </div>
      <button type="button" className="button--danger" onClick={() => onRemove(exercise.id)} disabled={disableRemove}>
        Remove exercise
      </button>
    </div>
  );
}
