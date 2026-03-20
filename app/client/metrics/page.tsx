"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JsonPreview } from "@/components/JsonPreview";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
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
    return (
      <LoadingBlock
        title="Redirecting"
        message="Client metrics require an authenticated client session."
      />
    );
  }

  const currentData = activeTab === "overview" ? overview : history;

  return (
    <PageShell
      title="Metrics"
      user={user}
      navigation={<Link href="/client">Back to Client Home</Link>}
    >
      <Section>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            disabled={activeTab === "overview"}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            disabled={activeTab === "history"}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => void refreshTab(activeTab)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : `Refresh ${activeTab}`}
          </button>
        </div>
      </Section>

      {loading ? (
        <LoadingBlock
          title="Loading metrics data"
          message="Fetching /api/client/metrics through the BFF."
        />
      ) : null}

      {errorMessage ? <ErrorBlock title="Unable to load metrics" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <Section title={activeTab === "overview" ? "Overview" : "History"}>
          <div>
            <p style={{ marginTop: 0 }}>
              {activeTab === "overview" ? "Overview" : "History"}
            </p>
          </div>
          <div>
            {currentData === null ? (
              <p>No {activeTab} data returned.</p>
            ) : (
              <JsonPreview value={currentData} emptyMessage={`No ${activeTab} data returned.`} />
            )}
          </div>
        </Section>
      ) : null}
    </PageShell>
  );
}
