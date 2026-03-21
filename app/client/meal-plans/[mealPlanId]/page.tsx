"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { RecordCard } from "@/components/cards/RecordCard";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { PageShell } from "@/components/layout/PageShell";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import {
  getCheckoutSessionSummary,
} from "@/lib/adapters/client-records";
import { adaptMealPlanDetail } from "@/lib/adapters/meal-plans";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type MealPlanDetailResponse = ApiResponse<JsonValue>;
type CheckoutSessionResponse = ApiResponse<JsonValue>;

export default function ClientMealPlanDetailPage() {
  const params = useParams<{ mealPlanId: string }>();
  const mealPlanId = typeof params?.mealPlanId === "string" ? params.mealPlanId : "";

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
  const [checkoutData, setCheckoutData] = useState<JsonValue | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

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
    setCheckoutData(null);
    setCheckoutUrl(null);

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

      const data =
        typeof payload.data === "object" && payload.data !== null && !Array.isArray(payload.data)
          ? payload.data
          : null;

      const returnedCheckoutUrl = data && typeof data.checkout_url === "string" ? data.checkout_url : null;

      setCheckoutData(payload.data);
      setCheckoutUrl(returnedCheckoutUrl);
      setCheckoutSuccess(
        returnedCheckoutUrl
          ? "Checkout session created. Use the launch link below."
          : "Checkout session created through the BFF.",
      );
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
    return <LoadingBlock title="Redirecting" message="Meal plan detail requires an authenticated client session." />;
  }

  const view = adaptMealPlanDetail(mealPlan);
  const checkoutSummary = getCheckoutSessionSummary(checkoutData);

  return (
    <PageShell
      title={view.summary.title}
      user={user}
      navigation={<Link className="link-button" href="/client/meal-plans">Back to meal plans</Link>}
    >
      {loading ? <LoadingBlock title="Loading detail" message={`Fetching /api/client/meal-plans/${mealPlanId}.`} /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load meal plan detail" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Section title="Plan summary">
            <div className="grid grid--2">
              <SummaryCard label="Vendor" value={view.summary.vendor ?? "Unavailable"} hint="Meal plan provider returned by the client route." />
              <SummaryCard label="Meals" value={view.summary.mealCount} hint="Structured meal items included in this plan." />
            </div>
            <p className="section__copy">{view.summary.description}</p>
          </Section>

          <Section title="Included meals">
            {view.meals.length > 0 ? (
              <div className="stacked-list">
                {view.meals.map((meal) => (
                  <RecordCard
                    key={meal}
                    eyebrow="Included meal"
                    title={meal}
                    description="Part of the selected plan."
                    metadata={[
                      { label: "Plan ID", value: mealPlanId || "Unavailable" },
                      { label: "Price", value: view.summary.price },
                    ]}
                  />
                ))}
              </div>
            ) : (
              <>
                <EmptyState
                  title="No meal structure returned"
                  message="This payload did not include named meals or meal items."
                />
                {mealPlan ? <DebugPreview value={mealPlan} label="Meal-plan detail payload fallback" /> : null}
              </>
            )}
          </Section>

          <Section title="Selection and checkout">
            <RecordCard
              eyebrow={selectedPlanId === mealPlanId ? "Selected" : "Ready"}
              title={selectedPlanId === mealPlanId ? "Plan selected" : "Choose this plan"}
              description={
                selectedPlanId === mealPlanId
                  ? "This meal plan is selected in the current page session."
                  : "Selection remains local to this page until you start checkout."
              }
              metadata={[
                { label: "Plan ID", value: mealPlanId || "Unavailable" },
                { label: "Price", value: view.summary.price },
              ]}
              footer={
                <>
                  <button type="button" onClick={() => setSelectedPlanId(mealPlanId)}>
                    Select plan
                  </button>
                  <button type="button" onClick={() => void handleStartCheckout()} disabled={checkoutLoading}>
                    {checkoutLoading ? "Creating checkout..." : "Start checkout"}
                  </button>
                  {checkoutUrl ? (
                    <a className="link-button link-button--accent" href={checkoutUrl} target="_blank" rel="noreferrer">
                      Open checkout
                    </a>
                  ) : null}
                </>
              }
            />
            {checkoutSuccess ? <p className="status-text status-text--success">{checkoutSuccess}</p> : null}
            {checkoutError ? <p className="status-text status-text--danger">{checkoutError}</p> : null}
            {checkoutSummary.length > 0 ? (
              <div className="stacked-list">
                <RecordCard
                  eyebrow="Checkout session"
                  title="Checkout created"
                  description="The session was created through /api/client/checkout/session."
                  metadata={checkoutSummary}
                />
              </div>
            ) : null}
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
