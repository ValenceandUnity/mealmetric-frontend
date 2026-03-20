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

  const orders = ordersData ? getArrayItems(ordersData) : [];

  if (status === "loading") {
    return <LoadingBlock title="Loading orders" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Orders require an authenticated client session." />;
  }

  return (
    <PageShell
      title="Orders"
      user={user}
      navigation={<Link href="/client">Back to Client Home</Link>}
    >
      <Section>
        <p style={{ margin: 0 }}>
          Order history loaded through <code>/api/client/orders</code>.
        </p>
      </Section>

      {loading ? <LoadingBlock title="Loading orders" message="Fetching order records." /> : null}

      {errorMessage ? <ErrorBlock title="Unable to load orders" message={errorMessage} /> : null}

      {!loading && !errorMessage && orders.length === 0 ? (
        <Section title="No orders returned">
          <JsonPreview value={ordersData ?? []} />
        </Section>
      ) : null}

      {orders.map((order, index) => {
        const orderId = getEntityId(order);
        const mealPlanReference = getTextField(order, ["meal_plan_id", "meal_plan", "meal_plan_name"]);
        const statusText = getTextField(order, ["status", "order_status"]);
        const createdAt = getTextField(order, ["created_at", "ordered_at"]);
        const updatedAt = getTextField(order, ["updated_at"]);

        return (
          <Section key={orderId ?? `order-${index}`} title={`Order ${orderId ?? `#${index + 1}`}`}>
            {orderId ? (
              <p>
                <strong>Id:</strong> <code>{orderId}</code>
              </p>
            ) : null}
            {mealPlanReference ? <p><strong>Meal Plan:</strong> {mealPlanReference}</p> : null}
            {statusText ? <p><strong>Status:</strong> {statusText}</p> : null}
            {createdAt ? <p><strong>Created:</strong> {createdAt}</p> : null}
            {updatedAt ? <p><strong>Updated:</strong> {updatedAt}</p> : null}
            <JsonPreview value={order} />
          </Section>
        );
      })}
    </PageShell>
  );
}
