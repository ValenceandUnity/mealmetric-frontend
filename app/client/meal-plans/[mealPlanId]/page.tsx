"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
import { isObject, pickNumber, pickOptionalText } from "@/lib/adapters/common";
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
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false);

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
    setRedirectingToCheckout(false);

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
        setCheckoutError("We couldn't start checkout. Please try again.");
        return;
      }

      const data =
        typeof payload.data === "object" && payload.data !== null && !Array.isArray(payload.data)
          ? payload.data
          : null;

      const returnedCheckoutUrl = data && typeof data.checkout_url === "string" ? data.checkout_url : null;

      setCheckoutUrl(returnedCheckoutUrl);
      setCheckoutSuccess(
        returnedCheckoutUrl
          ? "Ordering options are ready. Continue when you want to review the next step."
          : "Ordering options were prepared for this meal plan.",
      );
    } catch {
      setCheckoutError("We couldn't start checkout. Please try again.");
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
  const detail = isObject(mealPlan) ? mealPlan : null;
  const vendorName = pickOptionalText(detail, ["vendor_name", "vendor"]) ?? view.summary.vendor ?? "Meal plan source";
  const statusLabel = pickOptionalText(detail, ["status"]);
  const calories = pickNumber(detail, ["total_calories"]);
  const availabilityCount = pickNumber(detail, ["availability_count"]);
  const itemCount = pickNumber(detail, ["item_count"]);
  const selected = selectedPlanId === mealPlanId;
  const hasMacroSummary = view.macros.length > 0;
  const hasVendorDetails = view.vendorDetails.length > 0;
  const actionState = checkoutUrl ? "ready" : selected ? "selected" : "default";
  const actionTitle =
    actionState === "ready"
      ? "Ordering options ready"
      : actionState === "selected"
        ? "Plan selected"
        : "Review this plan";
  const actionDescription =
    actionState === "ready"
      ? "Your next step is ready when you want to continue."
      : actionState === "selected"
        ? "This meal plan is selected in your current page session."
        : "Selection stays local until you decide to continue.";
  const actionHelperText =
    actionState === "ready"
      ? "You're about to continue to secure checkout"
      : actionState === "selected"
        ? "Choose how you'd like to proceed with this plan"
        : "Select this plan to view ordering options";

  return (
    <PageShell
      title={view.summary.title}
      user={user}
      className="app-shell--client-meal-plans"
      hideTopHub
      navigation={<Link className="link-button" href="/client/meal-plans">Back to meal plans</Link>}
    >
      {loading ? <LoadingBlock title="Loading detail" message={`Fetching /api/client/meal-plans/${mealPlanId}.`} /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load meal plan detail" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Card className="client-meal-plan-detail-hero" variant="soft" as="section">
            {view.heroImageUrl ? (
              <div className="client-meal-plan-detail-hero__media">
                <div className="client-meal-plan-detail-hero__image-wrap">
                  <Image
                    src={view.heroImageUrl}
                    alt={view.summary.title}
                    fill
                    unoptimized
                    className="client-meal-plan-detail-hero__image"
                    sizes="(max-width: 768px) 100vw, 960px"
                  />
                </div>
              </div>
            ) : null}
            <PageHeader
              eyebrow="Meal plan"
              title={view.summary.title}
              description={vendorName}
              status={statusLabel ? { label: statusLabel, tone: "accent" } : undefined}
              chips={[
                calories ? `${calories} Calories` : "",
                view.summary.price,
              ].filter(Boolean)}
            />
          </Card>

          <Card className="client-meal-plan-detail-summary" variant="accent" as="section">
            <PageHeader
              eyebrow="Overview"
              title="Plan snapshot"
              description={view.summary.description}
            />
            <div className="client-meal-plan-detail-summary__body">
              <div className="client-meal-plan-detail-summary__stats">
                <StatPill label="Price" value={view.summary.price} active />
                {calories ? <StatPill label="Calories" value={`${calories}`} /> : null}
                <StatPill label="Included meals" value={itemCount ? `${itemCount}` : view.summary.mealCount} />
                {availabilityCount ? <StatPill label="Availability" value={`${availabilityCount}`} /> : null}
              </div>
              {hasMacroSummary ? (
                <div className="client-meal-plan-detail-macros" aria-label="Macro summary">
                  {view.macros.map((macro) => (
                    <Card
                      key={macro.label}
                      className="client-meal-plan-detail-macros__item"
                      variant="ghost"
                      as="div"
                    >
                      <p className="client-meal-plan-detail-macros__label">{macro.label}</p>
                      <p className="client-meal-plan-detail-macros__value">{macro.value}</p>
                    </Card>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          <SectionBlock
            eyebrow="Included"
            title="What's included"
            description={
              view.includedMeals.length > 0 || view.meals.length > 0
                ? "These meal items are currently surfaced in the selected plan."
                : "This meal plan is available, but the current detail view does not include named meal items."
            }
          >
            {view.includedMeals.length > 0 ? (
              <div className="client-meal-plan-detail-includes">
                {view.includedMeals.map((meal, index) => (
                  <Card key={`${meal.name}-${index}`} className="client-meal-plan-detail-includes__item" variant="ghost">
                    <div className="client-meal-plan-detail-includes__header">
                      <p className="client-meal-plan-detail-includes__eyebrow">Included meal</p>
                      <h3 className="client-meal-plan-detail-includes__title">{meal.name}</h3>
                    </div>
                    {meal.metadata.length > 0 ? (
                      <dl className="client-meal-plan-detail-includes__meta">
                        {meal.metadata.map((entry) => (
                          <div
                            key={`${meal.name}-${entry.label}-${entry.value}`}
                            className="client-meal-plan-detail-includes__meta-item"
                          >
                            <dt>{entry.label}</dt>
                            <dd>{entry.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </Card>
                ))}
              </div>
            ) : view.meals.length > 0 ? (
              <div className="client-meal-plan-detail-includes">
                {view.meals.map((meal, index) => (
                  <Card key={`${meal}-${index}`} className="client-meal-plan-detail-includes__item" variant="ghost">
                    <p className="client-meal-plan-detail-includes__eyebrow">Included meal</p>
                    <h3 className="client-meal-plan-detail-includes__title">{meal}</h3>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Included meals are not listed yet"
                message="Use the overview above to evaluate the plan while more detailed contents remain unavailable."
              />
            )}
          </SectionBlock>

          {hasVendorDetails ? (
            <SectionBlock
              eyebrow="Vendor"
              title="Vendor and fulfillment"
              description="Source details shown only when the current meal plan payload supports them."
            >
              <Card className="client-meal-plan-detail-vendor" variant="soft">
                <dl className="client-meal-plan-detail-vendor__list">
                  {view.vendorDetails.map((entry) => (
                    <div key={`${entry.label}-${entry.value}`} className="client-meal-plan-detail-vendor__row">
                      <dt>{entry.label}</dt>
                      <dd>{entry.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="client-meal-plan-detail-vendor__stats">
                  {availabilityCount ? (
                    <StatPill
                      label="Availability windows"
                      value={`${availabilityCount}`}
                      hint="Shown only because this detail payload exposes availability count."
                    />
                  ) : null}
                </div>
              </Card>
            </SectionBlock>
          ) : null}

          <SectionBlock
            eyebrow="Next step"
            title="Choose how to continue"
            description="Keep selection local to this page, or open the currently supported ordering options."
          >
            <Card
              className={[
                "client-meal-plan-detail-actions",
                `client-meal-plan-detail-actions--${actionState}`,
              ].join(" ")}
              variant="soft"
            >
              <PageHeader
                eyebrow="Next step"
                title={actionTitle}
                description={actionDescription}
              />
              <div className="client-meal-plan-detail-actions__cta">
                {actionState === "ready" && checkoutUrl ? (
                  <a
                    className="link-button link-button--accent"
                    href={checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setRedirectingToCheckout(true)}
                  >
                    Secure Checkout
                  </a>
                ) : actionState === "selected" ? (
                  <button
                    type="button"
                    className="client-meal-plan-detail-actions__primary client-meal-plan-detail-actions__primary--selected"
                    onClick={() => void handleStartCheckout()}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? "Preparing..." : "View Ordering Options"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="client-meal-plan-detail-actions__primary"
                    onClick={() => {
                      setRedirectingToCheckout(false);
                      setSelectedPlanId(mealPlanId);
                    }}
                  >
                    Select Plan
                  </button>
                )}
                <p className="client-meal-plan-detail-actions__helper">{actionHelperText}</p>
              </div>
              {actionState === "selected" ? (
                <Card className="client-meal-plan-detail-ordering" variant="ghost" as="div">
                  <p className="client-meal-plan-detail-ordering__eyebrow">Ordering options</p>
                  <h3 className="client-meal-plan-detail-ordering__title">{view.summary.title}</h3>
                  <p className="client-meal-plan-detail-ordering__body">
                    You&apos;ll be redirected to complete your order.
                  </p>
                  <dl className="client-meal-plan-detail-ordering__meta">
                    <div className="client-meal-plan-detail-ordering__meta-row">
                      <dt>Plan</dt>
                      <dd>{view.summary.title}</dd>
                    </div>
                    {vendorName ? (
                      <div className="client-meal-plan-detail-ordering__meta-row">
                        <dt>Vendor</dt>
                        <dd>{vendorName}</dd>
                      </div>
                    ) : null}
                    <div className="client-meal-plan-detail-ordering__meta-row">
                      <dt>Summary</dt>
                      <dd>{view.summary.description}</dd>
                    </div>
                  </dl>
                </Card>
              ) : null}
              {actionState === "selected" ? (
                <p className="status-text status-text--success">Plan selected for this session.</p>
              ) : null}
              {redirectingToCheckout ? (
                <p className="status-text status-text--success">Redirecting to secure checkout...</p>
              ) : null}
              {checkoutSuccess ? <p className="status-text status-text--success">{checkoutSuccess}</p> : null}
              {checkoutError ? <p className="status-text status-text--danger">{checkoutError}</p> : null}
            </Card>
          </SectionBlock>
        </>
      ) : null}
    </PageShell>
  );
}
