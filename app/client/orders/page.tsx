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
import { adaptOrders } from "@/lib/adapters/client-records";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type OrdersResponse = ApiResponse<JsonValue>;

export default function ClientOrdersPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [ordersData, setOrdersData] = useState<JsonValue | null>(null);
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
        const response = await fetch("/api/client/orders", { cache: "no-store" });
        const payload = (await response.json()) as OrdersResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setOrdersData(null);
          return;
        }

        setOrdersData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load orders.");
          setOrdersData(null);
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
    return <LoadingBlock title="Loading orders" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Orders require an authenticated client session." />;
  }

  const view = adaptOrders(ordersData);

  return (
    <PageShell
      title="Orders"
      user={user}
      navigation={<Link className="link-button" href="/client">Back to client home</Link>}
    >
      {loading ? <LoadingBlock title="Loading orders" message="Fetching order history through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load orders" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Section title="Order summary">
            <div className="grid grid--2">
              {view.summary.map((item) => (
                <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
              ))}
            </div>
          </Section>

          <Section title="Order history">
            {view.records.length > 0 ? (
              <div className="stacked-list">
                {view.records.map((order, index) => (
                  <RecordCard
                    key={order.id ?? `${order.title}-${index}`}
                    eyebrow={order.eyebrow}
                    title={order.title}
                    description={order.description}
                    metadata={order.metadata}
                  />
                ))}
              </div>
            ) : (
              <>
                <EmptyState
                  title="No orders returned"
                  message="Order history will appear here when the client orders route returns structured records."
                />
                {view.debugData ? <DebugPreview value={view.debugData} label="Orders payload fallback" /> : null}
              </>
            )}
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
