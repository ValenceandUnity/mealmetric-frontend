"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import {
  adaptClientHistoryView,
  type ClientHistoryModeFilter,
  type MobileClientWorkoutLogCardView,
} from "@/lib/view-models/client-history";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type WorkoutHistoryResponse = ApiResponse<JsonValue>;

export type ClientHistoryRouteSurfaceProps = {
  activePath: string;
  backHref: string;
  backLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  sectionTitle: string;
  sectionDescription: string;
  showHistoryUtility?: boolean;
  showDateArchive?: boolean;
  showTypeFilter?: boolean;
  historyUtilityVariant?: "default" | "hidden";
};

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type StateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};
type HistoryArchiveBlockView = {
  id: string;
  label: string;
  rows: MobileClientWorkoutLogCardView[];
};

const HISTORY_API_PATH = "/api/client/training/workout-logs";
const PAGE_LIMIT = 30;

const FILTER_OPTIONS: Array<{ value: ClientHistoryModeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "rep", label: "Rep" },
  { value: "set", label: "Set" },
  { value: "general_workout", label: "General Workout" },
];
const weekLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function StateCard({ title, message, action }: StateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-training-state-card">
      <div className="mobile-section__copy">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-training-action-row">{action}</div> : null}
    </MobileCard>
  );
}

function parseDateKey(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  const [yearValue, monthValue, dayValue] = dateKey.split("-").map(Number);
  const parsed = new Date(yearValue, monthValue - 1, dayValue);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== yearValue ||
    parsed.getMonth() !== monthValue - 1 ||
    parsed.getDate() !== dayValue
  ) {
    return null;
  }

  return parsed;
}

function addDays(date: Date, count: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + count);
  return next;
}

function formatDateKey(date: Date): string {
  const yearValue = String(date.getFullYear());
  const monthValue = String(date.getMonth() + 1).padStart(2, "0");
  const dayValue = String(date.getDate()).padStart(2, "0");
  return `${yearValue}-${monthValue}-${dayValue}`;
}

function formatWeekLabel(startDate: Date, customLabel?: string): string {
  if (customLabel) {
    return customLabel;
  }

  return `Week of ${weekLabelFormatter.format(startDate)}`;
}

function isDateKeyInRange(dateKey: string, startDate: Date, endDate: Date): boolean {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return false;
  }

  return parsed >= startDate && parsed <= endDate;
}

function getStartOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return addDays(date, mondayOffset);
}

export function ClientHistoryRouteSurface({
  activePath,
  backHref,
  backLabel,
  pageTitle,
  pageSubtitle,
  sectionTitle,
  sectionDescription,
  showHistoryUtility = true,
  showDateArchive = false,
  showTypeFilter = true,
  historyUtilityVariant = "default",
}: ClientHistoryRouteSurfaceProps) {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [historyData, setHistoryData] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ClientHistoryModeFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [archiveStartDate, setArchiveStartDate] = useState("");
  const [archiveEndDate, setArchiveEndDate] = useState("");
  const [openArchiveBlockId, setOpenArchiveBlockId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const effectiveTypeFilter = showTypeFilter ? typeFilter : "all";

  useEffect(() => {
    if (!showTypeFilter && typeFilter !== "all") {
      setTypeFilter("all");
    }
  }, [showTypeFilter, typeFilter]);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
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

        if (effectiveTypeFilter !== "all") {
          params.set("mode", effectiveTypeFilter);
        }

        if (normalizedSearch.length > 0) {
          params.set("search", normalizedSearch);
        }

        const response = await fetch(`${HISTORY_API_PATH}?${params.toString()}`, {
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
      } catch {
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
  }, [effectiveTypeFilter, offset, searchValue, status, user]);

  const historyView = useMemo(() => adaptClientHistoryView(historyData), [historyData]);
  const shouldShowHistoryUtility =
    historyUtilityVariant !== "hidden" && showHistoryUtility;
  const archiveRangeState = useMemo(() => {
    const hasStartDate = archiveStartDate.length > 0;
    const hasEndDate = archiveEndDate.length > 0;

    if (!hasStartDate && !hasEndDate) {
      return {
        helperMessage: null,
        rangeStart: null as Date | null,
        rangeEnd: null as Date | null,
        useCustomRange: false,
      };
    }

    if (!hasStartDate || !hasEndDate) {
      return {
        helperMessage: "Select both start and end dates to build archive weeks.",
        rangeStart: null as Date | null,
        rangeEnd: null as Date | null,
        useCustomRange: false,
      };
    }

    const parsedStartDate = parseDateKey(archiveStartDate);
    const parsedEndDate = parseDateKey(archiveEndDate);

    if (!parsedStartDate || !parsedEndDate || parsedStartDate > parsedEndDate) {
      return {
        helperMessage: "Start date must be before end date.",
        rangeStart: null as Date | null,
        rangeEnd: null as Date | null,
        useCustomRange: false,
      };
    }

    return {
      helperMessage: null,
      rangeStart: parsedStartDate,
      rangeEnd: parsedEndDate,
      useCustomRange: true,
    };
  }, [archiveEndDate, archiveStartDate]);
  const archiveBlocks = useMemo<HistoryArchiveBlockView[]>(() => {
    if (!showDateArchive) {
      return [];
    }

    const buildBlock = ({
      id,
      label,
      startDate,
      endDate,
    }: {
      id: string;
      label: string;
      startDate: Date;
      endDate: Date;
    }): HistoryArchiveBlockView => ({
      id,
      label,
      rows: historyView.rows.filter((row) => isDateKeyInRange(row.performedAtDateKey, startDate, endDate)),
    });

    if (archiveRangeState.useCustomRange && archiveRangeState.rangeStart && archiveRangeState.rangeEnd) {
      const blocks: HistoryArchiveBlockView[] = [];
      let blockStartDate = archiveRangeState.rangeStart;

      while (blockStartDate <= archiveRangeState.rangeEnd) {
        const blockEndDateCandidate = addDays(blockStartDate, 6);
        const blockEndDate =
          blockEndDateCandidate <= archiveRangeState.rangeEnd
            ? blockEndDateCandidate
            : archiveRangeState.rangeEnd;

        blocks.push(
          buildBlock({
            id: `archive-week-${formatDateKey(blockStartDate)}`,
            label: formatWeekLabel(blockStartDate),
            startDate: blockStartDate,
            endDate: blockEndDate,
          }),
        );

        blockStartDate = addDays(blockStartDate, 7);
      }

      return blocks;
    }

    const today = new Date();
    const thisWeekStart = getStartOfWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const lastWeekStart = addDays(thisWeekStart, -7);

    return [
      buildBlock({
        id: "archive-this-week",
        label: formatWeekLabel(thisWeekStart, "This Week"),
        startDate: thisWeekStart,
        endDate: addDays(thisWeekStart, 6),
      }),
      buildBlock({
        id: "archive-last-week",
        label: formatWeekLabel(lastWeekStart, "Last Week"),
        startDate: lastWeekStart,
        endDate: addDays(lastWeekStart, 6),
      }),
    ];
  }, [archiveRangeState, historyView.rows, showDateArchive]);

  useEffect(() => {
    if (openArchiveBlockId && !archiveBlocks.some((block) => block.id === openArchiveBlockId)) {
      setOpenArchiveBlockId(null);
    }
  }, [archiveBlocks, openArchiveBlockId]);

  if (status === "loading") {
    return <LoadingBlock title="Loading workout history" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Workout history requires an authenticated client session." />;
  }

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title={pageTitle}
      subtitle={pageSubtitle}
      notificationSlot={<ActionPill href={backHref} tone="purple">{backLabel}</ActionPill>}
      activePath={activePath}
    >
      {loading ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading history"
          description="Fetching saved workout logs through the protected client route."
        >
          <StateCard
            title="Refreshing workout history"
            message="This mobile history utility is waiting on the current signed frontend-to-BFF responses."
          />
        </MobileSection>
      ) : null}

      {errorMessage ? (
        <MobileSection
          eyebrow="Workout history"
          title="Unable to load workout history"
          description="This client utility route stays on the existing workout-log BFF and does not fall back to direct backend calls."
        >
          <StateCard title="Unable to load workout history" message={errorMessage} />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          {shouldShowHistoryUtility ? (
            <MobileSection
              eyebrow="History utility"
              title={sectionTitle}
              description={sectionDescription}
            >
              <MobileCard as="article" variant="action" className="mobile-training-log-card">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Protected client route</p>
                  <h2 className="mobile-section__title">Workout history</h2>
                  <p className="mobile-section__description">
                    Filters, search, and older-entry pagination remain sourced only from the current client workout-log BFF route.
                  </p>
                </div>
              </MobileCard>

              {historyView.count !== null ? (
                <div className="mobile-training-meta-grid">
                  <MobileStatCard
                    label="Returned logs"
                    value={historyView.countLabel}
                    progressText={historyView.pageWindowLabel}
                  />
                  <MobileStatCard
                    label="Older entries"
                    value={historyView.olderEntriesLabel}
                    progressText={
                      historyView.hasMore
                        ? "Use the current older-entries control to advance."
                        : "This history page has no next offset."
                    }
                  />
                </div>
              ) : null}
            </MobileSection>
          ) : null}

          <MobileSection
            eyebrow="Log history"
            title="Workout history"
            description="Review and filter saved workout entries from newest to oldest."
          >
            {showTypeFilter ? (
              <div
                className="mobile-training-pill-row"
                role="radiogroup"
                aria-label="Workout type filter"
              >
                {FILTER_OPTIONS.map((option) => {
                  const active = typeFilter === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={[
                        "mobile-pill",
                        active ? "mobile-pill--yellow" : "mobile-pill--purple",
                        "mobile-focus-ring",
                      ].join(" ")}
                      onClick={() => {
                        setTypeFilter(option.value);
                        setOffset(0);
                      }}
                      aria-pressed={active}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="history-search">Search</label>
              <input
                id="history-search"
                className="mobile-focus-ring"
                type="search"
                placeholder="Search exercises, equipment, or notes"
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  setOffset(0);
                }}
              />
            </div>

            {showDateArchive ? (
              <MobileCard
                as="article"
                variant="soft"
                className="client-history-date-archive"
              >
                <div className="mobile-section__copy">
                  <h3 className="mobile-section__title">Log Archive By Date</h3>
                  <p className="mobile-section__description">
                    Select a date range to build weekly archive blocks from the loaded history.
                  </p>
                </div>
                <div className="client-history-date-archive__controls">
                  <div className="client-history-date-range-grid">
                    <div className="field">
                      <label htmlFor="archive-start-date">Start date</label>
                      <input
                        id="archive-start-date"
                        className="mobile-focus-ring"
                        type="date"
                        value={archiveStartDate}
                        onChange={(event) => {
                          setArchiveStartDate(event.target.value);
                          setOffset(0);
                        }}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="archive-end-date">End date</label>
                      <input
                        id="archive-end-date"
                        className="mobile-focus-ring"
                        type="date"
                        value={archiveEndDate}
                        onChange={(event) => {
                          setArchiveEndDate(event.target.value);
                          setOffset(0);
                        }}
                      />
                    </div>
                  </div>
                  {archiveRangeState.helperMessage ? (
                    <p className="mobile-section__description">{archiveRangeState.helperMessage}</p>
                  ) : null}
                  {archiveStartDate || archiveEndDate ? (
                    <button
                      type="button"
                      className="mobile-pill mobile-pill--purple mobile-focus-ring client-history-date-archive__clear"
                      onClick={() => {
                        setArchiveStartDate("");
                        setArchiveEndDate("");
                        setOffset(0);
                      }}
                    >
                      Clear date
                    </button>
                  ) : null}
                </div>
              </MobileCard>
            ) : null}

            {historyView.rows.length <= 0 ? (
              <StateCard
                title="No logged workouts yet."
                message="Saved workout entries will appear here once you use the current client workout logging flow."
              />
            ) : showDateArchive ? (
              <div className="stacked-list">
                {archiveBlocks.map((block) => {
                  const panelId = `${block.id}-panel`;
                  const isOpen = openArchiveBlockId === block.id;

                  return (
                    <MobileCard
                      key={block.id}
                      as="article"
                      variant="soft"
                      className="client-history-week-archive"
                    >
                      <div className="client-history-week-archive__header">
                        <div className="mobile-section__copy">
                          <h3 className="mobile-section__title">{block.label}</h3>
                          <p className="mobile-section__description">
                            {block.rows.length === 1
                              ? "1 log in the loaded archive."
                              : `${block.rows.length} logs in the loaded archive.`}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="utility-icon-link mobile-focus-ring client-history-week-archive__toggle"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          aria-label={`Toggle ${block.label} archive block`}
                          onClick={() => {
                            setOpenArchiveBlockId((current) => (current === block.id ? null : block.id));
                          }}
                        >
                          <span aria-hidden="true">{isOpen ? "v" : ">"}</span>
                        </button>
                      </div>

                      {isOpen ? (
                        <div id={panelId} className="client-history-week-archive__panel">
                          {block.rows.length > 0 ? (
                            <div className="stacked-list">
                              {block.rows.map((row) => (
                                <article key={`${block.id}-${row.id}`} className="client-history-week-data-grid">
                                  <div className="client-history-week-data-cell">
                                    <span className="mobile-section__eyebrow">Date</span>
                                    <span className="mobile-section__description">{row.performedAtLabel}</span>
                                  </div>
                                  <div className="client-history-week-data-cell">
                                    <span className="mobile-section__eyebrow">Exercise</span>
                                    <span className="mobile-section__description">{row.exerciseName}</span>
                                  </div>
                                  <div className="client-history-week-data-cell">
                                    <span className="mobile-section__eyebrow">Sets</span>
                                    <span className="mobile-section__description">{row.sets}</span>
                                  </div>
                                  <div className="client-history-week-data-cell">
                                    <span className="mobile-section__eyebrow">Reps</span>
                                    <span className="mobile-section__description">{row.reps}</span>
                                  </div>
                                  <div className="client-history-week-data-cell">
                                    <span className="mobile-section__eyebrow">Weight</span>
                                    <span className="mobile-section__description">{row.weight}</span>
                                  </div>
                                  <div className="client-history-week-data-cell">
                                    <span className="mobile-section__eyebrow">Time</span>
                                    <span className="mobile-section__description">{row.duration}</span>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="mobile-section__description">No logs in this range.</p>
                          )}
                        </div>
                      ) : null}
                    </MobileCard>
                  );
                })}
              </div>
            ) : (
              <div className="stacked-list">
                {historyView.rows.map((row, index) => (
                  <MobileCard
                    key={row.id}
                    as="article"
                    variant={index === 0 ? "accent" : "soft"}
                    className="mobile-training-checklist-card"
                  >
                    <div className="mobile-training-checklist-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">{row.performedAtLabel}</p>
                        <h3 className="mobile-section__title">{row.exerciseName}</h3>
                        <p className="mobile-section__description">Notes: {row.notes}</p>
                      </div>
                      <span className="mobile-pill mobile-pill--yellow">{row.typeLabel}</span>
                    </div>

                    <div className="mobile-training-pill-row" aria-label={`${row.exerciseName} preview`}>
                      <span className="mobile-pill">Sets {row.sets}</span>
                      <span className="mobile-pill">Reps {row.reps}</span>
                      <span className="mobile-pill">Weight {row.weight}</span>
                      <span className="mobile-pill">Time {row.duration}</span>
                    </div>
                  </MobileCard>
                ))}
              </div>
            )}

            <div className="mobile-training-action-row">
              <button
                type="button"
                className="utility-icon-link mobile-focus-ring"
                onClick={() => {
                  if (historyView.nextOffset !== null) {
                    setOffset(historyView.nextOffset);
                  }
                }}
                disabled={!historyView.hasMore || historyView.nextOffset === null}
                aria-label="Show older workout entries"
                title="Show older workout entries"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.97 5.97a.75.75 0 0 1 1.06 0l5.5 5.5a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 1 1-1.06-1.06L13.94 12 8.97 7.03a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
