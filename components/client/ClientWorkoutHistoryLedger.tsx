"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { SectionBlock } from "@/components/ui/SectionBlock";
import {
  adaptWorkoutHistoryPage,
  type WorkoutHistoryExerciseEntryView,
  type WorkoutHistoryItemView,
} from "@/lib/adapters/workout-history";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue, UserRole } from "@/lib/types/api";
import type { WorkoutLogMode } from "@/lib/types/training";

type WorkoutHistoryResponse = ApiResponse<JsonValue>;
type WorkoutTypeFilter = "all" | WorkoutLogMode;
type WorkoutHistoryTableRow = {
  id: string;
  performedAtLabel: string;
  performedAtTimestamp: number;
  typeMode: WorkoutLogMode;
  typeLabel: string;
  exerciseName: string;
  sets: string;
  reps: string;
  weight: string;
  duration: string;
  notes: string;
};

type ClientWorkoutHistoryLedgerProps = {
  backHref: string;
  backLabel: string;
  className?: string;
  viewerRole?: Extract<UserRole, "client" | "pt">;
  historyApiPath?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  sectionDescription?: string;
};

const PAGE_LIMIT = 30;

function getPerformedTimestamp(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatPerformedAt(value: string | null): string {
  if (!value) {
    return "-";
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
    return "-";
  }

  if (value < 60) {
    return `${value}s`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function formatCellNumber(value: number | null): string {
  return value === null ? "-" : String(value);
}

function formatWorkoutType(mode: WorkoutLogMode): string {
  switch (mode) {
    case "rep":
      return "Rep";
    case "set":
      return "Set";
    case "general_workout":
      return "General Workout";
    default:
      return "General Workout";
  }
}

function flattenExerciseEntries(logs: WorkoutHistoryItemView[]): WorkoutHistoryTableRow[] {
  return logs.flatMap((log, logIndex) => {
    const typeLabel = formatWorkoutType(log.mode);
    const performedAtLabel = formatPerformedAt(log.performedAt);
    const performedAtTimestamp = getPerformedTimestamp(log.performedAt);

    if (log.exerciseEntries.length === 0) {
      const notes = [log.clientNotes, log.ptNotes].filter(Boolean).join(" ").trim();

      return [{
        id: `${log.id}-entryless-${logIndex}`,
        performedAtLabel,
        performedAtTimestamp,
        typeMode: log.mode,
        typeLabel,
        exerciseName: "-",
        sets: "-",
        reps: "-",
        weight: "-",
        duration: "-",
        notes: notes.length > 0 ? notes : "-",
      }];
    }

    return log.exerciseEntries.map((entry, entryIndex) =>
      buildTableRow({
        entry,
        entryIndex,
        log,
        logIndex,
        performedAtLabel,
        performedAtTimestamp,
      }),
    );
  });
}

function buildTableRow({
  entry,
  entryIndex,
  log,
  logIndex,
  performedAtLabel,
  performedAtTimestamp,
}: {
  entry: WorkoutHistoryExerciseEntryView;
  entryIndex: number;
  log: WorkoutHistoryItemView;
  logIndex: number;
  performedAtLabel: string;
  performedAtTimestamp: number;
}): WorkoutHistoryTableRow {
  const notes = [entry.notes, log.clientNotes, log.ptNotes].filter(Boolean).join(" ").trim();
  const exerciseName = entry.exerciseName ?? `Exercise ${entryIndex + 1}`;

  return {
    id: `${log.id}-${entry.id}-${entryIndex}-${logIndex}`,
    performedAtLabel,
    performedAtTimestamp,
    typeMode: log.mode,
    typeLabel: formatWorkoutType(log.mode),
    exerciseName,
    sets: formatCellNumber(entry.sets),
    reps: formatCellNumber(entry.reps),
    weight: formatCellNumber(entry.weight),
    duration: formatDuration(entry.durationSeconds),
    notes: notes.length > 0 ? notes : "-",
  };
}

export function ClientWorkoutHistoryLedger({
  backHref,
  backLabel,
  className,
  viewerRole = "client",
  historyApiPath = "/api/client/training/workout-logs",
  pageTitle = "Log History",
  pageSubtitle = "Review and filter saved workout entries from newest to oldest.",
  sectionDescription = "Review and filter saved workout entries from newest to oldest.",
}: ClientWorkoutHistoryLedgerProps) {
  const { status, user } = useSessionBootstrap({
    requiredRole: viewerRole,
    unauthenticatedRedirectTo: "/login",
  });

  const [historyData, setHistoryData] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<WorkoutTypeFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== viewerRole) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_LIMIT),
          offset: String(offset),
        });
        const normalizedSearch = searchValue.trim();

        if (typeFilter !== "all") {
          params.set("mode", typeFilter);
        }

        if (normalizedSearch.length > 0) {
          params.set("search", normalizedSearch);
        }

        const response = await fetch(`${historyApiPath}?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
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
      } catch (error) {
        if (!active || controller.signal.aborted) {
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
      controller.abort();
    };
  }, [historyApiPath, offset, searchValue, status, typeFilter, user, viewerRole]);

  const historyPage = useMemo(() => adaptWorkoutHistoryPage(historyData), [historyData]);
  const tableRows = useMemo(
    () =>
      flattenExerciseEntries(historyPage.items).sort(
        (left, right) => right.performedAtTimestamp - left.performedAtTimestamp,
      ),
    [historyPage.items],
  );

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

  if (status === "loading") {
    return (
      <LoadingBlock
        title="Loading workout history"
        message={`Validating your ${viewerRole === "pt" ? "PT" : "client"} session.`}
      />
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message={`Workout history requires an authenticated ${viewerRole} session.`}
      />
    );
  }

  return (
    <PageShell
      title={pageTitle}
      user={user}
      subtitle={pageSubtitle}
      className={className}
      navigation={<Link className="link-button" href={backHref}>{backLabel}</Link>}
    >
      {loading ? (
        <LoadingBlock
          title="Loading history"
          message={`Fetching saved workout logs through the protected ${viewerRole} route.`}
        />
      ) : null}
      {errorMessage ? <ErrorBlock title="Unable to load workout history" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <SectionBlock
            eyebrow="Log history"
            title="Log History"
            description={sectionDescription}
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
                  onClick={() => {
                    setTypeFilter("all");
                    setOffset(0);
                  }}
                  aria-pressed={typeFilter === "all"}
                >
                  All
                </button>
                <button
                  type="button"
                  className={typeFilter === "rep" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                  onClick={() => {
                    setTypeFilter("rep");
                    setOffset(0);
                  }}
                  aria-pressed={typeFilter === "rep"}
                >
                  Rep
                </button>
                <button
                  type="button"
                  className={typeFilter === "set" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                  onClick={() => {
                    setTypeFilter("set");
                    setOffset(0);
                  }}
                  aria-pressed={typeFilter === "set"}
                >
                  Set
                </button>
                <button
                  type="button"
                  className={typeFilter === "general_workout" ? "client-add-log-context__chip client-add-log-context__chip--active" : "client-add-log-context__chip"}
                  onClick={() => {
                    setTypeFilter("general_workout");
                    setOffset(0);
                  }}
                  aria-pressed={typeFilter === "general_workout"}
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
                  onChange={(event) => {
                    setSearchValue(event.target.value);
                    setOffset(0);
                  }}
                />
              </div>
            </div>
          </SectionBlock>

          <Card as="section" className="section-block">
            {tableRows.length === 0 ? (
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
                  {tableRows.length > 0 ? (
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
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="action-row" style={paginationStyle}>
              <button
                type="button"
                className="utility-icon-link"
                onClick={() => {
                  if (historyPage.nextOffset !== null) {
                    setOffset(historyPage.nextOffset);
                  }
                }}
                disabled={!historyPage.hasMore || historyPage.nextOffset === null}
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
