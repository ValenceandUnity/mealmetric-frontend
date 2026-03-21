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
import { adaptSubscriptions } from "@/lib/adapters/client-records";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type SubscriptionsResponse = ApiResponse<JsonValue>;

export default function ClientSubscriptionsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [subscriptionsData, setSubscriptionsData] = useState<JsonValue | null>(null);
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
        const response = await fetch("/api/client/subscriptions", { cache: "no-store" });
        const payload = (await response.json()) as SubscriptionsResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setSubscriptionsData(null);
          return;
        }

        setSubscriptionsData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load subscriptions.");
          setSubscriptionsData(null);
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
    return <LoadingBlock title="Loading subscriptions" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="Subscriptions require an authenticated client session."
      />
    );
  }

  const view = adaptSubscriptions(subscriptionsData);

  return (
    <PageShell
      title="Subscriptions"
      user={user}
      navigation={<Link className="link-button" href="/client">Back to client home</Link>}
    >
      {loading ? (
        <LoadingBlock title="Loading subscriptions" message="Fetching subscription records through the BFF." />
      ) : null}
      {errorMessage ? <ErrorBlock title="Unable to load subscriptions" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Section title="Subscription summary">
            <div className="grid grid--2">
              {view.summary.map((item) => (
                <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
              ))}
            </div>
          </Section>

          <Section title="Active subscriptions">
            {view.records.length > 0 ? (
              <div className="stacked-list">
                {view.records.map((subscription, index) => (
                  <RecordCard
                    key={subscription.id ?? `${subscription.title}-${index}`}
                    eyebrow={subscription.eyebrow}
                    title={subscription.title}
                    description={subscription.description}
                    metadata={subscription.metadata}
                  />
                ))}
              </div>
            ) : (
              <>
                <EmptyState
                  title="No subscriptions returned"
                  message="Subscription details will appear here when the BFF returns structured records."
                />
                {view.debugData ? (
                  <DebugPreview value={view.debugData} label="Subscriptions payload fallback" />
                ) : null}
              </>
            )}
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
