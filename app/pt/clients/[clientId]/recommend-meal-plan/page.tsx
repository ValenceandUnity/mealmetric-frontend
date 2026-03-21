"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { RecordCard } from "@/components/cards/RecordCard";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { PageShell } from "@/components/layout/PageShell";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { adaptPTMealRecommendationWorkspace } from "@/lib/adapters/client-records";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type JsonApiResponse = ApiResponse<JsonValue>;

type MealRecommendationFormState = {
  meal_plan_id: string;
  rationale: string;
  recommended_at: string;
  expires_at: string;
};

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalDatetime(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

export default function PTRecommendMealPlanPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = typeof params?.clientId === "string" ? params.clientId : "";

  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [mealPlansData, setMealPlansData] = useState<JsonValue | null>(null);
  const [recommendationsData, setRecommendationsData] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<MealRecommendationFormState>({
    meal_plan_id: "",
    rationale: "",
    recommended_at: "",
    expires_at: "",
  });

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt" || !clientId) {
      return;
    }

    let active = true;

    async function loadPageData() {
      setLoading(true);
      setLoadError(null);

      try {
        const [mealPlansResponse, recommendationsResponse] = await Promise.all([
          fetch("/api/pt/meal-plans/search", { cache: "no-store" }),
          fetch(`/api/pt/clients/${clientId}/meal-plan-recommendations`, { cache: "no-store" }),
        ]);

        const [mealPlansPayload, recommendationsPayload] = (await Promise.all([
          mealPlansResponse.json(),
          recommendationsResponse.json(),
        ])) as [JsonApiResponse, JsonApiResponse];

        if (!active) {
          return;
        }

        if (!mealPlansPayload.ok) {
          setLoadError(mealPlansPayload.error.message);
          return;
        }

        if (!recommendationsPayload.ok) {
          setLoadError(recommendationsPayload.error.message);
          return;
        }

        setMealPlansData(mealPlansPayload.data);
        setRecommendationsData(recommendationsPayload.data);
      } catch {
        if (active) {
          setLoadError("Unable to load meal plans and recommendations.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPageData();

    return () => {
      active = false;
    };
  }, [clientId, status, user]);

  const view = adaptPTMealRecommendationWorkspace(mealPlansData, recommendationsData);

  useEffect(() => {
    if (formState.meal_plan_id || view.mealPlans.length === 0) {
      return;
    }

    const firstId = view.mealPlans.find((mealPlan) => Boolean(mealPlan.id))?.id;
    if (firstId) {
      setFormState((current) => ({ ...current, meal_plan_id: firstId }));
    }
  }, [formState.meal_plan_id, view.mealPlans]);

  async function refreshRecommendations() {
    const response = await fetch(`/api/pt/clients/${clientId}/meal-plan-recommendations`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as JsonApiResponse;
    if (!payload.ok) {
      throw new Error(payload.error.message);
    }

    setRecommendationsData(payload.data);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState.meal_plan_id.trim()) {
      setSubmitError("Meal plan ID is required.");
      setSubmitSuccess(null);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch(`/api/pt/clients/${clientId}/meal-plan-recommendations/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal_plan_id: formState.meal_plan_id,
          rationale: normalizeOptionalText(formState.rationale),
          recommended_at: normalizeOptionalDatetime(formState.recommended_at),
          expires_at: normalizeOptionalDatetime(formState.expires_at),
        }),
      });

      const payload = (await response.json()) as JsonApiResponse;

      if (!payload.ok) {
        setSubmitError(payload.error.message);
        return;
      }

      await refreshRecommendations();
      setSubmitSuccess("Meal recommendation created successfully.");
      setFormState((current) => ({
        ...current,
        rationale: "",
        recommended_at: "",
        expires_at: "",
      }));
    } catch {
      setSubmitError("Unable to create meal recommendation.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return <LoadingBlock title="Loading meal recommendation page" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  return (
    <PageShell
      title="Recommend meal plan"
      user={user}
      navigation={
        <>
          <Link className="link-button" href={`/pt/clients/${clientId}`}>
            Client overview
          </Link>
          <Link className="link-button" href="/pt/clients">
            Back to clients
          </Link>
        </>
      }
    >
      {loading ? <LoadingBlock title="Loading recommendation data" message="Fetching PT meal plans and client recommendations." /> : null}
      {loadError ? <ErrorBlock title="Unable to load recommendation data" message={loadError} /> : null}

      {!loading && !loadError ? (
        <>
          <Section title="Recommendation workspace">
            <div className="grid grid--2">
              {view.summary.map((item) => (
                <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
              ))}
            </div>
            <p className="section__copy">
              Guide the client with a plan, rationale, and timing without stepping outside the PT BFF routes.
            </p>
          </Section>

          <Section title="Create recommendation">
            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="field">
                <span>Meal plan</span>
                {view.mealPlans.some((mealPlan) => Boolean(mealPlan.id)) ? (
                  <select
                    value={formState.meal_plan_id}
                    onChange={(event) => setFormState((current) => ({ ...current, meal_plan_id: event.target.value }))}
                    disabled={submitting}
                  >
                    {view.mealPlans.map((mealPlan) =>
                      mealPlan.id ? (
                        <option key={mealPlan.id} value={mealPlan.id}>
                          {mealPlan.title}
                        </option>
                      ) : null,
                    )}
                  </select>
                ) : (
                  <input
                    value={formState.meal_plan_id}
                    onChange={(event) => setFormState((current) => ({ ...current, meal_plan_id: event.target.value }))}
                    disabled={submitting}
                  />
                )}
              </div>
              <div className="field">
                <label htmlFor="rationale">Recommendation rationale</label>
                <textarea
                  id="rationale"
                  rows={4}
                  value={formState.rationale}
                  onChange={(event) => setFormState((current) => ({ ...current, rationale: event.target.value }))}
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="recommended_at">Recommended at</label>
                <input
                  id="recommended_at"
                  type="datetime-local"
                  value={formState.recommended_at}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, recommended_at: event.target.value }))
                  }
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="expires_at">Expires at</label>
                <input
                  id="expires_at"
                  type="datetime-local"
                  value={formState.expires_at}
                  onChange={(event) => setFormState((current) => ({ ...current, expires_at: event.target.value }))}
                  disabled={submitting}
                />
              </div>
              <button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Recommend meal plan"}
              </button>
            </form>
            {submitSuccess ? <p className="status-text status-text--success">{submitSuccess}</p> : null}
            {submitError ? <p className="status-text status-text--danger">{submitError}</p> : null}
          </Section>

          <Section title="Recommendable plans">
            {view.mealPlans.length > 0 ? (
              <div className="stacked-list">
                {view.mealPlans.map((mealPlan, index) => (
                  <RecordCard
                    key={mealPlan.id ?? `${mealPlan.title}-${index}`}
                    eyebrow={mealPlan.vendor ?? "Meal plan"}
                    title={mealPlan.title}
                    description={mealPlan.description}
                    metadata={mealPlan.id ? [{ label: "Meal plan ID", value: mealPlan.id }] : []}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No meal plans returned"
                message="The PT meal-plan search route did not return recommendable plans."
              />
            )}
          </Section>

          <Section title="Recommendation history">
            {view.recommendations.length > 0 ? (
              <div className="stacked-list">
                {view.recommendations.map((recommendation, index) => (
                  <RecordCard
                    key={recommendation.id ?? `${recommendation.title}-${index}`}
                    eyebrow={recommendation.eyebrow}
                    title={recommendation.title}
                    description={recommendation.description}
                    metadata={recommendation.metadata}
                  />
                ))}
              </div>
            ) : (
              <>
                <EmptyState
                  title="No recommendations returned"
                  message="This client does not yet have meal-plan recommendations from the PT endpoints."
                />
                {view.debugData ? (
                  <DebugPreview value={view.debugData} label="Meal recommendations payload fallback" />
                ) : null}
              </>
            )}
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
