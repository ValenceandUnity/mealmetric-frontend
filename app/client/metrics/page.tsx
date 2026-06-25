"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import type { MobileMetricHistoryView } from "@/lib/view-models/metrics";
import { adaptMetricsView } from "@/lib/view-models/metrics";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type MetricsJsonApiResponse = ApiResponse<JsonValue>;

type SectionErrors = {
  overview: string | null;
  history: string | null;
};

const EMPTY_SECTION_ERRORS: SectionErrors = {
  overview: null,
  history: null,
};

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type MetricsStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

type HistoryDialogFilters = {
  draftSearchQuery: string;
  activeSearchQuery: string;
  startDate: string;
  endDate: string;
};

type MetricAccordionKey = "intake" | "expenditure" | "deficit" | "target";

type MetricAccordionConfig = {
  key: MetricAccordionKey;
  sourceTitle: string;
  title: string;
  buttonId: string;
  panelId: string;
  className: string;
};

const METRIC_ACCORDION_CONFIG: MetricAccordionConfig[] = [
  {
    key: "intake",
    sourceTitle: "Intake",
    title: "INTAKE",
    buttonId: "client-metrics-intake-trigger",
    panelId: "client-metrics-intake-panel",
    className: "mobile-client-metrics-accordion-card mobile-client-metrics-accordion-card--intake",
  },
  {
    key: "expenditure",
    sourceTitle: "Expenditure",
    title: "EXPENDITURE",
    buttonId: "client-metrics-expenditure-trigger",
    panelId: "client-metrics-expenditure-panel",
    className: "mobile-client-metrics-accordion-card mobile-client-metrics-accordion-card--expenditure",
  },
  {
    key: "deficit",
    sourceTitle: "Deficit",
    title: "DEFICIT",
    buttonId: "client-metrics-deficit-trigger",
    panelId: "client-metrics-deficit-panel",
    className: "mobile-client-metrics-accordion-card mobile-client-metrics-accordion-card--deficit",
  },
  {
    key: "target",
    sourceTitle: "Targets",
    title: "TARGET",
    buttonId: "client-metrics-target-trigger",
    panelId: "client-metrics-target-panel",
    className: "mobile-client-metrics-accordion-card mobile-client-metrics-accordion-card--target",
  },
];

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function MetricsStateCard({ title, message, action }: MetricsStateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-client-metrics-state-card">
      <div className="mobile-section__copy">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

function formatAccordionMetricLabel(groupTitle: string, itemLabel: string) {
  const normalizedGroupTitle = groupTitle.toLowerCase();
  const normalizedItemLabel = itemLabel.toLowerCase();

  if (normalizedGroupTitle === "intake") {
    if (normalizedItemLabel === "total intake calories") {
      return "Total Calorie Intake";
    }

    if (normalizedItemLabel === "current intake ceiling") {
      return "Current Intake Ceiling";
    }
  }

  if (normalizedGroupTitle === "expenditure") {
    if (normalizedItemLabel === "total expenditure calories") {
      return "Total Calorie Expenditure";
    }

    if (normalizedItemLabel === "current expenditure floor") {
      return "Current Expenditure Floor";
    }
  }

  if (normalizedGroupTitle === "deficit") {
    if (normalizedItemLabel === "net calorie balance") {
      return "Net Calorie Balance";
    }

    if (normalizedItemLabel === "weekly target deficit") {
      return "Weekly Target Deficit";
    }

    if (normalizedItemLabel === "deficit progress") {
      return "Deficit Progress";
    }
  }

  if (normalizedGroupTitle === "targets") {
    if (normalizedItemLabel === "week range") {
      return "Week Range";
    }

    if (normalizedItemLabel === "as of date") {
      return "As Of Date";
    }

    if (normalizedItemLabel === "timezone") {
      return "Timezone";
    }
  }

  return itemLabel;
}

function buildHistorySearchText(item: MobileMetricHistoryView) {
  return [
    item.dateLabel,
    item.rangeLabel,
    item.progressLabel,
    ...item.metrics.flatMap((metric) => [metric.label, metric.value]),
  ]
    .join(" ")
    .toLowerCase();
}

function getHistoryRangeBounds(item: MobileMetricHistoryView) {
  const fallbackDate = item.asOfDate ?? null;

  return {
    start: item.weekStartDate ?? fallbackDate,
    end: item.weekEndDate ?? fallbackDate,
  };
}

function historyMatchesSelectedDates(
  item: MobileMetricHistoryView,
  startDate: string,
  endDate: string,
) {
  if (!startDate && !endDate) {
    return true;
  }

  const bounds = getHistoryRangeBounds(item);

  if (!bounds.start || !bounds.end) {
    return false;
  }

  if (startDate && bounds.end < startDate) {
    return false;
  }

  if (endDate && bounds.start > endDate) {
    return false;
  }

  return true;
}

export default function ClientMetricsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [overviewData, setOverviewData] = useState<JsonValue | null>(null);
  const [historyData, setHistoryData] = useState<JsonValue | null>(null);
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>(EMPTY_SECTION_ERRORS);
  const [loading, setLoading] = useState(true);
  const [openAccordion, setOpenAccordion] = useState<MetricAccordionKey | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyFilters, setHistoryFilters] = useState<HistoryDialogFilters>({
    draftSearchQuery: "",
    activeSearchQuery: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setSectionErrors(EMPTY_SECTION_ERRORS);

      try {
        const [overviewResult, historyResult] = await Promise.allSettled([
          fetch("/api/client/metrics/overview", { cache: "no-store" }).then(
            (response) => response.json() as Promise<MetricsJsonApiResponse>,
          ),
          fetch("/api/client/metrics/history", { cache: "no-store" }).then(
            (response) => response.json() as Promise<MetricsJsonApiResponse>,
          ),
        ]);

        if (!active) {
          return;
        }

        const nextErrors: SectionErrors = { ...EMPTY_SECTION_ERRORS };

        if (overviewResult.status === "fulfilled") {
          if (overviewResult.value.ok) {
            setOverviewData(overviewResult.value.data);
          } else {
            nextErrors.overview = overviewResult.value.error.message ?? "Unable to load client metrics overview.";
            setOverviewData(null);
          }
        } else {
          nextErrors.overview = "Unable to load client metrics overview.";
          setOverviewData(null);
        }

        if (historyResult.status === "fulfilled") {
          if (historyResult.value.ok) {
            setHistoryData(historyResult.value.data);
          } else {
            nextErrors.history = historyResult.value.error.message ?? "Unable to load client metrics history.";
            setHistoryData(null);
          }
        } else {
          nextErrors.history = "Unable to load client metrics history.";
          setHistoryData(null);
        }

        setSectionErrors(nextErrors);
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

  const view = useMemo(
    () => adaptMetricsView({
      overview: overviewData,
      history: historyData,
    }),
    [historyData, overviewData],
  );

  const errorMessages = Object.values(sectionErrors).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  const allSectionsFailed = !loading && !view.hasAnyData && errorMessages.length === 2;
  const showLoadingState = loading && !view.hasAnyData && errorMessages.length === 0;
  const accordionGroups = METRIC_ACCORDION_CONFIG.map((item) => ({
    ...item,
    group: view.detailGroups.find((group) => group.title === item.sourceTitle) ?? null,
  })).filter((item) => item.group !== null);
  const loadedHistoryRows = view.historyMetrics.filter((item) => item.hasData);
  const filteredHistoryRows = loadedHistoryRows.filter((item) => {
    if (
      historyFilters.activeSearchQuery &&
      !buildHistorySearchText(item).includes(historyFilters.activeSearchQuery.toLowerCase())
    ) {
      return false;
    }

    return historyMatchesSelectedDates(item, historyFilters.startDate, historyFilters.endDate);
  });
  const hasActiveHistoryFilters =
    historyFilters.activeSearchQuery.length > 0 ||
    historyFilters.startDate.length > 0 ||
    historyFilters.endDate.length > 0;

  useEffect(() => {
    if (!isHistoryDialogOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsHistoryDialogOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHistoryDialogOpen]);

  function openHistoryDialog() {
    setHistoryFilters({
      draftSearchQuery: "",
      activeSearchQuery: "",
      startDate: "",
      endDate: "",
    });
    setIsHistoryDialogOpen(true);
  }

  function closeHistoryDialog() {
    setIsHistoryDialogOpen(false);
  }

  if (status === "loading") {
    return <LoadingBlock title="Loading metrics workspace" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client metrics require an authenticated client session." />;
  }

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="Metrics"
      subtitle="Track intake, output, deficit, and targets from your current client metrics snapshot."
      notificationSlot={<ActionPill href="/client" tone="purple">Client home</ActionPill>}
      topHubAction={<ActionPill href="/client/add-log">Add log</ActionPill>}
      activePath="/client/metrics"
    >
      {allSectionsFailed ? (
        <MobileSection
          eyebrow="Metrics sync"
          title="Client metrics unavailable"
          description="This page stays on protected frontend-to-BFF metric routes and does not fall back to direct backend calls."
        >
          <MetricsStateCard
            title="Unable to load metrics"
            message={errorMessages.join(" ")}
            action={<ActionPill href="/client">Back home</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading your metrics"
          description="Fetching current overview and history slices through the existing client BFF routes."
        >
          <MetricsStateCard
            title="Refreshing metrics"
            message="Your weekly overview and history are loading through the protected frontend-to-BFF path."
          />
        </MobileSection>
      ) : null}

      {!showLoadingState && !allSectionsFailed ? (
        <>
          {errorMessages.length > 0 && view.hasAnyData ? (
            <MobileSection
              eyebrow="Partial data"
              title="Some metrics are unavailable"
              description="This page keeps the slices that loaded instead of inventing missing analytics."
            >
              <MetricsStateCard
                title="Partial client metrics data"
                message={errorMessages.join(" ")}
              />
            </MobileSection>
          ) : null}

          <MobileSection
            eyebrow="Deficit"
            title="Calorie balance and target"
            description="The progress meter uses only the current deficit values and target already present in the client metrics snapshot."
          >
            {view.progress.hasData ? (
              <MobileCard as="article" variant="accent" className="mobile-client-metrics-progress-card">
                <div className="mobile-client-metrics-progress-summary">
                  <div className="mobile-section__copy">
                    <p className="mobile-section__eyebrow">{view.progress.label}</p>
                    <h3 className="mobile-section__title">{view.progress.progressLabel}</h3>
                    <p className="mobile-section__description">{view.progress.statusLabel}</p>
                  </div>
                  <p className="mobile-client-metrics-progress-range">{view.progress.rangeLabel}</p>
                </div>

                <div
                  className="mobile-client-metrics-progress-track"
                  aria-label={`${view.progress.label}: ${view.progress.progressLabel}. ${view.progress.targetLabel}. ${view.progress.supportLabel}.`}
                >
                  <div className="mobile-client-metrics-progress-bar" aria-hidden="true">
                    <div
                      className="mobile-client-metrics-progress-fill"
                      style={{
                        "--mobile-progress": `${Math.max(0, Math.min(100, view.progress.progressValue ?? 0))}%`,
                        width: `${Math.max(0, Math.min(100, view.progress.progressValue ?? 0))}%`,
                      } as CSSProperties}
                    />
                  </div>
                </div>

                <dl className="mobile-client-metrics-progress-meta">
                  <div>
                    <dt>Weekly target</dt>
                    <dd>{view.progress.targetLabel}</dd>
                  </div>
                  <div>
                    <dt>Net balance</dt>
                    <dd>{view.progress.supportLabel}</dd>
                  </div>
                </dl>
              </MobileCard>
            ) : (
              <MetricsStateCard
                title="Deficit progress unavailable"
                message="A progress meter will appear here when the current client metrics overview exposes weekly target and progress values."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Highlights"
            title="Weekly highlights"
            description="These highlight cards come directly from the current overview snapshot and avoid any unsupported analytics calculations."
            action={(
              <button
                type="button"
                className="mobile-client-metrics-history-action"
                onClick={openHistoryDialog}
              >
                Full Performance History
              </button>
            )}
          >
            {view.hasOverview && view.weeklyMetrics[0]?.metrics.length ? (
              <div className="mobile-client-metrics-highlight-grid">
                {view.weeklyMetrics[0].metrics.map((item) => (
                  <MobileCard key={item.label} as="article" variant="soft" className="mobile-client-metrics-highlight-card">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">{item.label}</p>
                      <h3 className="mobile-section__title">{item.value}</h3>
                    </div>
                    <p className="mobile-section__description">{view.weeklyMetrics[0].rangeLabel}</p>
                  </MobileCard>
                ))}
              </div>
            ) : (
              <MetricsStateCard
                title="No weekly highlights yet"
                message="Weekly highlight cards will appear here when overview data exposes a current-week snapshot."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="All Metrics"
            title="All metrics"
            description="Open each block to inspect the intake, expenditure, deficit, and target values already returned by your current client metrics snapshot."
          >
            {accordionGroups.length > 0 ? (
              <div className="mobile-client-metrics-accordion">
                {accordionGroups.map(({ key, title, buttonId, panelId, className, group }) => {
                  if (!group) {
                    return null;
                  }

                  const isOpen = openAccordion === key;

                  return (
                    <MobileCard key={key} as="article" variant="soft" className={className}>
                      <button
                        id={buttonId}
                        type="button"
                        className="mobile-client-metrics-accordion-trigger"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => {
                          setOpenAccordion((current) => (current === key ? null : key));
                        }}
                      >
                        <span className="mobile-client-metrics-accordion-title">{title}</span>
                        <span
                          className="mobile-client-metrics-accordion-chevron"
                          aria-hidden="true"
                          data-open={isOpen ? "true" : "false"}
                        >
                          <svg viewBox="0 0 24 24" focusable="false">
                            <path d="M7 10.5 12 15.5l5-5" />
                          </svg>
                        </span>
                      </button>

                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        className="mobile-client-metrics-accordion-panel"
                        data-open={isOpen ? "true" : "false"}
                      >
                        {isOpen ? (
                          <dl className="mobile-client-metrics-accordion-list">
                            {group.items.map((item) => (
                              <div key={`${group.title}-${item.label}`}>
                                <dt>{formatAccordionMetricLabel(group.title, item.label)}</dt>
                                <dd>{item.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                      </div>
                    </MobileCard>
                  );
                })}
              </div>
            ) : (
              <MetricsStateCard
                title="No metrics available yet"
                message="This screen stays empty until the active overview or history payload exposes real metric values."
              />
            )}
          </MobileSection>
        </>
      ) : null}

      {isHistoryDialogOpen ? (
        <div
          className="mobile-client-metrics-history-overlay"
          onClick={closeHistoryDialog}
        >
          <div
            id="client-metrics-performance-history-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-metrics-performance-history-title"
            className="mobile-client-metrics-history-dialog"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="mobile-client-metrics-history-header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Performance</p>
                <h2 id="client-metrics-performance-history-title" className="mobile-section__title">
                  Full Performance History
                </h2>
              </div>
              <button
                type="button"
                className="mobile-client-metrics-history-close"
                onClick={closeHistoryDialog}
              >
                Close
              </button>
            </div>

            <div className="mobile-client-metrics-history-search">
              <label htmlFor="client-metrics-performance-history-search" className="mobile-client-metrics-history-label">
                Search history
              </label>
              <div className="mobile-client-metrics-history-search-row">
                <input
                  id="client-metrics-performance-history-search"
                  type="text"
                  className="mobile-client-metrics-history-search-input"
                  value={historyFilters.draftSearchQuery}
                  onChange={(event) => {
                    const value = event.target.value;
                    setHistoryFilters((current) => ({
                      ...current,
                      draftSearchQuery: value,
                    }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                  }}
                />
                <button
                  type="button"
                  className="mobile-client-metrics-history-search-button"
                  aria-label="Search performance history"
                  onClick={() => {
                    setHistoryFilters((current) => ({
                      ...current,
                      activeSearchQuery: current.draftSearchQuery.trim(),
                    }));
                  }}
                >
                  <svg viewBox="0 0 24 24" focusable="false">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mobile-client-metrics-history-date-row">
              <label className="mobile-client-metrics-history-label" htmlFor="client-metrics-performance-history-start-date">
                Start date
              </label>
              <input
                id="client-metrics-performance-history-start-date"
                type="date"
                value={historyFilters.startDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setHistoryFilters((current) => ({
                    ...current,
                    startDate: value,
                  }));
                }}
              />

              <label className="mobile-client-metrics-history-label" htmlFor="client-metrics-performance-history-end-date">
                End date
              </label>
              <input
                id="client-metrics-performance-history-end-date"
                type="date"
                value={historyFilters.endDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setHistoryFilters((current) => ({
                    ...current,
                    endDate: value,
                  }));
                }}
              />
            </div>

            {hasActiveHistoryFilters ? (
              <button
                type="button"
                className="mobile-client-metrics-history-clear"
                onClick={() => {
                  setHistoryFilters({
                    draftSearchQuery: "",
                    activeSearchQuery: "",
                    startDate: "",
                    endDate: "",
                  });
                }}
              >
                Clear filters
              </button>
            ) : null}

            <div className="mobile-client-metrics-history-results">
              {loadedHistoryRows.length === 0 ? (
                <MobileCard as="div" variant="soft" className="mobile-client-metrics-history-empty">
                  <p>No performance history available yet.</p>
                </MobileCard>
              ) : filteredHistoryRows.length === 0 ? (
                <MobileCard as="div" variant="soft" className="mobile-client-metrics-history-empty">
                  <p>No performance history matches those filters.</p>
                </MobileCard>
              ) : (
                filteredHistoryRows.map((item) => (
                  <MobileCard key={item.id} as="article" variant="image" className="mobile-client-metrics-history-result-card">
                    <div className="mobile-client-metrics-history-header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">{item.rangeLabel}</p>
                        <h3 className="mobile-section__title">{item.dateLabel}</h3>
                      </div>
                      <span className="mobile-pill mobile-pill--yellow">{item.progressLabel}</span>
                    </div>
                    <dl className="mobile-client-metrics-history-meta">
                      {item.metrics.map((metric) => (
                        <div key={`${item.id}-${metric.label}`}>
                          <dt>{metric.label}</dt>
                          <dd>{metric.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </MobileCard>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </MobileAppShell>
  );
}
