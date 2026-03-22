"use client";
import { useEffect, useState } from "react";

import { SummaryCard } from "@/components/cards/SummaryCard";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, VendorMetricsPayload } from "@/lib/types/api";

export default function VendorMetricsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "vendor",
    unauthenticatedRedirectTo: "/login",
  });

  const [metrics, setMetrics] = useState<VendorMetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || user?.role !== "vendor") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch("/api/vendor/metrics", { cache: "no-store" });
        const payload = (await response.json()) as ApiResponse<VendorMetricsPayload>;
        if (!active) {
          return;
        }
        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          return;
        }
        setMetrics(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load vendor metrics.");
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
    return <LoadingBlock title="Loading vendor metrics" message="Validating your vendor session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Vendor access requires an authenticated vendor session." />;
  }

  return (
    <PageShell title="Vendor metrics" user={user}>
      {loading ? <LoadingBlock title="Loading metrics" message="Fetching vendor metrics through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load metrics" message={errorMessage} /> : null}

      {!loading && !errorMessage && metrics ? (
        <Section title="Metrics overview">
          <div className="grid grid--2">
            <SummaryCard label="Vendor" value={metrics.vendor_name} hint={metrics.zip_code ?? "No ZIP configured"} />
            <SummaryCard label="Meal plans" value={`${metrics.total_meal_plans}`} />
            <SummaryCard label="Published" value={`${metrics.published_meal_plans}`} />
            <SummaryCard label="Draft" value={`${metrics.draft_meal_plans}`} />
            <SummaryCard label="Availability rows" value={`${metrics.total_availability_entries}`} />
            <SummaryCard label="Open pickup windows" value={`${metrics.open_pickup_windows}`} />
          </div>
        </Section>
      ) : null}
    </PageShell>
  );
}
