"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { WorkoutHistoryList } from "@/components/training/WorkoutHistoryList";
import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { adaptWorkoutHistory } from "@/lib/adapters/workout-history";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import type { WorkoutHistoryItemView } from "@/lib/adapters/workout-history";

type WorkoutHistoryResponse = ApiResponse<JsonValue>;
type WorkoutTypeFilter = "all" | "rep" | "set" | "general";

const LOGS_PER_PAGE = 30;

function getPerformedTimestamp(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function deriveWorkoutType(log: WorkoutHistoryItemView): "Rep" | "General Workout" {
  return log.routineContext ? "Rep" : "General Workout";
}

function matchesWorkoutType(log: WorkoutHistoryItemView, filter: WorkoutTypeFilter): boolean {
  const type = deriveWorkoutType(log);

  switch (filter) {
    case "all":
      return true;
    case "rep":
      return type === "Rep";
    case "set":
      return false;
    case "general":
      return type === "General Workout";
    default:
      return true;
  }
}

function matchesSearch(log: WorkoutHistoryItemView, searchValue: string): boolean {
  const query = searchValue.trim().toLowerCase();
  if (query.length === 0) {
    return true;
  }

  const type = deriveWorkoutType(log).toLowerCase();
  const values = [
    type,
    log.performedAt ?? "",
    log.routineContext ?? "",
    log.clientNotes ?? "",
    log.ptNotes ?? "",
    ...log.exerciseEntries.flatMap((entry) => [
      entry.exerciseName ?? "",
      entry.notes ?? "",
    ]),
  ];

  return values.some((value) => value.toLowerCase().includes(query));
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
  const sortedLogs = useMemo(
    () => [...logs].sort((left, right) => getPerformedTimestamp(right.performedAt) - getPerformedTimestamp(left.performedAt)),
    [logs],
  );
  const filteredLogs = useMemo(
    () => sortedLogs.filter((log) => matchesWorkoutType(log, typeFilter) && matchesSearch(log, searchValue)),
    [searchValue, sortedLogs, typeFilter],
  );
  const visibleLogs = useMemo(() => {
    const start = pageIndex * LOGS_PER_PAGE;
    return filteredLogs.slice(start, start + LOGS_PER_PAGE);
  }, [filteredLogs, pageIndex]);
  const hasOlderEntries = (pageIndex + 1) * LOGS_PER_PAGE < filteredLogs.length;
  const filterToggleStyle: CSSProperties = {
    justifyContent: "center",
  };
  const paginationStyle: CSSProperties = {
    justifyContent: "flex-end",
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
          <Card className="client-workout-history-hero" variant="accent" as="section">
            <PageHeader
              eyebrow="Client training"
              title="Log History"
              description="Review all saved workout entries from newest to oldest."
              chips={[`${filteredLogs.length} entr${filteredLogs.length === 1 ? "y" : "ies"}`]}
              actions={
                <ActionRow>
                  <Link className="link-button" href="/client">
                    Client home
                  </Link>
                </ActionRow>
              }
            />
          </Card>

          <SectionBlock
            eyebrow="Filter station"
            title="Refine history"
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

          <SectionBlock
            eyebrow="Read only"
            title="Saved workout logs"
            description="Review structured workout entries in newest-to-oldest order."
          >
            {filteredLogs.length === 0 ? (
              <EmptyState
                title="No logged workouts yet."
                message="Saved workout logs will appear here after you complete a workout through the current logging flow."
              />
            ) : (
              <>
                <WorkoutHistoryList logs={visibleLogs} />
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
              </>
            )}
          </SectionBlock>
        </>
      ) : null}
    </PageShell>
  );
}
