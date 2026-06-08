"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { startTransition, type FormEvent, type ReactNode, useDeferredValue, useEffect, useState } from "react";

import { DebugPreview } from "@/components/ui/DebugPreview";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileMealPlanRow } from "@/components/mobile/MobileMealPlanRow";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import { adaptPTRecommendationPageView, type MobilePTRecommendationHistoryView, type MobilePTRecommendationMealPlanView } from "@/lib/view-models/meal-plans";

type JsonApiResponse = ApiResponse<JsonValue>;

type MealRecommendationFormState = {
  meal_plan_id: string;
  rationale: string;
  recommended_at: string;
  expires_at: string;
};

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type RecommendationStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
};

type RecommendationMealPlanCardProps = {
  mealPlan: MobilePTRecommendationMealPlanView;
  onSelect: (mealPlanId: string) => void;
};

type RecommendationHistoryCardProps = {
  recommendation: MobilePTRecommendationHistoryView;
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

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function RecommendationStateCard({
  title,
  message,
  action,
  role = "status",
}: RecommendationStateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy" role={role} aria-live="polite">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

function RecommendationMealPlanCard({
  mealPlan,
  onSelect,
}: RecommendationMealPlanCardProps) {
  return (
    <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
      <MobileMealPlanRow
        name={mealPlan.name}
        vendorName={`${mealPlan.vendorName} | ${mealPlan.vendorZipLabel}`}
        calories={mealPlan.caloriesLabel.replace(/\s*cal$/i, "")}
        price={mealPlan.priceLabel}
        badge={
          <span className={`mobile-pill ${mealPlan.isSelected ? "mobile-pill--yellow" : "mobile-pill--purple"}`}>
            {mealPlan.isSelected ? "Selected" : mealPlan.statusLabel}
          </span>
        }
        action={mealPlan.canSelect ? (
          <button
            type="button"
            className={`mobile-pill ${mealPlan.isSelected ? "mobile-pill--yellow" : "mobile-pill--purple"} mobile-focus-ring`}
            aria-label={mealPlan.selectActionLabel}
            onClick={() => {
              if (mealPlan.id) {
                onSelect(mealPlan.id);
              }
            }}
          >
            {mealPlan.isSelected ? "Selected" : "Select plan"}
          </button>
        ) : (
          <span className="mobile-pill">ID unavailable</span>
        )}
      />

      <p className="mobile-section__description">{mealPlan.description}</p>

      <dl className="mobile-pt-fact-grid">
        <div>
          <dt>Vendor ZIP</dt>
          <dd>{mealPlan.vendorZipLabel}</dd>
        </div>
        <div>
          <dt>Calories</dt>
          <dd>{mealPlan.caloriesLabel}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{mealPlan.priceLabel}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{mealPlan.itemCountLabel}</dd>
        </div>
        <div>
          <dt>Availability</dt>
          <dd>{mealPlan.availabilityLabel}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{mealPlan.statusLabel}</dd>
        </div>
      </dl>
    </MobileCard>
  );
}

function RecommendationHistoryCard({
  recommendation,
}: RecommendationHistoryCardProps) {
  return (
    <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
      <div className="mobile-pt-client-card__header">
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">{recommendation.eyebrow}</p>
          <h3 className="mobile-section__title">{recommendation.title}</h3>
          <p className="mobile-section__description">{recommendation.description}</p>
        </div>
        <span className="mobile-pill mobile-pill--purple">{recommendation.eyebrow}</span>
      </div>

      <dl className="mobile-pt-training-meta-grid">
        {recommendation.metadata.map((item) => (
          <div key={`${recommendation.id ?? recommendation.title}-${item.label}`}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </MobileCard>
  );
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
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);
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

  const view = adaptPTRecommendationPageView({
    clientId,
    mealPlans: mealPlansData,
    recommendations: recommendationsData,
    query: deferredSearch,
    selectedMealPlanId: formState.meal_plan_id,
    submitting,
  });

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
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="Recommend meal plan"
      subtitle={`${view.client.clientDisplayLabel} | ${view.client.clientEmailLabel}`}
      searchLabel="Filter recommendable meal plans"
      searchPlaceholder="Filter loaded meal plans"
      searchValue={searchValue}
      onSearchChange={(nextValue) => {
        startTransition(() => {
          setSearchValue(nextValue);
        });
      }}
      notificationSlot={<ActionPill href={`/pt/clients/${clientId}`} tone="purple">Client overview</ActionPill>}
      topHubAction={<ActionPill href="/pt/clients">Back to clients</ActionPill>}
      activePath="/pt/meal-plans"
    >
      {loading ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading recommendation data"
          description="Fetching PT meal plans and existing client recommendations through the protected PT BFF routes."
        >
          <RecommendationStateCard
            title="Loading recommendation data"
            message="Fetching PT meal plans and client recommendations."
          />
        </MobileSection>
      ) : null}

      {loadError ? (
        <MobileSection
          eyebrow="Unavailable"
          title="Unable to load recommendation data"
          description="This workflow stays on protected PT routes and does not fall back to direct backend calls."
        >
          <RecommendationStateCard
            title="Recommendation data unavailable"
            message={loadError}
            action={<ActionPill href={`/pt/clients/${clientId}`} tone="purple">Client overview</ActionPill>}
            role="alert"
          />
        </MobileSection>
      ) : null}

      {!loading && !loadError ? (
        <>
          <MobileSection
            eyebrow="Client context"
            title="Recommendation workspace"
            description="Guide the client with a plan, rationale, and timing without stepping outside the PT BFF routes."
          >
            <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Linked client</p>
                  <h3 className="mobile-section__title">{view.client.clientDisplayLabel}</h3>
                  <p className="mobile-section__description">{view.client.contextNote}</p>
                </div>
                <span className="mobile-pill mobile-pill--yellow">{view.client.clientEmailLabel}</span>
              </div>

              <dl className="mobile-pt-training-meta-grid">
                <div>
                  <dt>Client ID</dt>
                  <dd>{view.client.clientId}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{view.client.clientEmailLabel}</dd>
                </div>
              </dl>
            </MobileCard>

            {view.summaryCards.map((item) => (
              <MobileStatCard
                key={item.label}
                label={item.label}
                value={item.value}
                progressText={item.progressText}
              />
            ))}
          </MobileSection>

          <MobileSection
            eyebrow="Create"
            title="Create recommendation"
            description="This action preserves the current PT create route, payload shape, and recommendation feedback."
          >
            <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Selected meal plan</p>
                  <h3 className="mobile-section__title">{view.action.selectedMealPlanLabel}</h3>
                  <p className="mobile-section__description">
                    {view.action.disabledReason ?? "The current selection will be sent to the protected PT recommendation route."}
                  </p>
                </div>
                <span className="mobile-pill mobile-pill--yellow">
                  {view.action.selectedMealPlanId || "ID required"}
                </span>
              </div>

              <form className="mobile-pt-form-grid" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="meal_plan_id">Meal plan</label>
                  {view.action.hasSelectablePlans ? (
                    <select
                      id="meal_plan_id"
                      value={formState.meal_plan_id}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, meal_plan_id: event.target.value }))
                      }
                      disabled={submitting}
                    >
                      {view.mealPlans
                        .filter((mealPlan) => Boolean(mealPlan.id))
                        .map((mealPlan) =>
                          mealPlan.id ? (
                            <option key={mealPlan.id} value={mealPlan.id}>
                              {mealPlan.name}
                            </option>
                          ) : null,
                        )}
                    </select>
                  ) : (
                    <input
                      id="meal_plan_id"
                      value={formState.meal_plan_id}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, meal_plan_id: event.target.value }))
                      }
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
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, rationale: event.target.value }))
                    }
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
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, expires_at: event.target.value }))
                    }
                    disabled={submitting}
                  />
                </div>

                <div className="mobile-pt-actions">
                  <button
                    type="submit"
                    className="mobile-pt-button mobile-focus-ring"
                    disabled={!view.action.canSubmit}
                  >
                    {view.action.submitLabel}
                  </button>
                  <ActionPill href={`/pt/clients/${clientId}`} tone="purple">Client overview</ActionPill>
                </div>
              </form>
            </MobileCard>

            {submitSuccess ? (
              <RecommendationStateCard
                title="Meal recommendation created"
                message={submitSuccess}
              />
            ) : null}

            {submitError ? (
              <RecommendationStateCard
                title="Meal recommendation failed"
                message={submitError}
                role="alert"
              />
            ) : null}
          </MobileSection>

          <MobileSection
            eyebrow="Discovery"
            title="Recommendable plans"
            description="The PT meal-plan route still loads on page entry, and this mobile filter stays local without changing the request shape."
          >
            <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Current filter</p>
                  <h3 className="mobile-section__title">{view.search.queryLabel}</h3>
                  <p className="mobile-section__description">{view.search.note}</p>
                </div>
                <span className="mobile-pill mobile-pill--yellow">{view.search.stateLabel}</span>
              </div>
            </MobileCard>

            {view.mealPlans.length > 0 ? (
              <div className="mobile-pt-detail-stack">
                {view.mealPlans.map((mealPlan) => (
                  <RecommendationMealPlanCard
                    key={mealPlan.id ?? mealPlan.name}
                    mealPlan={mealPlan}
                    onSelect={(mealPlanId) => {
                      setFormState((current) => ({ ...current, meal_plan_id: mealPlanId }));
                    }}
                  />
                ))}
              </div>
            ) : (
              <RecommendationStateCard
                title={view.mealPlanEmptyState?.title ?? "No meal plans returned"}
                message={
                  view.mealPlanEmptyState?.message ??
                  "The PT meal-plan search route did not return recommendable plans."
                }
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="History"
            title="Recommendation history"
            description="Existing recommendations stay visible through the current PT history route."
          >
            {view.hasRecommendations ? (
              <div className="mobile-pt-detail-stack">
                {view.recommendations.map((recommendation) => (
                  <RecommendationHistoryCard
                    key={recommendation.id ?? recommendation.title}
                    recommendation={recommendation}
                  />
                ))}
              </div>
            ) : (
              <>
                <RecommendationStateCard
                  title={view.recommendationEmptyState?.title ?? "No recommendations returned"}
                  message={
                    view.recommendationEmptyState?.message ??
                    "This client does not yet have meal-plan recommendations from the PT endpoints."
                  }
                />
                {view.historyDebugData ? (
                  <DebugPreview value={view.historyDebugData} label="Meal recommendations payload fallback" />
                ) : null}
              </>
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
