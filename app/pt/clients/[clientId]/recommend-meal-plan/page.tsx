"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { JsonPreview, getArrayItems, getEntityId } from "@/components/JsonPreview";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonObject, JsonValue } from "@/lib/types/api";

type JsonApiResponse = ApiResponse<JsonValue>;

type MealRecommendationFormState = {
  meal_plan_id: string;
  rationale: string;
  recommended_at: string;
  expires_at: string;
};

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

  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return parsed.toISOString();
}

function getMealPlanLabel(mealPlan: JsonValue, fallbackIndex: number): string {
  const title = getTextField(mealPlan, ["title", "name"]);
  const vendor = getTextField(mealPlan, ["vendor", "vendor_name"]);
  const mealPlanId = getTextField(mealPlan, ["id", "meal_plan_id"]);

  const parts = [title, vendor].filter((value): value is string => Boolean(value));

  if (mealPlanId) {
    parts.push(mealPlanId);
  }

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  return `Meal Plan #${fallbackIndex + 1}`;
}

function getRecommendationSummary(recommendation: JsonValue) {
  return {
    id: getTextField(recommendation, ["id", "recommendation_id"]),
    mealPlanId: getTextField(recommendation, ["meal_plan_id"]),
    status: getTextField(recommendation, ["status"]),
    recommendedAt: getTextField(recommendation, ["recommended_at"]),
    expiresAt: getTextField(recommendation, ["expires_at"]),
  };
}

function getMealPlanSummary(mealPlan: JsonValue) {
  return {
    id: getTextField(mealPlan, ["id", "meal_plan_id"]),
    title: getTextField(mealPlan, ["title", "name"]),
    vendor: getTextField(mealPlan, ["vendor", "vendor_name"]),
  };
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
          setMealPlansData(null);
          setRecommendationsData(null);
          return;
        }

        if (!recommendationsPayload.ok) {
          setLoadError(recommendationsPayload.error.message);
          setMealPlansData(null);
          setRecommendationsData(null);
          return;
        }

        setMealPlansData(mealPlansPayload.data);
        setRecommendationsData(recommendationsPayload.data);
      } catch {
        if (active) {
          setLoadError("Unable to load meal plans and recommendations.");
          setMealPlansData(null);
          setRecommendationsData(null);
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

  const mealPlans = mealPlansData ? getArrayItems(mealPlansData) : [];
  const recommendations = recommendationsData ? getArrayItems(recommendationsData) : [];
  const hasMealPlanOptions = mealPlans.some((mealPlan) => Boolean(getEntityId(mealPlan)));

  useEffect(() => {
    if (formState.meal_plan_id || !hasMealPlanOptions || !mealPlansData) {
      return;
    }

    const firstMealPlanId = getArrayItems(mealPlansData)
      .map((mealPlan) => getEntityId(mealPlan))
      .find((value) => Boolean(value));

    if (firstMealPlanId) {
      setFormState((current) => ({
        ...current,
        meal_plan_id: firstMealPlanId,
      }));
    }
  }, [formState.meal_plan_id, hasMealPlanOptions, mealPlansData]);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState.meal_plan_id.trim()) {
      setSubmitError("Meal plan id is required.");
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
        meal_plan_id: hasMealPlanOptions ? current.meal_plan_id : "",
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
      title="Recommend Meal Plan"
      user={user}
      navigation={
        <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/pt/clients">Back to PT Clients</Link>
        </nav>
      }
    >
      <Section title="Header / Navigation">
        <p style={{ margin: 0 }}>
          <strong>Client Id:</strong> <code>{clientId || "Unavailable"}</code>
        </p>
        <p style={{ margin: 0 }}>
          Meal plans and client recommendations are loaded only through PT BFF routes under <code>/api/*</code>.
        </p>
      </Section>

      {loading ? (
        <LoadingBlock
          title="Loading recommendation data"
          message="Fetching PT meal plans and this client's existing meal recommendations."
        />
      ) : null}

      {loadError ? <ErrorBlock title="Unable to load recommendation data" message={loadError} /> : null}

      <Section title="Existing Recommendations">
        {!loading && !loadError && recommendations.length === 0 ? (
          <p>No meal recommendations returned for this client.</p>
        ) : null}

        {recommendations.map((recommendation, index) => {
          const summary = getRecommendationSummary(recommendation);

          return (
            <div
              key={summary.id ?? `recommendation-${index}`}
              style={{ borderTop: index > 0 ? "1px solid #334155" : undefined, paddingTop: index > 0 ? 12 : 0 }}
            >
              <p style={{ margin: 0 }}>
                <strong>Recommendation Id:</strong> <code>{summary.id ?? "Unavailable"}</code>
              </p>
              <p style={{ margin: 0 }}>
                <strong>Meal Plan Id:</strong> <code>{summary.mealPlanId ?? "Unavailable"}</code>
              </p>
              <p style={{ margin: 0 }}>
                <strong>Status:</strong> {summary.status ?? "Unavailable"}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Recommended At:</strong> {summary.recommendedAt ?? "Unavailable"}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Expires At:</strong> {summary.expiresAt ?? "Unavailable"}
              </p>
              <JsonPreview value={recommendation} />
            </div>
          );
        })}

        {!loading && !loadError ? <JsonPreview value={recommendationsData ?? []} /> : null}
      </Section>

      <Section title="Available Meal Plans">
        {!loading && !loadError && mealPlans.length === 0 ? <p>No meal plans returned from PT search.</p> : null}

        {mealPlans.map((mealPlan, index) => {
          const summary = getMealPlanSummary(mealPlan);

          return (
            <div
              key={summary.id ?? `meal-plan-${index}`}
              style={{ borderTop: index > 0 ? "1px solid #334155" : undefined, paddingTop: index > 0 ? 12 : 0 }}
            >
              <p style={{ margin: 0 }}>
                <strong>Title:</strong> {summary.title ?? "Unavailable"}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Id:</strong> <code>{summary.id ?? "Unavailable"}</code>
              </p>
              <p style={{ margin: 0 }}>
                <strong>Vendor:</strong> {summary.vendor ?? "Unavailable"}
              </p>
              <JsonPreview value={mealPlan} />
            </div>
          );
        })}

        {!loading && !loadError ? <JsonPreview value={mealPlansData ?? []} /> : null}
      </Section>

      <Section title="Recommend Meal Plan Form">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Meal Plan Id</span>
            {hasMealPlanOptions ? (
              <select
                value={formState.meal_plan_id}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    meal_plan_id: event.target.value,
                  }))
                }
                disabled={submitting || loading || Boolean(loadError)}
              >
                <option value="" disabled>
                  Select a meal plan
                </option>
                {mealPlans.map((mealPlan, index) => {
                  const mealPlanId = getEntityId(mealPlan);

                  if (!mealPlanId) {
                    return null;
                  }

                  return (
                    <option key={mealPlanId} value={mealPlanId}>
                      {getMealPlanLabel(mealPlan, index)}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                type="text"
                value={formState.meal_plan_id}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    meal_plan_id: event.target.value,
                  }))
                }
                placeholder="Enter meal plan id"
                disabled={submitting || loading || Boolean(loadError)}
              />
            )}
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Rationale</span>
            <textarea
              value={formState.rationale}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  rationale: event.target.value,
                }))
              }
              placeholder="Optional rationale"
              rows={4}
              disabled={submitting || loading || Boolean(loadError)}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Recommended At</span>
            <input
              type="datetime-local"
              value={formState.recommended_at}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  recommended_at: event.target.value,
                }))
              }
              disabled={submitting || loading || Boolean(loadError)}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Expires At</span>
            <input
              type="datetime-local"
              value={formState.expires_at}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  expires_at: event.target.value,
                }))
              }
              disabled={submitting || loading || Boolean(loadError)}
            />
          </label>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" disabled={submitting || loading || Boolean(loadError)}>
              {submitting ? "Submitting..." : "Recommend Meal Plan"}
            </button>
            {submitSuccess ? <span>{submitSuccess}</span> : null}
          </div>
        </form>

        {submitError ? <ErrorBlock title="Unable to create meal recommendation" message={submitError} /> : null}
      </Section>
    </PageShell>
  );
}
