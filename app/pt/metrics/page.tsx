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
import type { ApiResponse, JsonValue, PTDashboardResponse } from "@/lib/types/api";
import { adaptPTMetricsView } from "@/lib/view-models/pt-dashboard";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type PTDashboardApiResponse = ApiResponse<PTDashboardResponse>;
type PTRosterClientsApiResponse = ApiResponse<JsonValue>;

type SectionErrors = {
  dashboard: string | null;
  rosterClients: string | null;
};

const EMPTY_SECTION_ERRORS: SectionErrors = {
  dashboard: null,
  rosterClients: null,
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

function getMetricsIcon(label: string) {
  switch (label.toLowerCase()) {
    case "linked clients":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4.5 19a4.5 4.5 0 0 1 9 0m2.5 0a3.5 3.5 0 0 1 4 0" />
        </svg>
      );
    case "active clients":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 12.5 10 16l8-9" />
        </svg>
      );
    case "assignments":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5h8a2 2 0 0 1 2 2v11l-4-2-4 2-4-2-4 2V7a2 2 0 0 1 2-2h4Z" />
          <path d="M9 9h6m-6 3h5" />
        </svg>
      );
    case "workout logs":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 5.5h7l3 3V18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-12.5Zm2 5h6m-6 3h6" />
        </svg>
      );
    case "clients with activity":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 13h4l2-4 3 7 2-3h3" />
        </svg>
      );
    case "latest activity":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 7v5l3 2" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    default:
      return null;
  }
}

export default function PTMetricsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [dashboardData, setDashboardData] = useState<PTDashboardResponse | null>(null);
  const [rosterClientsData, setRosterClientsData] = useState<JsonValue | null>(null);
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>(EMPTY_SECTION_ERRORS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setSectionErrors(EMPTY_SECTION_ERRORS);

      try {
        const [dashboardResult, rosterClientsResult] = await Promise.allSettled([
          fetch("/api/pt/dashboard", { cache: "no-store" }).then(
            (response) => response.json() as Promise<PTDashboardApiResponse>,
          ),
          fetch("/api/pt/clients", { cache: "no-store" }).then(
            (response) => response.json() as Promise<PTRosterClientsApiResponse>,
          ),
        ]);

        if (!active) {
          return;
        }

        const nextErrors: SectionErrors = { ...EMPTY_SECTION_ERRORS };

        if (dashboardResult.status === "fulfilled") {
          if (dashboardResult.value.ok) {
            setDashboardData(dashboardResult.value.data);
          } else {
            nextErrors.dashboard = dashboardResult.value.error.message ?? "Unable to load PT dashboard data.";
            setDashboardData(null);
          }
        } else {
          nextErrors.dashboard = "Unable to load PT dashboard data.";
          setDashboardData(null);
        }

        if (rosterClientsResult.status === "fulfilled") {
          if (rosterClientsResult.value.ok) {
            setRosterClientsData(rosterClientsResult.value.data);
          } else {
            nextErrors.rosterClients = rosterClientsResult.value.error.message ?? "Unable to load PT client roster data.";
            setRosterClientsData(null);
          }
        } else {
          nextErrors.rosterClients = "Unable to load PT client roster data.";
          setRosterClientsData(null);
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
    () => adaptPTMetricsView({
      dashboard: dashboardData,
      rosterClients: rosterClientsData,
    }),
    [dashboardData, rosterClientsData],
  );

  if (status === "loading") {
    return <LoadingBlock title="Loading PT metrics" message="Validating your BFF-managed PT session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT metrics require an authenticated PT session." />;
  }

  const errorMessages = Object.values(sectionErrors).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  const allSectionsFailed = !loading && !view.hasAnyData && errorMessages.length > 0;
  const showLoadingState = loading && !view.hasAnyData && errorMessages.length === 0;

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="Progress Reports"
      subtitle="PT metrics stay inside the current dashboard and linked-client BFF routes, with no direct backend access from the browser."
      notificationSlot={<ActionPill href="/pt" tone="purple">PT home</ActionPill>}
      topHubAction={<ActionPill href="/pt/clients">Open clients</ActionPill>}
      activePath="/pt/metrics"
    >
      {allSectionsFailed ? (
        <MobileSection
          eyebrow="Metrics sync"
          title="PT metrics unavailable"
          description="This surface stays on protected PT BFF routes and does not fall back to direct backend calls."
        >
          <MetricsStateCard
            title="Unable to load PT metrics"
            message={errorMessages.join(" ")}
            action={<ActionPill href="/pt/clients">Open clients</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading progress reports"
          description="Fetching PT dashboard and linked-client roster data through the current protected PT routes."
        >
          <MetricsStateCard
            title="Refreshing PT metrics"
            message="Your PT metrics landing surface is loading through the signed frontend-to-BFF path."
          />
        </MobileSection>
      ) : null}

      {!showLoadingState && !allSectionsFailed ? (
        <>
          {errorMessages.length > 0 && view.hasAnyData ? (
            <MobileSection
              eyebrow="Partial data"
              title="Some PT metric sources are unavailable"
              description="This page keeps the PT routes that succeeded instead of inventing missing analytics."
            >
              <MetricsStateCard
                title="Partial PT metrics data"
                message={errorMessages.join(" ")}
              />
            </MobileSection>
          ) : null}

          <MobileSection
            eyebrow="PT metrics"
            title="Overview"
            description="These cards reflect only real linked-client, assignment, workout-log, and metrics snapshot data already available from the current PT routes."
            action={<ActionPill href="/pt/clients" tone="purple">Client portal</ActionPill>}
          >
            {view.hasClients ? (
              view.summaryCards.map((item) => (
                <MobileStatCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  progressText={item.progressText}
                  icon={getMetricsIcon(item.label)}
                />
              ))
            ) : (
              <MetricsStateCard
                title={view.emptyState?.title ?? "PT metrics unavailable"}
                message={view.emptyState?.message ?? "PT metrics are currently surfaced through linked client detail pages."}
                action={
                  view.emptyState ? (
                    <ActionPill href={view.emptyState.actionHref}>{view.emptyState.actionLabel}</ActionPill>
                  ) : undefined
                }
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Coverage"
            title="Comparison readiness"
            description="These native-CSS progress cards show how much of the linked-client roster currently supports PT landing-page comparisons."
          >
            {view.coverageCards.length > 0 ? (
              <div className="mobile-pt-metrics-progress-grid">
                {view.coverageCards.map((item) => (
                  <MobileCard key={item.label} as="article" variant="accent" className="mobile-pt-metrics-progress-card">
                    <div className="mobile-client-metrics-progress-summary">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">{item.label}</p>
                        <h3 className="mobile-section__title">{item.valueLabel}</h3>
                        <p className="mobile-section__description">{item.progressText}</p>
                      </div>
                      <p className="mobile-client-metrics-progress-range">{item.totalLabel}</p>
                    </div>

                    <div
                      className="mobile-client-metrics-progress-track"
                      aria-label={`${item.label}: ${item.valueLabel}. ${item.totalLabel}. ${item.progressText}`}
                    >
                      <div className="mobile-client-metrics-progress-bar" aria-hidden="true">
                        <div
                          className="mobile-pt-metrics-progress-fill"
                          style={{
                            "--mobile-progress": `${Math.max(0, Math.min(100, item.progressValue ?? 0))}%`,
                            width: `${Math.max(0, Math.min(100, item.progressValue ?? 0))}%`,
                          } as CSSProperties}
                        />
                      </div>
                    </div>
                  </MobileCard>
                ))}
              </div>
            ) : (
              <MetricsStateCard
                title={view.emptyState?.title ?? "No PT comparison data yet"}
                message={
                  view.emptyState?.message ??
                  "Comparison coverage appears here after PT-linked client summaries and snapshots become available."
                }
                action={
                  view.emptyState ? (
                    <ActionPill href={view.emptyState.actionHref}>{view.emptyState.actionLabel}</ActionPill>
                  ) : undefined
                }
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Client progress"
            title="Linked client comparison cards"
            description="Open the existing linked-client metrics pages from here when a deeper progress review is needed."
          >
            {view.comparisonCards.length > 0 ? (
              view.comparisonCards.map((client) => (
                <MobileCard key={client.id} as="article" variant="action" className="mobile-pt-client-card">
                  <div className="mobile-pt-client-card__header">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">Linked client</p>
                      <h3 className="mobile-section__title">{client.clientDisplayLabel}</h3>
                      <p className="mobile-section__description">{client.clientEmail}</p>
                    </div>
                    <span className="mobile-pill mobile-pill--purple">{client.statusBadge}</span>
                  </div>

                  <dl className="mobile-pt-fact-grid">
                    <div>
                      <dt>Roster</dt>
                      <dd>{client.rosterLabel}</dd>
                    </div>
                    <div>
                      <dt>Assignments</dt>
                      <dd>{client.assignmentCountLabel}</dd>
                    </div>
                    <div>
                      <dt>Workout logs</dt>
                      <dd>{client.workoutLogCountLabel}</dd>
                    </div>
                    <div>
                      <dt>Latest activity</dt>
                      <dd>{client.latestWorkoutLabel}</dd>
                    </div>
                    <div>
                      <dt>Intake ceiling</dt>
                      <dd>{client.intakeCeilingLabel}</dd>
                    </div>
                    <div>
                      <dt>Expenditure floor</dt>
                      <dd>{client.expenditureFloorLabel}</dd>
                    </div>
                  </dl>

                  <p className="mobile-section__description">{client.metricsNote}</p>

                  <div className="mobile-pt-actions">
                    <ActionPill href={client.overviewHref}>Client detail</ActionPill>
                    <ActionPill href={client.metricsHref} tone="purple">Client metrics</ActionPill>
                  </div>
                </MobileCard>
              ))
            ) : (
              <MetricsStateCard
                title={view.emptyState?.title ?? "No linked clients yet"}
                message={
                  view.emptyState?.message ??
                  "Linked client comparison cards appear here when PT-linked client data is available."
                }
                action={
                  view.emptyState ? (
                    <ActionPill href={view.emptyState.actionHref}>{view.emptyState.actionLabel}</ActionPill>
                  ) : undefined
                }
              />
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
