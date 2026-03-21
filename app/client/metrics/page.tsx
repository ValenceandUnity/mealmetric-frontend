"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SummaryCard } from "@/components/cards/SummaryCard";
import { PageShell } from "@/components/layout/PageShell";
import { MetricsPanel } from "@/components/metrics/MetricsPanel";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { Tabs } from "@/components/ui/Tabs";
import { adaptMetrics } from "@/lib/adapters/metrics";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, ClientMetricsResponse, JsonValue } from "@/lib/types/api";

type MetricsTab = "overview" | "history";
type ClientMetricsApiResponse = ApiResponse<ClientMetricsResponse>;
type MetricsSectionApiResponse = ApiResponse<JsonValue>;

export default function ClientMetricsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [activeTab, setActiveTab] = useState<MetricsTab>("overview");
  const [overview, setOverview] = useState<JsonValue | null>(null);
  const [history, setHistory] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
          setOverview(null);
          setHistory(null);
          return;
        }

        setOverview(payload.data.overview);
        setHistory(payload.data.history);
      } catch {
        if (active) {
          setErrorMessage("Unable to load client metrics.");
          setOverview(null);
          setHistory(null);
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

  async function refreshTab(tab: MetricsTab) {
    setRefreshing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/client/metrics/${tab}`, { cache: "no-store" });
      const payload = (await response.json()) as MetricsSectionApiResponse;

      if (!payload.ok) {
        setErrorMessage(payload.error.message);
        return;
      }

      if (tab === "overview") {
        setOverview(payload.data);
      } else {
        setHistory(payload.data);
      }
    } catch {
      setErrorMessage(`Unable to refresh ${tab}.`);
    } finally {
      setRefreshing(false);
    }
  }

  if (status === "loading") {
    return <LoadingBlock title="Loading metrics" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client metrics require an authenticated client session." />;
  }

  const currentData = activeTab === "overview" ? overview : history;
  const currentView = adaptMetrics(currentData);
  const sectionTitle = activeTab === "overview" ? "Overview metrics" : "History metrics";
  const sectionCopy =
    activeTab === "overview"
      ? "Use the overview tab for current status and headline metric rollups."
      : "Use the history tab for trend-oriented records and prior checkpoints.";

  return (
    <PageShell
      title="Metrics"
      user={user}
      navigation={<Link className="link-button" href="/client">Back to client home</Link>}
    >
      <Section title="Metric views">
        <div className="row row--between">
          <Tabs
            active={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "overview", label: "Overview" },
              { value: "history", label: "History" },
            ]}
          />
          <button type="button" onClick={() => void refreshTab(activeTab)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : `Refresh ${activeTab}`}
          </button>
        </div>
        <p className="section__copy">{sectionCopy}</p>
      </Section>

      {loading ? <LoadingBlock title="Loading metrics data" message="Fetching /api/client/metrics through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load metrics" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Section title="Snapshot">
            <div className="grid grid--2">
              <SummaryCard label="Active view" value={activeTab === "overview" ? "Overview" : "History"} hint="Segmented without direct backend access." />
              <SummaryCard
                label="Highlights"
                value={`${currentView.highlights.length}`}
                hint="Readable metrics derived from the current response slice."
              />
            </div>
          </Section>

          <Section title={sectionTitle}>
            <MetricsPanel metrics={currentView} />
          </Section>

          {currentData && currentView.highlights.length === 0 ? (
            <Section title="Debug fallback">
              <DebugPreview value={currentData} label={`${activeTab} payload fallback`} />
            </Section>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
