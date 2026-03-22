"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, PTDashboardClientSummary, PTDashboardResponse } from "@/lib/types/api";

type PTDashboardApiResponse = ApiResponse<PTDashboardResponse>;

function formatDateTime(value: string | null): string {
  if (!value) {
    return "No workout logs yet";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatMetricValue(value: number | null): string {
  return value === null ? "Not available" : `${value}`;
}

function PTDashboardClientCard({ client }: { client: PTDashboardClientSummary }) {
  return (
    <Card className="pt-dashboard-client-card" variant="soft">
      <PageHeader
        eyebrow="Client"
        title={client.client.email}
        description={
          client.notes
            ? `Link notes: ${client.notes}`
            : "PT-linked client available through the protected dashboard route."
        }
        status={{ label: client.status, tone: "accent" }}
      />

      <dl className="pt-dashboard-client-card__facts">
        <div>
          <dt>Assignments</dt>
          <dd>{client.assignment_count}</dd>
        </div>
        <div>
          <dt>Workout logs</dt>
          <dd>{client.workout_log_count}</dd>
        </div>
        <div>
          <dt>Latest workout log</dt>
          <dd>{formatDateTime(client.latest_workout_log_at)}</dd>
        </div>
        <div>
          <dt>Intake ceiling</dt>
          <dd>{formatMetricValue(client.metrics_snapshot?.current_intake_ceiling_calories ?? null)}</dd>
        </div>
        <div>
          <dt>Expenditure floor</dt>
          <dd>{formatMetricValue(client.metrics_snapshot?.current_expenditure_floor_calories ?? null)}</dd>
        </div>
      </dl>

      <div className="action-row">
        <Link className="link-button link-button--accent" href={`/pt/clients/${client.client_user_id}`}>
          Open client
        </Link>
        <Link className="link-button" href={`/pt/clients/${client.client_user_id}/metrics`}>
          Metrics
        </Link>
        <Link className="link-button" href={`/pt/clients/${client.client_user_id}/assign`}>
          Training
        </Link>
      </div>
    </Card>
  );
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

  return (
    <PageShell title="PT Dashboard" user={user}>
      {loading ? <LoadingBlock title="Loading dashboard" message="Fetching real PT-linked client summaries." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load PT dashboard" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Card className="pt-dashboard-header" variant="accent" as="section">
            <PageHeader
              eyebrow="PT workspace"
              title="PT Dashboard"
              description="Manage your linked clients from one place using real assignment, workout log, and metrics snapshot data already available inside MealMetric."
              actions={
                <>
                  <Link className="link-button link-button--accent" href="/pt/clients">
                    Client workspace
                  </Link>
                  <Link className="link-button" href="/pt/settings">
                    Settings
                  </Link>
                </>
              }
            />
          </Card>

          <SectionBlock
            eyebrow="Linked clients"
            title="Client roster"
            description="Each card shows only real PT-scoped summary data returned by the protected dashboard route."
          >
            {dashboardData && dashboardData.items.length > 0 ? (
              <div className="pt-dashboard-client-list">
                {dashboardData.items.map((client) => (
                  <PTDashboardClientCard key={client.id} client={client} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No linked clients yet"
                message="This PT account does not currently have any linked clients to manage."
              />
            )}
          </SectionBlock>
        </>
      ) : null}
    </PageShell>
  );
}
