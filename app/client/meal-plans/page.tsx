"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JsonPreview, getArrayItems, getEntityId } from "@/components/JsonPreview";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import { getTextField, isJsonObject } from "@/lib/json/object";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type MealPlansResponse = ApiResponse<JsonValue>;

function getPriceField(value: JsonValue): string | null {
  if (!isJsonObject(value)) {
    return null;
  }

  const cents = value.total_price_cents;
  if (typeof cents === "number") {
    return `$${(cents / 100).toFixed(2)}`;
  }

  const raw = value.price;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw;
  }

  return null;
}

export default function ClientMealPlansPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [mealPlansData, setMealPlansData] = useState<JsonValue | null>(null);
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
        const response = await fetch("/api/client/meal-plans", { cache: "no-store" });
        const payload = (await response.json()) as MealPlansResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setMealPlansData(null);
          return;
        }

        setMealPlansData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load meal plans.");
          setMealPlansData(null);
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

  const mealPlans = mealPlansData ? getArrayItems(mealPlansData) : [];

  if (status === "loading") {
    return <LoadingBlock title="Loading meal plans" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="Meal plan discovery requires an authenticated client session."
      />
    );
  }

  return (
    <PageShell
      title="Meal Plans"
      user={user}
      navigation={<Link href="/client">Back to Client Home</Link>}
    >
      <Section>
        <p style={{ margin: 0 }}>
          Browse available meal plans through <code>/api/client/meal-plans</code>.
        </p>
      </Section>

      {loading ? (
        <LoadingBlock title="Loading plans" message="Fetching meal-plan discovery data." />
      ) : null}

      {errorMessage ? <ErrorBlock title="Unable to load meal plans" message={errorMessage} /> : null}

      {!loading && !errorMessage && mealPlans.length === 0 ? (
        <Section title="No meal plans returned">
          <JsonPreview value={mealPlansData ?? []} />
        </Section>
      ) : null}

      {mealPlans.map((mealPlan, index) => {
        const mealPlanId = getEntityId(mealPlan);
        const title = getTextField(mealPlan, ["name", "title"]);
        const vendor = getTextField(mealPlan, ["vendor", "vendor_name"]);
        const description = getTextField(mealPlan, ["description", "summary"]);
        const price = getPriceField(mealPlan);

        return (
          <Section key={mealPlanId ?? `meal-plan-${index}`} title={title ?? "Unnamed Meal Plan"}>
            {vendor ? <p><strong>Vendor:</strong> {vendor}</p> : null}
            {price ? <p><strong>Price:</strong> {price}</p> : null}
            {description ? <p>{description}</p> : null}

            {!title && !vendor && !price && !description ? (
              <JsonPreview value={mealPlan} />
            ) : null}

            {mealPlanId ? (
              <nav>
                <Link href={`/client/meal-plans/${mealPlanId}`}>Open Plan Detail</Link>
              </nav>
            ) : (
              <p>Detail link unavailable because no meal plan id was returned.</p>
            )}
          </Section>
        );
      })}
    </PageShell>
  );
}
