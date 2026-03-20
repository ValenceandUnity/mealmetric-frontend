"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JsonPreview, getArrayItems, getEntityId } from "@/components/JsonPreview";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import { getTextField } from "@/lib/json/object";
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

  const subscriptions = subscriptionsData ? getArrayItems(subscriptionsData) : [];

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

  return (
    <PageShell
      title="Subscriptions"
      user={user}
      navigation={<Link href="/client">Back to Client Home</Link>}
    >
      <Section>
        <p style={{ margin: 0 }}>
          Subscription records loaded through <code>/api/client/subscriptions</code>.
        </p>
      </Section>

      {loading ? (
        <LoadingBlock title="Loading subscriptions" message="Fetching subscription records." />
      ) : null}

      {errorMessage ? <ErrorBlock title="Unable to load subscriptions" message={errorMessage} /> : null}

      {!loading && !errorMessage && subscriptions.length === 0 ? (
        <Section title="No subscriptions returned">
          <JsonPreview value={subscriptionsData ?? []} />
        </Section>
      ) : null}

      {subscriptions.map((subscription, index) => {
        const subscriptionId = getEntityId(subscription);
        const statusText = getTextField(subscription, ["status", "subscription_status"]);
        const mealPlanReference = getTextField(subscription, ["meal_plan_id", "meal_plan", "meal_plan_name"]);

        return (
          <Section
            key={subscriptionId ?? `subscription-${index}`}
            title={`Subscription ${subscriptionId ?? `#${index + 1}`}`}
          >
            {subscriptionId ? (
              <p>
                <strong>Id:</strong> <code>{subscriptionId}</code>
              </p>
            ) : null}
            {statusText ? <p><strong>Status:</strong> {statusText}</p> : null}
            {mealPlanReference ? <p><strong>Meal Plan:</strong> {mealPlanReference}</p> : null}
            <JsonPreview value={subscription} />
          </Section>
        );
      })}
    </PageShell>
  );
}
