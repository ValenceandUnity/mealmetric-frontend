"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { SectionBlock } from "@/components/ui/SectionBlock";
import {
  adaptWorkoutHistory,
  type WorkoutHistoryExerciseEntryView,
  type WorkoutHistoryItemView,
} from "@/lib/adapters/workout-history";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type WorkoutHistoryResponse = ApiResponse<JsonValue>;
type WorkoutTypeFilter = "all" | "rep" | "set" | "general";
type WorkoutHistoryTableRow = {
  id: string;
  performedAtLabel: string;
  performedAtTimestamp: number;
  typeLabel: "Rep" | "General Workout";
  exerciseName: string;
  sets: string;
  reps: string;
  weight: string;
  duration: string;
  notes: string;
  searchText: string;
};

const ROWS_PER_PAGE = 30;

function getPerformedTimestamp(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatPerformedAt(value: string | null): string {
  if (!value) {
    return "—";
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

function formatDuration(value: number | null): string {
  if (value === null) {
    return "—";
  }

  if (value < 60) {
    return `${value}s`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function formatCellNumber(value: number | null): string {
  return value === null ? "—" : String(value);
}

function deriveWorkoutType(log: WorkoutHistoryItemView): "Rep" | "General Workout" {
  return log.routineContext ? "Rep" : "General Workout";
}

function matchesWorkoutType(row: WorkoutHistoryTableRow, filter: WorkoutTypeFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "rep":
      return row.typeLabel === "Rep";
    case "set":
      return false;
    case "general":
      return row.typeLabel === "General Workout";
    default:
      return true;
  }
}

function flattenExerciseEntries(logs: WorkoutHistoryItemView[]): WorkoutHistoryTableRow[] {
  return logs.flatMap((log, logIndex) => {
    const typeLabel = deriveWorkoutType(log);
    const performedAtLabel = formatPerformedAt(log.performedAt);
    const performedAtTimestamp = getPerformedTimestamp(log.performedAt);
    const sharedSearchValues = [
      typeLabel,
      performedAtLabel,
      log.routineContext ?? "",
      log.clientNotes ?? "",
      log.ptNotes ?? "",
    ];

    if (log.exerciseEntries.length === 0) {
      const notes = [log.clientNotes, log.ptNotes].filter(Boolean).join(" ").trim();

      return [{
        id: `${log.id}-entryless-${logIndex}`,
        performedAtLabel,
        performedAtTimestamp,
        typeLabel,
        exerciseName: "—",
        sets: "—",
        reps: "—",
        weight: "—",
        duration: "—",
        notes: notes.length > 0 ? notes : "—",
        searchText: [...sharedSearchValues, notes].join(" ").toLowerCase(),
      }];
    }

    return log.exerciseEntries.map((entry, entryIndex) => {
      const notes = [entry.notes, log.clientNotes, log.ptNotes].filter(Boolean).join(" ").trim();
      return buildTableRow({
        entry,
        entryIndex,
        log,
        logIndex,
        notes,
        performedAtLabel,
        performedAtTimestamp,
        typeLabel,
        sharedSearchValues,
      });
    });
  });
}

function buildTableRow({
  entry,
  entryIndex,
  log,
  logIndex,
  notes,
  performedAtLabel,
  performedAtTimestamp,
  typeLabel,
  sharedSearchValues,
}: {
  entry: WorkoutHistoryExerciseEntryView;
  entryIndex: number;
  log: WorkoutHistoryItemView;
  logIndex: number;
  notes: string;
  performedAtLabel: string;
  performedAtTimestamp: number;
  typeLabel: "Rep" | "General Workout";
  sharedSearchValues: string[];
}): WorkoutHistoryTableRow {
  const exerciseName = entry.exerciseName ?? `Exercise ${entryIndex + 1}`;

  return {
    id: `${log.id}-${entry.id}-${entryIndex}-${logIndex}`,
    performedAtLabel,
    performedAtTimestamp,
    typeLabel,
    exerciseName,
    sets: formatCellNumber(entry.sets),
    reps: formatCellNumber(entry.reps),
    weight: formatCellNumber(entry.weight),
    duration: formatDuration(entry.durationSeconds),
    notes: notes.length > 0 ? notes : "—",
    searchText: [
      ...sharedSearchValues,
      exerciseName,
      notes,
      entry.exerciseName ?? "",
      entry.notes ?? "",
    ].join(" ").toLowerCase(),
  };
}

export default function ClientWorkoutHistoryPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [historyData, setHistoryData] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<WorkoutTypeFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/client/training/workout-logs", { cache: "no-store" });
        const payload = (await response.json()) as WorkoutHistoryResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setHistoryData(null);
          return;
        }

        setHistoryData(payload.data);
      } catch {
        if (!active) {
          return;
        }

        setErrorMessage("Unable to load workout history.");
        setHistoryData(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [status, user]);

  const logs = useMemo(() => adaptWorkoutHistory(historyData), [historyData]);
  const flattenedRows = useMemo(
    () => flattenExerciseEntries(logs).sort((left, right) => right.performedAtTimestamp - left.performedAtTimestamp),
    [logs],
  );
  const filteredRows = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    return flattenedRows.filter((row) => {
      if (!matchesWorkoutType(row, typeFilter)) {
        return false;
      }

      if (normalizedSearch.length === 0) {
        return true;
      }

      return row.searchText.includes(normalizedSearch);
    });
  }, [flattenedRows, searchValue, typeFilter]);
  const visibleRows = useMemo(() => {
    const start = pageIndex * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, pageIndex]);
  const hasOlderEntries = (pageIndex + 1) * ROWS_PER_PAGE < filteredRows.length;
  const tableRows = visibleRows.length > 0 ? visibleRows : null;
  const filterToggleStyle: CSSProperties = {
    justifyContent: "center",
  };
  const tableWrapperStyle: CSSProperties = {
    overflowX: "auto",
  };
  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "760px",
  };
  const paginationStyle: CSSProperties = {
    justifyContent: "flex-end",
    marginTop: "1rem",
  };
  const emptyNoteStyle: CSSProperties = {
    marginBottom: "1rem",
  };

  useEffect(() => {
    setPageIndex(0);
  }, [searchValue, typeFilter]);

  if (status === "loading") {
    return <LoadingBlock title="Loading workout history" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Workout history requires an authenticated client session." />;
  }

  return (
    <PageShell
      title="Log History"
      user={user}
      className="app-shell--client-workout-history"
      navigation={<Link className="link-button" href="/client/training">Back to training</Link>}
    >
      {loading ? <LoadingBlock title="Loading history" message="Fetching saved workout logs through the protected client route." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load workout history" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <SectionBlock
            eyebrow="Log history"
            title="Filters and search"
            description="Filter by workout type and search exercise names or notes in real time."
          >
            <div className="client-add-log-context">
              <div
                className="client-add-log-context__toggle"
                role="radiogroup"
                aria-label="Workout type filter"
                style={filterToggleStyle}
              >
                <button
                  type="button"
                  className={typeFilter === "all" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                  onClick={() => setTypeFilter("all")}
                  aria-pressed={typeFilter === "all"}
                >
                  All
                </button>
                <button
                  type="button"
                  className={typeFilter === "rep" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                  onClick={() => setTypeFilter("rep")}
                  aria-pressed={typeFilter === "rep"}
                >
                  Rep
                </button>
                <button
                  type="button"
                  className={typeFilter === "set" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                  onClick={() => setTypeFilter("set")}
                  aria-pressed={typeFilter === "set"}
                >
                  Set
                </button>
                <button
                  type="button"
                  className={typeFilter === "general" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                  onClick={() => setTypeFilter("general")}
                  aria-pressed={typeFilter === "general"}
                >
                  General Workout
                </button>
              </div>

              <div className="field">
                <label htmlFor="history-search">Search</label>
                <input
                  id="history-search"
                  type="search"
                  placeholder="Search exercises, equipment, or notes"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </div>
            </div>
          </SectionBlock>

          <Card as="section" className="section-block">
            {filteredRows.length === 0 ? (
              <p className="section__copy" style={emptyNoteStyle}>
                No logged workouts yet.
              </p>
            ) : null}

            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Exercise</th>
                    <th>Sets</th>
                    <th>Reps</th>
                    <th>Weight</th>
                    <th>Time / Duration</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows ? (
                    tableRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.performedAtLabel}</td>
                        <td>{row.typeLabel}</td>
                        <td>{row.exerciseName}</td>
                        <td>{row.sets}</td>
                        <td>{row.reps}</td>
                        <td>{row.weight}</td>
                        <td>{row.duration}</td>
                        <td>{row.notes}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="action-row" style={paginationStyle}>
              <button
                type="button"
                className="utility-icon-link"
                onClick={() => setPageIndex((current) => current + 1)}
                disabled={!hasOlderEntries}
                aria-label="Show older workout entries"
                title="Show older workout entries"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.97 5.97a.75.75 0 0 1 1.06 0l5.5 5.5a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 1 1-1.06-1.06L13.94 12 8.97 7.03a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>
          </Card>
        </>
      ) : null}
    </PageShell>
  );
}
