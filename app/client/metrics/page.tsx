"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
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

function getMetricIcon(label: string) {
  switch (label.toLowerCase()) {
    case "intake":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 6h10l2 4-7 8-7-8 2-4Zm0 0 5 6 5-6" />
        </svg>
      );
    case "expenditure":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 17V9m6 8V6m6 11v-5" />
        </svg>
      );
    case "net balance":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 12h10m-5-5 5 5-5 5" />
        </svg>
      );
    case "deficit progress":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 16.5 10 12.5l3 2 5-6" />
          <path d="M18 8.5v4h-4" />
        </svg>
      );
    default:
      return null;
  }
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

  if (status === "loading") {
    return <LoadingBlock title="Loading metrics workspace" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client metrics require an authenticated client session." />;
  }

  const errorMessages = Object.values(sectionErrors).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  const allSectionsFailed = !loading && !view.hasAnyData && errorMessages.length === 2;
  const showLoadingState = loading && !view.hasAnyData && errorMessages.length === 0;

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="My Week"
      subtitle="Client metrics stay inside the existing BFF routes and only show overview and history values the backend already provides."
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
            eyebrow="My Week"
            title="Week summary"
            description="Summary cards reflect only the current client metrics overview or the latest history snapshot already returned by the BFF."
          >
            {view.hasOverview ? (
              view.summaryCards.map((item) => (
                <MobileStatCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  progressText={item.hint}
                  icon={getMetricIcon(item.label)}
                />
              ))
            ) : (
              <MetricsStateCard
                title={sectionErrors.overview ? "Overview unavailable" : "No overview yet"}
                message={
                  sectionErrors.overview ??
                  "Your current client metrics overview will appear here when the active overview or latest history snapshot exposes real values."
                }
              />
            )}
          </MobileSection>

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
            eyebrow="History"
            title="History and log summary"
            description="Recent weekly history cards render only from real history rows already returned by the current metrics history route."
          >
            {view.hasHistory ? (
              <div className="mobile-client-metrics-history-grid">
                {view.historyMetrics
                  .filter((item) => item.hasData)
                  .map((item) => (
                    <MobileCard key={item.id} as="article" variant="image" className="mobile-client-metrics-history-card">
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
                  ))}
              </div>
            ) : (
              <MetricsStateCard
                title={sectionErrors.history ? "History unavailable" : "No history yet"}
                message={
                  sectionErrors.history ??
                  "Weekly history cards will appear here when the current client metrics history route returns real weeks."
                }
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="All Metrics"
            title="All metrics"
            description="Grouped metric cards expose the current intake, expenditure, targets, deficit, and freshness fields without inventing unsupported analytics."
          >
            {view.detailGroups.length > 0 ? (
              <div className="mobile-client-metrics-grid">
                {view.detailGroups.map((group) => (
                  <MobileCard key={group.title} as="article" variant="soft" className="mobile-client-metrics-detail-card">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">{group.eyebrow}</p>
                      <h3 className="mobile-section__title">{group.title}</h3>
                    </div>
                    <dl className="mobile-client-metrics-detail-list">
                      {group.items.map((item) => (
                        <div key={`${group.title}-${item.label}`}>
                          <dt>{item.label}</dt>
                          <dd>{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </MobileCard>
                ))}
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
    </MobileAppShell>
  );
}
