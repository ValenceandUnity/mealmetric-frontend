"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { PageShell } from "@/components/layout/PageShell";
import { MealPlanCard } from "@/components/meal-plans/MealPlanCard";
import { MetricCard } from "@/components/metrics/MetricCard";
import { ActionRow } from "@/components/ui/ActionRow";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, MealPlanListPayload } from "@/lib/types/api";

export default function VendorMealPlansPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "vendor",
    unauthenticatedRedirectTo: "/login",
  });

  const [mealPlans, setMealPlans] = useState<MealPlanListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || user?.role !== "vendor") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch("/api/vendor/meal-plans", { cache: "no-store" });
        const payload = (await response.json()) as ApiResponse<MealPlanListPayload>;
        if (!active) {
          return;
        }
        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          return;
        }
        setMealPlans(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load vendor meal plans.");
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

  const catalog = mealPlans?.items ?? [];
  const highlightedMealPlan = catalog[0] ?? null;
  const publishedCount = catalog.filter((mealPlan) => mealPlan.status.toLowerCase() === "published").length;
  const draftCount = catalog.length - publishedCount;

  if (status === "loading") {
    return <LoadingBlock title="Loading vendor meal plans" message="Validating your vendor session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Vendor access requires an authenticated vendor session." />;
  }

  return (
    <PageShell
      title="Vendor meal plans"
      user={user}
      navigation={
        <>
          <Link className="link-button" href="/vendor">
            Back to vendor dashboard
          </Link>
          <Link className="link-button" href="/vendor/metrics">
            View metrics
          </Link>
        </>
      }
    >
      {loading ? <LoadingBlock title="Loading meal plans" message="Fetching vendor meal-plan inventory." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load meal plans" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Card className="vendor-catalog-hero" variant="accent" as="section">
            <div className="vendor-catalog-hero__layout">
              <Card className="vendor-catalog-hero__lead" variant="soft">
                <PageHeader
                  eyebrow="Vendor catalog"
                  title="Catalog management workspace"
                  description="Review live meal-plan inventory, understand current catalog shape, and move into the vendor dashboard or metrics workspace without implying unsupported editing or operations behavior."
                  chips={[
                    "Catalog visibility",
                    "Read-only inventory",
                    "BFF-backed meal plans",
                  ]}
                  actions={
                    <ActionRow>
                      <Link className="link-button link-button--accent" href="/vendor">
                        Vendor dashboard
                      </Link>
                      <Link className="link-button" href="/vendor/metrics">
                        Performance
                      </Link>
                    </ActionRow>
                  }
                />
                <div className="vendor-catalog-hero__stats">
                  <StatPill
                    label="Catalog"
                    value={`${catalog.length}`}
                    hint="Meal plans currently returned through /api/vendor/meal-plans."
                    active
                  />
                  <StatPill
                    label="Published"
                    value={`${publishedCount}`}
                    hint="Visible published entries inferred from returned statuses."
                  />
                  <StatPill
                    label="Draft"
                    value={`${draftCount}`}
                    hint="Entries not marked published in the current catalog payload."
                  />
                  <StatPill
                    label="Workspace"
                    value="Inventory"
                    hint="This route stays focused on plan visibility, not editing or fulfillment."
                  />
                </div>
              </Card>

              <Card className="vendor-catalog-hero__focus" variant="default">
                <PageHeader
                  eyebrow="Catalog spotlight"
                  title={highlightedMealPlan ? highlightedMealPlan.name : "No catalog spotlight yet"}
                  description={
                    highlightedMealPlan
                      ? "A single meal plan is surfaced here to anchor the catalog visually and give the vendor a quick read on the current inventory shape."
                      : "When the vendor catalog returns meal plans, the first visible entry will appear here as the current spotlight."
                  }
                />
                {highlightedMealPlan ? (
                  <>
                    <ListRow
                      eyebrow={highlightedMealPlan.vendor_name}
                      title={highlightedMealPlan.name}
                      description={
                        highlightedMealPlan.description ??
                        "Meal-plan configuration available through the vendor catalog route."
                      }
                      metadata={[
                        { label: "Status", value: highlightedMealPlan.status },
                        { label: "Meals", value: `${highlightedMealPlan.item_count}` },
                        { label: "Availability", value: `${highlightedMealPlan.availability_count}` },
                        { label: "ZIP", value: highlightedMealPlan.vendor_zip_code ?? "Unavailable" },
                      ]}
                      status={{ label: highlightedMealPlan.status, tone: "accent" }}
                    />
                    <div className="vendor-catalog-hero__chips">
                      <Chip tone="accent">{`$${(highlightedMealPlan.total_price_cents / 100).toFixed(2)}`}</Chip>
                      <Chip tone="muted">{`${highlightedMealPlan.total_calories} calories`}</Chip>
                      <Chip tone="muted">{`${highlightedMealPlan.item_count} meals`}</Chip>
                    </div>
                    <ActionRow>
                      <Link className="link-button" href="/vendor">
                        Return to dashboard
                      </Link>
                      <Link className="link-button" href="/vendor/metrics">
                        Compare metrics
                      </Link>
                    </ActionRow>
                  </>
                ) : (
                  <EmptyState
                    title="No meal-plan spotlight"
                    message="The spotlight remains empty until the vendor meal-plan route returns at least one plan."
                  />
                )}
              </Card>
            </div>
          </Card>

          <SectionBlock
            eyebrow="Overview"
            title="Catalog overview"
            description="Separate catalog-wide visibility from plan-level scanning and route-safe next actions."
          >
            <div className="vendor-catalog-overview">
              <AnalyticsCard
                eyebrow="Catalog summary"
                title="Current inventory shape"
                description="This summary is derived only from the live vendor catalog payload and stays honest about the currently supported read-only surface."
                stats={[
                  { label: "Meal plans", value: `${catalog.length}` },
                  { label: "Published", value: `${publishedCount}` },
                  { label: "Draft", value: `${draftCount}` },
                  {
                    label: "Availability rows",
                    value: `${catalog.reduce((sum, mealPlan) => sum + mealPlan.availability_count, 0)}`,
                  },
                ]}
              />
              <Card className="vendor-catalog-overview__context" variant="soft">
                <ListRow
                  eyebrow="Current boundary"
                  title="Catalog visibility, not vendor operations"
                  description="The real supported vendor workspace today is the meal-plan catalog plus metrics. Order management, fulfillment, and editing flows are not exposed here because the backend does not currently support them."
                  metadata={[
                    { label: "Catalog route", value: "/api/vendor/meal-plans" },
                    { label: "Metrics route", value: "/vendor/metrics" },
                    { label: "Operations tab", value: "/vendor/operations" },
                  ]}
                />
              </Card>
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Signals"
            title="Catalog signals"
            description="Quick operational readouts for how the current meal-plan inventory is shaped."
          >
            <div className="grid grid--2">
              <MetricCard
                label="Catalog size"
                value={`${catalog.length}`}
                hint="Total meal plans returned for this vendor."
                active
              />
              <MetricCard
                label="Published plans"
                value={`${publishedCount}`}
                hint="Entries whose current status is published."
                status={publishedCount > 0 ? { label: "Live", tone: "success" } : undefined}
              />
              <MetricCard
                label="Draft plans"
                value={`${draftCount}`}
                hint="Entries still not marked as published."
                status={draftCount > 0 ? { label: "Pending", tone: "warning" } : undefined}
              />
              <MetricCard
                label="Availability"
                value={`${catalog.reduce((sum, mealPlan) => sum + mealPlan.availability_count, 0)}`}
                hint="Total availability rows exposed by the returned inventory."
              />
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Featured"
            title="Catalog highlight"
            description="A more intentional spotlight treatment for a single live catalog entry."
          >
            {highlightedMealPlan ? (
              <Card className="vendor-catalog-featured" variant="soft">
                <PageHeader
                  eyebrow="Highlighted plan"
                  title={highlightedMealPlan.name}
                  description={
                    highlightedMealPlan.description ??
                    "This plan is highlighted from the current returned vendor catalog."
                  }
                  status={{ label: highlightedMealPlan.status, tone: "accent" }}
                />
                <div className="vendor-catalog-featured__stats">
                  <StatPill label="Price" value={`$${(highlightedMealPlan.total_price_cents / 100).toFixed(2)}`} active />
                  <StatPill label="Calories" value={`${highlightedMealPlan.total_calories}`} />
                  <StatPill label="Meals" value={`${highlightedMealPlan.item_count}`} />
                  <StatPill label="Availability" value={`${highlightedMealPlan.availability_count}`} />
                </div>
                <Card className="vendor-catalog-featured__note" variant="ghost">
                  <ListRow
                    eyebrow="Highlight note"
                    title="Curated visually, not ranked by backend logic"
                    description="This spotlight improves catalog framing only. It does not imply recommendation scoring, merchandising priority, or editing controls."
                  />
                </Card>
              </Card>
            ) : (
              <EmptyState
                title="No highlighted meal plan"
                message="A catalog highlight will appear here when the vendor meal-plan route returns inventory."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Inventory"
            title="Meal-plan catalog"
            description="Browse the returned meal-plan inventory with clearer visual rhythm and a straightforward operational scan order."
            actions={
              <Link className="link-button" href="/vendor/metrics">
                Compare with metrics
              </Link>
            }
          >
            {catalog.length > 0 ? (
              <div className="vendor-catalog-list">
                <Card className="vendor-catalog-list__intro" variant="ghost">
                  <ListRow
                    eyebrow="Browse context"
                    title="Current vendor inventory"
                    description="Each card reflects the real meal-plan record returned by the catalog route. The page stays read-only until edit or operations workflows are actually supported."
                    metadata={[
                      { label: "Visible plans", value: `${catalog.length}` },
                      { label: "Primary action", value: "Catalog review" },
                    ]}
                  />
                </Card>
                <div className="stacked-list">
                  {catalog.map((mealPlan, index) => (
                    <MealPlanCard
                      key={mealPlan.id}
                      mealPlan={mealPlan}
                      detailHrefBase={null}
                      footer={
                        <>
                          {index === 0 ? <Badge label="Spotlight" tone="accent" /> : null}
                          {mealPlan.status.toLowerCase() === "published" ? (
                            <Badge label="Published" tone="success" />
                          ) : (
                            <Badge label={mealPlan.status} tone="warning" />
                          )}
                        </>
                      }
                    />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                title="No vendor meal plans"
                message="No meal plans were returned for the current vendor membership, so the catalog workspace remains empty until inventory exists."
              />
            )}
          </SectionBlock>
        </>
      ) : null}
    </PageShell>
  );
}
