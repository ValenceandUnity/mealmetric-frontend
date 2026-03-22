"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type {
  WorkoutHistoryExerciseEntryView,
  WorkoutHistoryItemView,
} from "@/lib/adapters/workout-history";

function formatPerformedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatMinutes(value: number | null): string | null {
  if (value === null) {
    return null;
  }

  return `${value} min`;
}

function formatDurationSeconds(value: number | null): string | null {
  if (value === null) {
    return null;
  }

  if (value < 60) {
    return `${value}s`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function renderExerciseMeta(entry: WorkoutHistoryExerciseEntryView): string[] {
  return [
    entry.sets !== null ? `${entry.sets} sets` : "",
    entry.reps !== null ? `${entry.reps} reps` : "",
    entry.weight !== null ? `${entry.weight} weight` : "",
    entry.durationSeconds !== null ? formatDurationSeconds(entry.durationSeconds) ?? "" : "",
  ].filter((value) => value.length > 0);
}

type WorkoutHistoryListProps = {
  logs: WorkoutHistoryItemView[];
  ptNoteEditor?: {
    enabled: boolean;
    onSave: (logId: string, ptNotes: string | null) => Promise<void>;
  };
};

type WorkoutLogPtNoteEditorProps = {
  log: WorkoutHistoryItemView;
  onSave: (logId: string, ptNotes: string | null) => Promise<void>;
};

function WorkoutLogPtNoteDisplay({ note, label = "Coach note" }: { note: string; label?: string }) {
  return (
    <div className="client-workout-history-card__note-section">
      <p className="client-workout-history-card__note-label">{label}</p>
      <p className="client-workout-history-card__notes client-workout-history-card__notes--preserve">
        {note}
      </p>
    </div>
  );
}

function WorkoutLogPtNoteEditor({ log, onSave }: WorkoutLogPtNoteEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(log.ptNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(log.ptNotes ?? "");
  }, [log.ptNotes]);

  async function handleSave() {
    setSaving(true);
    setFeedbackMessage(null);

    try {
      await onSave(log.id, draft.trim().length > 0 ? draft : null);
      setFeedbackMessage("PT note saved.");
      setIsEditing(false);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Unable to save PT note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="client-workout-history-pt-note-editor">
      {log.ptNotes ? (
        <WorkoutLogPtNoteDisplay note={log.ptNotes} label="PT note" />
      ) : null}

      {isEditing ? (
        <div className="client-workout-history-pt-note-form">
          <label className="client-workout-history-pt-note-label" htmlFor={`pt-note-${log.id}`}>
            PT note
          </label>
          <textarea
            id={`pt-note-${log.id}`}
            className="client-workout-history-pt-note-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            disabled={saving}
          />
          <div className="client-workout-history-pt-note-actions">
            <button type="button" className="link-button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save note"}
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setDraft(log.ptNotes ?? "");
                setFeedbackMessage(null);
                setIsEditing(false);
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
          {feedbackMessage ? (
            <p className="client-workout-history-pt-note-feedback">{feedbackMessage}</p>
          ) : null}
        </div>
      ) : (
        <div className="client-workout-history-pt-note-form">
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setDraft(log.ptNotes ?? "");
              setFeedbackMessage(null);
              setIsEditing(true);
            }}
          >
            {log.ptNotes ? "Edit note" : "Add note"}
          </button>
          {feedbackMessage ? (
            <p className="client-workout-history-pt-note-feedback">{feedbackMessage}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function WorkoutHistoryList({ logs, ptNoteEditor }: WorkoutHistoryListProps) {
  return (
    <div className="client-workout-history-list">
      {logs.map((log, index) => {
        const performedAtLabel = formatPerformedAt(log.performedAt);
        const exerciseCountLabel = `${log.exerciseEntries.length} exercise entr${log.exerciseEntries.length === 1 ? "y" : "ies"}`;

        return (
          <Card key={`${log.id}-${index}`} className="client-workout-history-card" variant="soft">
            <details className="client-workout-history-card__details">
              <summary className="client-workout-history-card__summary">
                <div className="client-workout-history-card__copy">
                  <p className="client-workout-history-card__eyebrow">Workout log</p>
                  <h3 className="client-workout-history-card__title">
                    {performedAtLabel ?? `Saved workout ${index + 1}`}
                  </h3>
                  <div className="client-workout-history-card__chips">
                    {log.routineContext ? <Chip tone="accent">{log.routineContext}</Chip> : null}
                    {log.durationMinutes !== null ? <Chip tone="muted">{formatMinutes(log.durationMinutes)}</Chip> : null}
                    <Chip tone="muted">{exerciseCountLabel}</Chip>
                  </div>
                </div>
                {log.completionStatus ? <Badge label={log.completionStatus} tone="neutral" /> : null}
              </summary>

              <div className="client-workout-history-card__body">
                <div className="client-workout-history-card__meta">
                  {log.performedAt ? <span><strong>Performed:</strong> {performedAtLabel ?? log.performedAt}</span> : null}
                  {log.routineContext ? <span><strong>Routine:</strong> {log.routineContext}</span> : null}
                  {log.durationMinutes !== null ? <span><strong>Duration:</strong> {log.durationMinutes} minutes</span> : null}
                  {log.completionStatus ? <span><strong>Status:</strong> {log.completionStatus}</span> : null}
                  <span><strong>Exercises:</strong> {log.exerciseEntries.length}</span>
                </div>

                {log.clientNotes ? (
                  <p className="client-workout-history-card__notes">
                    <strong>Notes:</strong> {log.clientNotes}
                  </p>
                ) : null}

                {log.exerciseEntries.length > 0 ? (
                  <div className="client-workout-history-exercise-list">
                    {log.exerciseEntries.map((entry) => {
                      const meta = renderExerciseMeta(entry);

                      return (
                        <Card key={entry.id} className="client-workout-history-exercise" variant="ghost">
                          <div className="client-workout-history-exercise__header">
                            <div className="client-workout-history-exercise__copy">
                              <p className="client-workout-history-exercise__eyebrow">Exercise {entry.position + 1}</p>
                              <h4 className="client-workout-history-exercise__title">
                                {entry.exerciseName ?? `Exercise ${entry.position + 1}`}
                              </h4>
                            </div>
                          </div>

                          {meta.length > 0 ? (
                            <div className="client-workout-history-exercise__meta">
                              {meta.map((item) => (
                                <span key={`${entry.id}-${item}`}>{item}</span>
                              ))}
                            </div>
                          ) : null}

                          {entry.notes ? (
                            <p className="client-workout-history-exercise__notes">
                              <strong>Notes:</strong> {entry.notes}
                            </p>
                          ) : null}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="client-workout-history-card__notes">
                    No structured exercise rows were returned for this workout log.
                  </p>
                )}

                {ptNoteEditor?.enabled ? (
                  <WorkoutLogPtNoteEditor log={log} onSave={ptNoteEditor.onSave} />
                ) : log.ptNotes ? (
                  <WorkoutLogPtNoteDisplay note={log.ptNotes} />
                ) : null}
              </div>
            </details>
          </Card>
        );
      })}
    </div>
  );
}
