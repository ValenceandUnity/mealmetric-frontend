"use client";

type ContextMode = "routine" | "general";

type ContextSelectorProps = {
  mode: ContextMode;
  routineName: string;
  hasPrefilledRoutine: boolean;
  onModeChange: (mode: ContextMode) => void;
  onRoutineNameChange: (value: string) => void;
};

export function ContextSelector({
  mode,
  routineName,
  hasPrefilledRoutine,
  onModeChange,
  onRoutineNameChange,
}: ContextSelectorProps) {
  return (
    <div className="client-add-log-context">
      <div className="client-add-log-context__toggle" role="radiogroup" aria-label="Workout context">
        <button
          type="button"
          className={mode === "routine" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
          onClick={() => onModeChange("routine")}
          aria-pressed={mode === "routine"}
        >
          Routine
        </button>
        <button
          type="button"
          className={mode === "general" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
          onClick={() => onModeChange("general")}
          aria-pressed={mode === "general"}
        >
          General workout
        </button>
      </div>

      {mode === "routine" ? (
        <div className="field">
          <label htmlFor="routine-context-name">Routine</label>
          <input
            id="routine-context-name"
            value={routineName}
            onChange={(event) => onRoutineNameChange(event.target.value)}
            placeholder="Enter routine name"
            readOnly={hasPrefilledRoutine}
          />
        </div>
      ) : null}
    </div>
  );
}
