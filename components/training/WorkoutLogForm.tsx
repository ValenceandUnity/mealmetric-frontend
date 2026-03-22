"use client";

import type { FormEventHandler } from "react";

export type WorkoutLogFormState = {
  assignmentId: string;
  routineId: string;
  performedAt: string;
  durationMinutes: string;
  completionStatus: string;
  clientNotes: string;
};

type WorkoutLogFormProps = {
  formState: WorkoutLogFormState;
  onChange: (key: keyof WorkoutLogFormState, value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  loading: boolean;
};

export function WorkoutLogForm({
  formState,
  onChange,
  onSubmit,
  loading,
}: WorkoutLogFormProps) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="assignmentId">Assignment ID</label>
        <input
          id="assignmentId"
          value={formState.assignmentId}
          onChange={(event) => onChange("assignmentId", event.target.value)}
          disabled={loading}
        />
      </div>
      <div className="field">
        <label htmlFor="routineId">Routine ID</label>
        <input
          id="routineId"
          value={formState.routineId}
          onChange={(event) => onChange("routineId", event.target.value)}
          disabled={loading}
        />
      </div>
      <div className="field">
        <label htmlFor="performedAt">Performed At</label>
        <input
          id="performedAt"
          value={formState.performedAt}
          onChange={(event) => onChange("performedAt", event.target.value)}
          disabled={loading}
        />
      </div>
      <div className="field">
        <label htmlFor="durationMinutes">Duration Minutes</label>
        <input
          id="durationMinutes"
          type="number"
          min="0"
          value={formState.durationMinutes}
          onChange={(event) => onChange("durationMinutes", event.target.value)}
          disabled={loading}
        />
      </div>
      <div className="field">
        <label htmlFor="completionStatus">Completion Status</label>
        <input
          id="completionStatus"
          value={formState.completionStatus}
          onChange={(event) => onChange("completionStatus", event.target.value)}
          disabled={loading}
        />
      </div>
      <div className="field">
        <label htmlFor="clientNotes">Client Notes</label>
        <textarea
          id="clientNotes"
          rows={4}
          value={formState.clientNotes}
          onChange={(event) => onChange("clientNotes", event.target.value)}
          disabled={loading}
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit workout log"}
      </button>
    </form>
  );
}
