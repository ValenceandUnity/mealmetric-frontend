"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { JsonPreview, getArrayItems } from "@/components/JsonPreview";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonObject, JsonValue } from "@/lib/types/api";

type PTClientMetricsApiResponse = ApiResponse<JsonValue>;

function isObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTextField(value: JsonValue, keys: string[]): string | null {
  if (!isObject(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

function getCountLabel(value: JsonValue): string | null {
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (isObject(value)) {
    return `${Object.keys(value).length} field${Object.keys(value).length === 1 ? "" : "s"}`;
  }

  return null;
}

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

  const title = getTextField(metricsData ?? null, ["title", "name", "label"]);
  const statusLabel = getTextField(metricsData ?? null, ["status"]);
  const summaryLabel = getTextField(metricsData ?? null, ["summary", "description"]);
  const items = metricsData ? getArrayItems(metricsData) : [];
  const countLabel = metricsData ? getCountLabel(metricsData) : null;
  const isEmptyArray = Array.isArray(metricsData) && metricsData.length === 0;
  const metricsObject = isObject(metricsData ?? null) ? metricsData : null;
  const isEmptyObject = metricsObject !== null && Object.keys(metricsObject).length === 0;
  const isEmpty = metricsData === null || isEmptyArray || isEmptyObject;

  return (
    <PageShell
      title="Client Metrics"
      user={user}
      navigation={
        <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/pt/clients">Back to PT Clients</Link>
        </nav>
      }
    >
      <Section title="Header">
        <p style={{ margin: 0 }}>
          <strong>Client Id:</strong> <code>{clientId || "Unavailable"}</code>
        </p>
        <p style={{ margin: 0 }}>
          Metrics are loaded only through <code>/api/pt/clients/{clientId || ":clientId"}/metrics</code>.
        </p>
      </Section>

      {loading ? (
        <LoadingBlock
          title="Loading metrics data"
          message="Fetching PT client metrics through the BFF."
        />
      ) : null}

      {errorMessage ? <ErrorBlock title="Unable to load client metrics" message={errorMessage} /> : null}

      {!loading && !errorMessage && isEmpty ? (
        <Section title="No metrics returned">
          <p>No client metrics were returned for this client.</p>
          <JsonPreview value={metricsData ?? []} />
        </Section>
      ) : null}

      {!loading && !errorMessage && !isEmpty ? (
        <>
          <Section title="Extracted Insight">
            {title ? (
              <p style={{ margin: 0 }}>
                <strong>Title:</strong> {title}
              </p>
            ) : null}
            {statusLabel ? (
              <p style={{ margin: 0 }}>
                <strong>Status:</strong> {statusLabel}
              </p>
            ) : null}
            {summaryLabel ? (
              <p style={{ margin: 0 }}>
                <strong>Summary:</strong> {summaryLabel}
              </p>
            ) : null}
            {countLabel ? (
              <p style={{ margin: 0 }}>
                <strong>Shape:</strong> {countLabel}
              </p>
            ) : null}
            {!title && !statusLabel && !summaryLabel && !countLabel ? (
              <p style={{ margin: 0 }}>No obvious high-level fields were detected.</p>
            ) : null}
          </Section>

          {items.length > 0 ? (
            <Section title="Array Items Preview">
              {items.slice(0, 5).map((item, index) => (
                <div
                  key={`metric-item-${index}`}
                  style={{ borderTop: index > 0 ? "1px solid #334155" : undefined, paddingTop: index > 0 ? 12 : 0 }}
                >
                  <JsonPreview value={item} />
                </div>
              ))}
            </Section>
          ) : null}

          <Section title="Raw Metrics">
            <JsonPreview value={metricsData as JsonValue} />
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
