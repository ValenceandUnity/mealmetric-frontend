"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MetricsGrid } from "@/components/metrics/MetricsGrid";
import { TrendSection } from "@/components/metrics/TrendSection";
import { PageShell } from "@/components/layout/PageShell";
import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { adaptClientMetricsDisplay } from "@/lib/adapters/metrics";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, ClientMetricsResponse } from "@/lib/types/api";

type ClientMetricsApiResponse = ApiResponse<ClientMetricsResponse>;

export default function ClientMetricsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [metricsData, setMetricsData] = useState<ClientMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/client/metrics", { cache: "no-store" });
        const payload = (await response.json()) as ClientMetricsApiResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setMetricsData(null);
          return;
        }

        setMetricsData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load client metrics.");
          setMetricsData(null);
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

  const view = useMemo(
    () => adaptClientMetricsDisplay(metricsData?.overview ?? null, metricsData?.history ?? null),
    [metricsData],
  );

  if (status === "loading") {
    return <LoadingBlock title="Loading metrics" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client metrics require an authenticated client session." />;
  }

  return (
    <PageShell title="Metrics" user={user} className="app-shell--client-metrics-display">
      {loading ? <LoadingBlock title="Loading metrics data" message="Fetching your current metrics through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load metrics" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        view.hasAnyData ? (
          <>
            <Card className="client-metrics-display-hero" variant="accent" as="section">
              <PageHeader
                eyebrow="Client metrics"
                title="Metrics"
                description="Only metrics already present in the current backend slices are shown here."
                chips={[
                  `${view.training.length} training metric${view.training.length === 1 ? "" : "s"}`,
                  `${view.nutrition.length} nutrition metric${view.nutrition.length === 1 ? "" : "s"}`,
                  `${view.supporting.length} supporting metric${view.supporting.length === 1 ? "" : "s"}`,
                ]}
                actions={
                  <ActionRow>
                    <Link className="link-button" href="/client/training">
                      Training
                    </Link>
                    <Link className="link-button" href="/client/meal-plans">
                      Meal plans
                    </Link>
                  </ActionRow>
                }
              />
            </Card>

            {view.training.length > 0 ? (
              <SectionBlock
                eyebrow="Training"
                title="Training Metrics"
                description="Workout and completion metrics are shown here only when they already exist in the current backend payload."
              >
                <MetricsGrid metrics={view.training} activeFirst />
              </SectionBlock>
            ) : null}

            {view.nutrition.length > 0 ? (
              <SectionBlock
                eyebrow="Nutrition"
                title="Nutrition Metrics"
                description="Nutrition values remain visible when they are already present in the current metrics response."
              >
                <MetricsGrid metrics={view.nutrition} activeFirst={view.training.length === 0} />
              </SectionBlock>
            ) : null}

            {view.today.length > 0 || view.thisWeek.length > 0 ? (
              <SectionBlock
                eyebrow="Summary"
                title="Summary"
                description="Today and weekly groupings are shown only when those sections already exist in the current metrics payload."
              >
                <div className="client-metrics-summary-sections">
                  {view.today.length > 0 ? (
                    <Card className="client-metrics-summary-card" variant="soft">
                      <PageHeader
                        eyebrow="Summary"
                        title="Today"
                        description="Current daily values returned by the BFF."
                      />
                      <MetricsGrid metrics={view.today} />
                    </Card>
                  ) : null}

                  {view.thisWeek.length > 0 ? (
                    <Card className="client-metrics-summary-card" variant="soft">
                      <PageHeader
                        eyebrow="Summary"
                        title="This Week"
                        description="Current weekly values returned by the BFF."
                      />
                      <MetricsGrid metrics={view.thisWeek} />
                    </Card>
                  ) : null}
                </div>
              </SectionBlock>
            ) : null}

            {view.trendRows.length > 0 ? (
              <SectionBlock
                eyebrow="Trend"
                title="Trend"
                description="Rendered only because the metrics payload already exposes real dated rows."
              >
                <TrendSection rows={view.trendRows} />
              </SectionBlock>
            ) : null}

            {view.supporting.length > 0 ? (
              <SectionBlock
                eyebrow="Supporting"
                title="Supporting Metrics"
                description="Additional metrics shown only when they already exist in the payload."
              >
                <MetricsGrid metrics={view.supporting} />
              </SectionBlock>
            ) : null}
          </>
        ) : (
          <SectionBlock
            eyebrow="Metrics"
            title="No metrics available yet"
            description="This screen stays empty until the current backend metrics slices expose real values."
          >
            <EmptyState
              title="No metrics available yet"
              message="No metrics are currently exposed by the active backend overview or history payloads."
            />
          </SectionBlock>
        )
      ) : null}
    </PageShell>
  );
}
