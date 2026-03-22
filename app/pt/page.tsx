"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { PageShell } from "@/components/layout/PageShell";
import { RoutineCard } from "@/components/training/RoutineCard";
import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
import { adaptPTDashboard } from "@/lib/adapters/dashboard";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, PTDashboardResponse } from "@/lib/types/api";

type PTDashboardApiResponse = ApiResponse<PTDashboardResponse>;

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
          setErrorMessage(payload.error.message);
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

  const view = dashboardData ? adaptPTDashboard(dashboardData) : null;

  return (
    <PageShell
      title="Coach dashboard"
      user={user}
      actions={<LogoutButton />}
    >
      {loading ? <LoadingBlock title="Loading dashboard data" message="Calling `/api/pt/dashboard` through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load PT dashboard" message={errorMessage} /> : null}

      {view && dashboardData ? (
        <>
          <Card className="pt-dashboard-hero" variant="accent" as="section">
            <PageHeader
              eyebrow="PT workspace"
              title="Coaching command center"
              description="Manage clients, review package availability, and move into client-specific actions through the existing PT BFF routes."
              chips={view.profile.chips}
              actions={
                <ActionRow>
                  <Link className="link-button link-button--accent" href="/pt/clients">
                    Open clients
                  </Link>
                  <Link className="link-button" href="/pt/settings">
                    PT settings
                  </Link>
                </ActionRow>
              }
            />
            <div className="pt-dashboard-hero__stats">
              {view.summary.length > 0 ? (
                view.summary.map((item, index) => (
                  <StatPill
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    hint={item.hint}
                    active={index === 0}
                  />
                ))
              ) : (
                <>
                  <StatPill label="Clients" value={`${view.clients.length}`} hint="Loaded from the PT dashboard aggregate route." active />
                  <StatPill label="Packages" value={`${view.packages.length}`} hint="Current package visibility returned by the dashboard route." />
                </>
              )}
            </div>
          </Card>

          <SectionBlock
            eyebrow="Workspace"
            title="Operations overview"
            description="High-level framing for the real PT slices currently assembled in the dashboard route."
          >
            <div className="pt-dashboard-analytics">
              <AnalyticsCard
                eyebrow="Dashboard aggregate"
                title={view.profile.title}
                description={view.profile.description}
                stats={
                  view.summary.length > 0
                    ? view.summary
                    : [
                        { label: "Clients", value: `${view.clients.length}` },
                        { label: "Packages", value: `${view.packages.length}` },
                      ]
                }
              />
              <Card className="pt-dashboard-context" variant="soft">
                <ListRow
                  eyebrow="Workspace status"
                  title="Client-first PT operations"
                  description="Top-level PT tabs stay honest, but the real workflow remains client-centric: metrics, assignments, and meal-plan recommendations all live under the client workspace."
                  metadata={[
                    { label: "Dashboard route", value: "/api/pt/dashboard" },
                    { label: "Clients route", value: "/pt/clients" },
                    { label: "Packages visible", value: `${view.packages.length}` },
                  ]}
                />
              </Card>
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Clients"
            title="Client management"
            description="Current clients surfaced from the PT dashboard for quick routing into metrics, training assignment, and meal-plan recommendation work."
            actions={
              <Link className="link-button" href="/pt/clients">
                Full client workspace
              </Link>
            }
          >
            {view.clients.length > 0 ? (
              <div className="stacked-list">
                {view.clients.map((client, index) => (
                  <Card key={client.id ?? `${client.title}-${index}`} className="pt-dashboard-client" variant="soft">
                    <ListRow
                      eyebrow="Client"
                      title={client.title}
                      description={client.subtitle}
                      metadata={client.metadata}
                      status={client.status ? { label: client.status, tone: "accent" } : undefined}
                    />
                    {client.id ? (
                      <ActionRow>
                        <Link className="link-button" href={`/pt/clients/${client.id}`}>
                          Overview
                        </Link>
                        <Link className="link-button" href={`/pt/clients/${client.id}/metrics`}>
                          Metrics
                        </Link>
                        <Link className="link-button" href={`/pt/clients/${client.id}/assign`}>
                          Training
                        </Link>
                        <Link className="link-button" href={`/pt/clients/${client.id}/recommend-meal-plan`}>
                          Meal plans
                        </Link>
                      </ActionRow>
                    ) : null}
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No clients returned"
                message="Client accounts will appear here when the PT dashboard payload includes a roster."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Packages"
            title="Training package visibility"
            description="Package visibility is surfaced here as the closest current proxy for assignment readiness on the PT dashboard."
          >
            {view.packages.length > 0 ? (
              <div className="stacked-list">
                {view.packages.map((pkg, index) => (
                  <RoutineCard
                    key={pkg.id ?? `${pkg.title}-${index}`}
                    eyebrow="Package"
                    title={pkg.title}
                    description={pkg.subtitle}
                    metadata={pkg.metadata}
                    status={pkg.status ? { label: pkg.status, tone: "accent" } : undefined}
                    footer={
                      <Link className="link-button" href="/pt/clients">
                        Use in client workspace
                      </Link>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No packages returned"
                message="Package inventory will appear here when the PT dashboard exposes assignable package data."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Actions"
            title="Route-safe PT actions"
            description="The PT shell remains consistent while unsupported top-level tabs continue to defer into the real client workspace."
          >
            <Card className="pt-dashboard-actions" variant="soft">
              <ListRow
                eyebrow="Current workflow"
                title="Use client-centered operations"
                description="Assignments, metrics, and meal-plan recommendations are all currently routed through the PT client workspace instead of top-level PT tabs."
              />
              <ActionRow>
                <Link className="link-button link-button--accent" href="/pt/clients">
                  Open client command center
                </Link>
                <Link className="link-button" href="/pt/training">
                  Training tab
                </Link>
                <Link className="link-button" href="/pt/metrics">
                  Metrics tab
                </Link>
                <Link className="link-button" href="/pt/meal-plans">
                  Meal plans tab
                </Link>
              </ActionRow>
            </Card>
            {view.summary.length === 0 ? (
              <DebugPreview value={dashboardData.profile} label="PT profile fallback" />
            ) : null}
          </SectionBlock>
        </>
      ) : null}
    </PageShell>
  );
}
