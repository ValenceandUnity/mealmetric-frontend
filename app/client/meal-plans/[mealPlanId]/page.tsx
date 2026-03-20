"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { JsonPreview, getArrayItems } from "@/components/JsonPreview";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonObject, JsonValue } from "@/lib/types/api";

type MealPlanDetailResponse = ApiResponse<JsonValue>;
type CheckoutSessionResponse = ApiResponse<JsonValue>;

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

function getPriceField(value: JsonValue): string | null {
  if (!isObject(value)) {
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

function getMealsPreview(value: JsonValue): JsonValue[] {
  if (!isObject(value)) {
    return [];
  }

  const candidates = [
    value.meals,
    value.items,
    value.meal_items,
    value.included_meals,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export default function ClientMealPlanDetailPage() {
  const params = useParams<{ mealPlanId: string }>();
  const mealPlanId = useMemo(() => {
    const raw = params?.mealPlanId;
    return typeof raw === "string" ? raw : "";
  }, [params]);

  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [mealPlan, setMealPlan] = useState<JsonValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client" || !mealPlanId) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/client/meal-plans/${mealPlanId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as MealPlanDetailResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setMealPlan(null);
          return;
        }

        setMealPlan(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load meal plan detail.");
          setMealPlan(null);
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
  }, [mealPlanId, status, user]);

  async function handleStartCheckout() {
    setCheckoutLoading(true);
    setCheckoutError(null);
    setCheckoutSuccess(null);
    setCheckoutUrl(null);
    setCheckoutSessionId(null);

    try {
      const response = await fetch("/api/client/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal_plan_id: mealPlanId,
        }),
      });
      const payload = (await response.json()) as CheckoutSessionResponse;

      if (!payload.ok) {
        setCheckoutError(payload.error.message);
        return;
      }

      const data = payload.data;
      const responseObject =
        typeof data === "object" && data !== null && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : null;

      const returnedCheckoutUrl =
        responseObject && typeof responseObject.checkout_url === "string"
          ? responseObject.checkout_url
          : null;
      const returnedSessionId =
        responseObject && typeof responseObject.session_id === "string"
          ? responseObject.session_id
          : null;

      setCheckoutUrl(returnedCheckoutUrl);
      setCheckoutSessionId(returnedSessionId);

      if (returnedCheckoutUrl) {
        setCheckoutSuccess("Checkout session created. Use the link below to proceed.");
        return;
      }

      if (returnedSessionId) {
        setCheckoutSuccess("Checkout session created successfully.");
        return;
      }

      setCheckoutSuccess("Checkout session created through the BFF.");
    } catch {
      setCheckoutError("Unable to create checkout session.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (status === "loading") {
    return <LoadingBlock title="Loading meal plan" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="Meal plan detail requires an authenticated client session."
      />
    );
  }

  const title = mealPlan ? getTextField(mealPlan, ["name", "title"]) : null;
  const vendor = mealPlan ? getTextField(mealPlan, ["vendor", "vendor_name"]) : null;
  const description = mealPlan ? getTextField(mealPlan, ["description", "summary"]) : null;
  const price = mealPlan ? getPriceField(mealPlan) : null;
  const meals = mealPlan ? getMealsPreview(mealPlan) : [];

  return (
    <PageShell
      title={title ?? "Meal Plan Detail"}
      user={user}
      navigation={<Link href="/client/meal-plans">Back to Meal Plans</Link>}
    >
      {vendor ? (
        <Section>
          <p style={{ margin: 0 }}>
            <strong>Vendor:</strong> {vendor}
          </p>
        </Section>
      ) : null}

      {loading ? (
        <LoadingBlock
          title="Loading detail"
          message={`Fetching /api/client/meal-plans/${mealPlanId || "..."}.`}
        />
      ) : null}

      {errorMessage ? (
        <ErrorBlock title="Unable to load meal plan detail" message={errorMessage} />
      ) : null}

      {mealPlan ? (
        <>
          <Section title="Overview">
            {description ? <p>{description}</p> : <p>No description returned.</p>}
            {price ? <p><strong>Pricing:</strong> {price}</p> : <p>No pricing returned.</p>}
          </Section>

          <Section title="Meals / Structure">
            {meals.length > 0 ? (
              <ul>
                {getArrayItems(meals).slice(0, 6).map((item, index) => (
                  <li key={index}>
                    <JsonPreview value={item} />
                  </li>
                ))}
              </ul>
            ) : (
              <p>No included meals were returned.</p>
            )}
          </Section>

          <Section title="Selection">
            <button type="button" onClick={() => setSelectedPlanId(mealPlanId)}>
              Select Plan
            </button>
            {selectedPlanId === mealPlanId ? (
              <p style={{ color: "#86efac" }}>This plan is selected locally in the current page session.</p>
            ) : (
              <p>No plan selected yet in this page session.</p>
            )}
          </Section>

          <Section title="Checkout">
            <button
              type="button"
              onClick={() => void handleStartCheckout()}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? "Creating Checkout Session..." : "Start Checkout"}
            </button>
            {checkoutSuccess ? <p style={{ color: "#86efac" }}>{checkoutSuccess}</p> : null}
            {checkoutError ? <p style={{ color: "#fca5a5" }}>{checkoutError}</p> : null}
            {checkoutUrl ? (
              <p>
                Proceed to Checkout:{" "}
                <a href={checkoutUrl} target="_blank" rel="noreferrer">
                  {checkoutUrl}
                </a>
              </p>
            ) : null}
            {checkoutSessionId ? (
              <p>
                Checkout Session ID: <code>{checkoutSessionId}</code>
              </p>
            ) : null}
          </Section>

          <Section title="Metadata">
            <JsonPreview value={mealPlan} />
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
