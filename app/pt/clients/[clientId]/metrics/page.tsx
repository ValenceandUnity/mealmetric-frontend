"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { SummaryCard } from "@/components/cards/SummaryCard";
import { PageShell } from "@/components/layout/PageShell";
import { MetricsPanel } from "@/components/metrics/MetricsPanel";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { adaptMetrics } from "@/lib/adapters/metrics";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type PTClientMetricsApiResponse = ApiResponse<JsonValue>;

export default function PTClientMetricsPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = typeof params?.clientId === "string" ? params.clientId : "";

  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [metricsData, setMetricsData] = useState<JsonValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt" || !clientId) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/pt/clients/${clientId}/metrics`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as PTClientMetricsApiResponse;

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
  }, [clientId, status, user]);

  if (status === "loading") {
    return <LoadingBlock title="Loading client metrics" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  const metrics = adaptMetrics(metricsData);

  return (
    <PageShell
      title="Client metrics"
      user={user}
      navigation={
        <>
          <Link className="link-button" href={`/pt/clients/${clientId}`}>
            Client overview
          </Link>
          <Link className="link-button" href="/pt/clients">
            Back to clients
          </Link>
        </>
      }
    >
      {loading ? <LoadingBlock title="Loading metrics data" message="Fetching PT client metrics through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load client metrics" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Section title="Metrics summary">
            <div className="grid grid--2">
              <SummaryCard label="Client ID" value={clientId || "Unavailable"} hint="Metrics scope for this PT workflow." />
              <SummaryCard
                label="Highlights"
                value={`${metrics.highlights.length}`}
                hint="Structured data points surfaced from the BFF payload."
              />
            </div>
          </Section>

          <Section title="Current view">
            <MetricsPanel metrics={metrics} />
          </Section>

          {metricsData && metrics.highlights.length === 0 ? (
            <Section title="Debug fallback">
              <DebugPreview value={metricsData} label="PT client metrics payload fallback" />
            </Section>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
