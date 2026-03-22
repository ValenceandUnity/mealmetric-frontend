export type WorkoutLogExerciseEntryInput = {
  exercise_name?: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration_seconds?: number;
  notes?: string;
  position: number;
};

export type CreateWorkoutLogInput = {
  assignment_id?: string;
  routine_id?: string;
  performed_at: string;
  duration_minutes?: number;
  completion_status: string;
  client_notes?: string;
  exercise_entries?: WorkoutLogExerciseEntryInput[];
};
