"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import { adaptPTClientMetricsView } from "@/lib/view-models/pt-client-metrics";

type JsonApiResponse = ApiResponse<JsonValue>;

type SectionErrors = {
  detail: string | null;
  metrics: string | null;
};

const EMPTY_SECTION_ERRORS: SectionErrors = {
  detail: null,
  metrics: null,
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
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
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

export default function PTClientMetricsPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = typeof params?.clientId === "string" ? params.clientId : "";

  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [clientDetailData, setClientDetailData] = useState<JsonValue | null>(null);
  const [metricsData, setMetricsData] = useState<JsonValue | null>(null);
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>(EMPTY_SECTION_ERRORS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt" || !clientId) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setSectionErrors(EMPTY_SECTION_ERRORS);

      try {
        const [detailResult, metricsResult] = await Promise.allSettled([
          fetch(`/api/pt/clients/${clientId}`, { cache: "no-store" }).then(
            (response) => response.json() as Promise<JsonApiResponse>,
          ),
          fetch(`/api/pt/clients/${clientId}/metrics`, { cache: "no-store" }).then(
            (response) => response.json() as Promise<JsonApiResponse>,
          ),
        ]);

        if (!active) {
          return;
        }

        const nextErrors: SectionErrors = { ...EMPTY_SECTION_ERRORS };

        if (detailResult.status === "fulfilled") {
          if (detailResult.value.ok) {
            setClientDetailData(detailResult.value.data);
          } else {
            nextErrors.detail = detailResult.value.error.message ?? "Unable to load client detail.";
            setClientDetailData(null);
          }
        } else {
          nextErrors.detail = "Unable to load client detail.";
          setClientDetailData(null);
        }

        if (metricsResult.status === "fulfilled") {
          if (metricsResult.value.ok) {
            setMetricsData(metricsResult.value.data);
          } else {
            nextErrors.metrics = metricsResult.value.error.message ?? "Unable to load client metrics.";
            setMetricsData(null);
          }
        } else {
          nextErrors.metrics = "Unable to load client metrics.";
          setMetricsData(null);
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
  }, [clientId, status, user]);

  const view = useMemo(
    () => adaptPTClientMetricsView({
      clientId,
      detail: clientDetailData,
      metrics: metricsData,
    }),
    [clientDetailData, clientId, metricsData],
  );

  if (status === "loading") {
    return <LoadingBlock title="Loading client metrics" message="Validating your BFF-managed PT session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT client metrics require an authenticated PT session." />;
  }

  const errorMessages = Object.values(sectionErrors).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  const allSectionsFailed = !loading && !view.hasAnyData && errorMessages.length > 0;
  const showLoadingState = loading && !view.hasAnyData && errorMessages.length === 0;
  const currentWeek = view.weeklyMetrics[0] ?? null;
  const subtitle = `${view.summary.clientDisplayLabel} | ${view.summary.clientEmail}`;

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="Client Metrics"
      subtitle={subtitle}
      notificationSlot={<ActionPill href={view.actions.clientsHref} tone="purple">Back to clients</ActionPill>}
      topHubAction={<ActionPill href={view.actions.assignHref}>Assign training</ActionPill>}
      activePath="/pt/clients"
    >
      {allSectionsFailed ? (
        <MobileSection
          eyebrow="Metrics sync"
          title="PT client metrics unavailable"
          description="This page stays on the current protected PT detail and metrics BFF routes and does not fall back to direct backend calls."
        >
          <MetricsStateCard
            title="Unable to load client metrics"
            message={errorMessages.join(" ")}
            action={<ActionPill href={view.actions.clientsHref}>Back to client portal</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading client metrics"
          description="Fetching client context and the latest nutrition snapshot through the existing protected PT routes."
        >
          <MetricsStateCard
            title="Refreshing PT client metrics"
            message="This mobile PT metrics surface is waiting on the current signed frontend-to-BFF responses."
          />
        </MobileSection>
      ) : null}

      {!showLoadingState && !allSectionsFailed ? (
        <>
          {errorMessages.length > 0 && view.hasAnyData ? (
            <MobileSection
              eyebrow="Partial data"
              title="Some PT metric sources are unavailable"
              description="This page keeps the PT route data that loaded instead of inventing unsupported nutrition values."
            >
              <MetricsStateCard
                title="Partial PT client metrics data"
                message={errorMessages.join(" ")}
              />
            </MobileSection>
          ) : null}

          <MobileSection
            eyebrow="PT client metrics"
            title="Client summary"
            description="Identity and snapshot context come only from the existing PT client detail and metrics routes."
            action={<ActionPill href={view.actions.overviewHref} tone="purple">Client workspace</ActionPill>}
          >
            {view.hasClientContext ? (
              <MobileCard as="article" variant="action" className="mobile-pt-detail-hero">
                <div className="mobile-pt-client-card__header">
                  <div className="mobile-section__copy">
                    <p className="mobile-section__eyebrow">Linked client</p>
                    <h2 className="mobile-section__title">{view.summary.clientDisplayLabel}</h2>
                    <p className="mobile-section__description">{view.summary.clientEmail}</p>
                  </div>
                  <span className="mobile-pill mobile-pill--purple">{view.summary.clientStatusLabel}</span>
                </div>

                <p className="mobile-section__description">{view.summary.summaryText}</p>

                <dl className="mobile-pt-fact-grid">
                  {view.summary.factRows.map((item) => (
                    <div key={`${item.label}-${item.value}`}>
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </MobileCard>
            ) : (
              <MetricsStateCard
                title={sectionErrors.detail ? "Client context unavailable" : "No client context yet"}
                message={
                  sectionErrors.detail ??
                  "PT client context will appear here once the existing client detail route returns a linked-client payload."
                }
                action={<ActionPill href={view.actions.clientsHref}>Back to client portal</ActionPill>}
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Snapshot"
            title="Snapshot summary"
            description="These cards reflect only the latest PT nutrition snapshot already returned by the current protected metrics path."
            action={<ActionPill href={view.actions.logHistoryHref} tone="purple">Log history</ActionPill>}
          >
            {sectionErrors.metrics && !view.hasMetrics ? (
              <MetricsStateCard title="Metrics unavailable" message={sectionErrors.metrics} />
            ) : (
              <>
                {sectionErrors.metrics && view.hasMetrics ? (
                  <MetricsStateCard
                    title="Metrics route degraded"
                    message={`${sectionErrors.metrics} Showing snapshot fields already present on the PT client detail payload.`}
                  />
                ) : null}

                {view.hasMetrics ? (
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
                    title="No metrics snapshot yet"
                    message="The current PT detail and metrics routes did not return a usable nutrition snapshot for this linked client."
                  />
                )}
              </>
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Deficit"
            title="Deficit target"
            description="The progress meter uses only the current weekly deficit and net-balance values already present on the returned PT nutrition snapshot."
          >
            {view.hasMetrics && view.progress.hasData ? (
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
                message="A progress meter will appear here when the current PT metrics snapshot exposes weekly target and progress values."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Current week"
            title="Week window"
            description="These highlight cards come directly from the current PT snapshot and avoid unsupported browser-side nutrition calculations."
          >
            {currentWeek?.hasData && currentWeek.metrics.length > 0 ? (
              <div className="mobile-client-metrics-highlight-grid">
                {currentWeek.metrics.map((item) => (
                  <MobileCard key={item.label} as="article" variant="soft" className="mobile-client-metrics-highlight-card">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">{item.label}</p>
                      <h3 className="mobile-section__title">{item.value}</h3>
                    </div>
                    <p className="mobile-section__description">{currentWeek.rangeLabel}</p>
                  </MobileCard>
                ))}
              </div>
            ) : (
              <MetricsStateCard
                title="No weekly metrics yet"
                message="Weekly highlight cards will appear here when the current PT metrics snapshot exposes a usable week window."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="All Metrics"
            title="All metrics"
            description="Grouped metric cards expose only the current intake, expenditure, target, deficit, and freshness fields already returned by the PT BFF."
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
                message="This screen stays empty until the current PT detail or metrics payload exposes real nutrition fields."
              />
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
