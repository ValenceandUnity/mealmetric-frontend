"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JsonPreview, getArrayItems } from "@/components/JsonPreview";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import { getTextField } from "@/lib/json/object";
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

  const pickups = pickupsData ? getArrayItems(pickupsData) : [];

  if (status === "loading") {
    return <LoadingBlock title="Loading pickups" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Pickups require an authenticated client session." />;
  }

  return (
    <PageShell
      title="Pickups"
      user={user}
      navigation={<Link href="/client">Back to Client Home</Link>}
    >
      <Section>
        <p style={{ margin: 0 }}>
          Pickup records loaded through <code>/api/client/pickups</code>.
        </p>
      </Section>

      {loading ? <LoadingBlock title="Loading pickups" message="Fetching pickup records." /> : null}

      {errorMessage ? <ErrorBlock title="Unable to load pickups" message={errorMessage} /> : null}

      {!loading && !errorMessage && pickups.length === 0 ? (
        <Section title="No pickups returned">
          <JsonPreview value={pickupsData ?? []} />
        </Section>
      ) : null}

      {pickups.map((pickup, index) => {
        const pickupTime = getTextField(pickup, ["pickup_at", "pickup_time", "scheduled_for"]);
        const mealPlanReference = getTextField(pickup, ["meal_plan_id", "meal_plan", "meal_plan_name"]);
        const statusText = getTextField(pickup, ["status", "pickup_status"]);

        return (
          <Section key={`pickup-${index}`} title={`Pickup #${index + 1}`}>
            {pickupTime ? <p><strong>Pickup Time:</strong> {pickupTime}</p> : null}
            {mealPlanReference ? <p><strong>Meal Plan:</strong> {mealPlanReference}</p> : null}
            {statusText ? <p><strong>Status:</strong> {statusText}</p> : null}
            <JsonPreview value={pickup} />
          </Section>
        );
      })}
    </PageShell>
  );
}
