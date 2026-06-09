"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, PTDashboardResponse } from "@/lib/types/api";
import { adaptPTDashboardView } from "@/lib/view-models/pt-dashboard";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type PTDashboardApiResponse = ApiResponse<PTDashboardResponse>;

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type DashboardStateCardProps = {
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

function DashboardStateCard({ title, message, action }: DashboardStateCardProps) {
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

function getDashboardIcon(label: string) {
  switch (label.toLowerCase()) {
    case "linked clients":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4.5 19a4.5 4.5 0 0 1 9 0m2.5 0a3.5 3.5 0 0 1 4 0" />
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
    case "latest activity":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 7v5l3 2" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case "intake ceiling":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4c2.4 2.8 4 5.1 4 7.7A4 4 0 0 1 8 11.7C8 9.1 9.6 6.8 12 4Z" />
          <path d="M8.5 13.5A3.5 3.5 0 0 0 12 17a3.5 3.5 0 0 0 3.5-3.5" />
        </svg>
      );
    case "expenditure floor":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 3c.4 2.8 2.7 3.6 2.7 6.2A2.7 2.7 0 0 1 11 11.9 3.9 3.9 0 0 1 7.5 8c-2 1.7-3.5 4.3-3.5 7a8 8 0 1 0 16 0c0-3.5-2-6.3-5-8.4" />
        </svg>
      );
    default:
      return null;
  }
}

export default function PTDashboardPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [dashboardData, setDashboardData] = useState<PTDashboardResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/pt/dashboard", { cache: "no-store" });
        const payload = (await response.json()) as PTDashboardApiResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message ?? "Unable to load the PT dashboard.");
          setDashboardData(null);
          return;
        }

        setDashboardData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load the PT dashboard.");
          setDashboardData(null);
        }
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

  if (status === "loading") {
    return <LoadingBlock title="Loading PT session" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  const view = adaptPTDashboardView(dashboardData);
  const showLoadingState = loading && !dashboardData && !errorMessage;

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="PT Studio"
      subtitle="Client progress, activity, and nutrition snapshots through the existing protected PT dashboard route."
      notificationSlot={<ActionPill href="/pt/settings" tone="purple">Settings</ActionPill>}
      topHubAction={<ActionPill href="/pt/clients">Open clients</ActionPill>}
      activePath="/pt"
    >
      {errorMessage ? (
        <MobileSection
          eyebrow="Dashboard sync"
          title="PT dashboard unavailable"
          description="This screen stays on the existing PT dashboard BFF route and does not fall back to direct backend calls."
        >
          <DashboardStateCard
            title="Unable to load the PT dashboard"
            message={errorMessage}
            action={<ActionPill href="/pt/clients">Open clients</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading your PT studio"
          description="Fetching linked-client summaries through the current protected PT dashboard route."
        >
          <DashboardStateCard
            title="Refreshing PT dashboard"
            message="Your PT summary is loading through the signed frontend-to-BFF path."
          />
        </MobileSection>
      ) : (
        <>
          <MobileSection
            eyebrow="PT studio"
            title="Today at a glance"
            description="These cards reflect only real linked-client, assignment, workout-log, and metrics snapshot data returned by the current PT dashboard response."
            action={<ActionPill href="/pt/clients" tone="purple">Client portal</ActionPill>}
          >
            <MobileCard as="article" variant="action" className="mobile-pt-hero-card">
              <div className="mobile-pt-hero-masthead">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Protected PT workspace</p>
                  <h2 className="mobile-section__title">Coach your roster with one visual system</h2>
                  <p className="mobile-section__description">
                    The PT shell now uses the same darker grid, contrast, and card rhythm as the client routes while staying on the existing dashboard BFF response.
                  </p>
                </div>
                <div className="mobile-pt-actions">
                  <ActionPill href="/pt/clients">Open clients</ActionPill>
                  <ActionPill href="/pt/training" tone="purple">Training hub</ActionPill>
                </div>
              </div>

              <div className="mobile-pt-signal-grid">
                {view.stats.map((stat) => (
                  <MobileStatCard
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    unit={stat.unit}
                    progressText={stat.progressText}
                    icon={getDashboardIcon(stat.label)}
                  />
                ))}
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection
            eyebrow="Client progress"
            title="Roster momentum"
            description="Open the existing client detail, metrics, training, and recommendation routes from here without introducing new PT workflow endpoints."
          >
            {view.summaryCards.length > 0 ? (
              view.summaryCards.map((client) => (
                <MobileCard key={client.id} as="article" variant="action" className="mobile-pt-client-card">
                  <div className="mobile-pt-client-card__header">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">PT-linked client</p>
                      <h3 className="mobile-section__title">{client.clientDisplayLabel}</h3>
                      <p className="mobile-section__description">{client.clientEmail}</p>
                    </div>
                    <span className="mobile-pill mobile-pill--purple">{client.statusBadge}</span>
                  </div>

                  <dl className="mobile-pt-fact-grid">
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

                  {client.notesPreview ? (
                    <div className="mobile-pt-surface-note">
                      <p className="mobile-section__eyebrow">Coach note</p>
                      <p className="mobile-section__description">{client.notesPreview}</p>
                    </div>
                  ) : null}

                  <div className="mobile-pt-actions">
                    <ActionPill href={client.overviewHref}>Client detail</ActionPill>
                    <ActionPill href={client.metricsHref} tone="purple">Metrics</ActionPill>
                    <ActionPill href={client.trainingHref}>Training</ActionPill>
                    <ActionPill href={client.recommendationHref} tone="purple">Meal plans</ActionPill>
                  </div>
                </MobileCard>
              ))
            ) : (
              <DashboardStateCard
                title="No linked clients yet"
                message="This PT account does not currently have any linked clients to manage."
                action={<ActionPill href="/pt/clients">Open client portal</ActionPill>}
              />
            )}
          </MobileSection>
        </>
      )}
    </MobileAppShell>
  );
}
