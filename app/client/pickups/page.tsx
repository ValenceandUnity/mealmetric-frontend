"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RecordCard } from "@/components/cards/RecordCard";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { PageShell } from "@/components/layout/PageShell";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { adaptPickups } from "@/lib/adapters/client-records";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type PickupsResponse = ApiResponse<JsonValue>;

export default function ClientPickupsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [pickupsData, setPickupsData] = useState<JsonValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/client/pickups", { cache: "no-store" });
        const payload = (await response.json()) as PickupsResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setPickupsData(null);
          return;
        }

        setPickupsData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load pickups.");
          setPickupsData(null);
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
    return <LoadingBlock title="Loading pickups" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Pickups require an authenticated client session." />;
  }

  const view = adaptPickups(pickupsData);

  return (
    <PageShell
      title="Pickups"
      user={user}
      navigation={<Link className="link-button" href="/client">Back to client home</Link>}
    >
      {loading ? <LoadingBlock title="Loading pickups" message="Fetching pickup records through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load pickups" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Section title="Pickup summary">
            <div className="grid grid--2">
              {view.summary.map((item) => (
                <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
              ))}
            </div>
          </Section>

          <Section title="Scheduled pickups">
            {view.records.length > 0 ? (
              <div className="stacked-list">
                {view.records.map((pickup, index) => (
                  <RecordCard
                    key={pickup.id ?? `${pickup.title}-${index}`}
                    eyebrow={pickup.eyebrow}
                    title={pickup.title}
                    description={pickup.description}
                    metadata={pickup.metadata}
                  />
                ))}
              </div>
            ) : (
              <>
                <EmptyState
                  title="No pickups returned"
                  message="Pickup scheduling details will appear here when the BFF returns structured records."
                />
                {view.debugData ? <DebugPreview value={view.debugData} label="Pickups payload fallback" /> : null}
              </>
            )}
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
