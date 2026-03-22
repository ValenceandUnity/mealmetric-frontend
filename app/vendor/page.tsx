"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { PageShell } from "@/components/layout/PageShell";
import { MealPlanCard } from "@/components/meal-plans/MealPlanCard";
import { MetricCard } from "@/components/metrics/MetricCard";
import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
import { useSessionBootstrap } from "@/lib/client/session";
import type {
  ApiResponse,
  MealPlanListPayload,
  VendorMePayload,
  VendorMetricsPayload,
} from "@/lib/types/api";

export default function VendorDashboardPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "vendor",
    unauthenticatedRedirectTo: "/login",
  });

  const [profile, setProfile] = useState<VendorMePayload | null>(null);
  const [metrics, setMetrics] = useState<VendorMetricsPayload | null>(null);
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
        const [profileResponse, metricsResponse, mealPlanResponse] = await Promise.all([
          fetch("/api/vendor/me", { cache: "no-store" }),
          fetch("/api/vendor/metrics", { cache: "no-store" }),
          fetch("/api/vendor/meal-plans", { cache: "no-store" }),
        ]);

        const profilePayload = (await profileResponse.json()) as ApiResponse<VendorMePayload>;
        const metricsPayload = (await metricsResponse.json()) as ApiResponse<VendorMetricsPayload>;
        const mealPlanPayload = (await mealPlanResponse.json()) as ApiResponse<MealPlanListPayload>;

        if (!active) {
          return;
        }

        if (!profilePayload.ok) {
          setErrorMessage(profilePayload.error.message);
          return;
        }

        if (!metricsPayload.ok) {
          setErrorMessage(metricsPayload.error.message);
          return;
        }

        if (!mealPlanPayload.ok) {
          setErrorMessage(mealPlanPayload.error.message);
          return;
        }

        setProfile(profilePayload.data);
        setMetrics(metricsPayload.data);
        setMealPlans(mealPlanPayload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load vendor dashboard.");
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

  const defaultVendor = profile?.default_vendor ?? null;
  const highlightedMealPlan = useMemo(() => mealPlans?.items[0] ?? null, [mealPlans]);

  if (status === "loading") {
    return <LoadingBlock title="Loading vendor portal" message="Validating your vendor session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Vendor access requires an authenticated vendor session." />;
  }

  return (
    <PageShell
      title="Vendor dashboard"
      user={user}
      navigation={
        <>
          <Link className="link-button" href="/vendor/meal-plans">
            Open meal plans
          </Link>
          <Link className="link-button" href="/vendor/metrics">
            Open metrics
          </Link>
        </>
      }
    >
      {loading ? <LoadingBlock title="Loading dashboard" message="Fetching vendor profile, metrics, and catalog slices." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load vendor dashboard" message={errorMessage} /> : null}

      {!loading && !errorMessage && profile && metrics && mealPlans ? (
        <>
          <Card className="vendor-dashboard-hero" variant="accent" as="section">
            <PageHeader
              eyebrow="Vendor workspace"
              title={defaultVendor?.name ?? "Vendor operations"}
              description={
                defaultVendor?.description ??
                "Manage catalog visibility and operational performance through the existing vendor BFF routes."
              }
              chips={[
                defaultVendor?.status ?? "Vendor account",
                defaultVendor?.zip_code ?? "ZIP unavailable",
                `${mealPlans.count} meal plan${mealPlans.count === 1 ? "" : "s"}`,
              ]}
              actions={
                <ActionRow>
                  <Link className="link-button link-button--accent" href="/vendor/meal-plans">
                    Catalog
                  </Link>
                  <Link className="link-button" href="/vendor/metrics">
                    Performance
                  </Link>
                </ActionRow>
              }
            />
            <div className="vendor-dashboard-hero__stats">
              <StatPill
                label="Meal plans"
                value={`${mealPlans.count}`}
                hint="Current catalog inventory returned through the vendor meal-plan route."
                active
              />
              <StatPill
                label="Published"
                value={`${metrics.published_meal_plans}`}
                hint="Catalog entries currently surfaced as published."
              />
              <StatPill
                label="Draft"
                value={`${metrics.draft_meal_plans}`}
                hint="Catalog entries still held back from publication."
              />
              <StatPill
                label="Pickup windows"
                value={`${metrics.open_pickup_windows}`}
                hint="Open pickup windows currently exposed through vendor metrics."
              />
            </div>
          </Card>

          <SectionBlock
            eyebrow="Overview"
            title="Operational overview"
            description="Real vendor summary framing from the current profile, catalog, and metrics slices."
          >
            <div className="vendor-dashboard-analytics">
              <AnalyticsCard
                eyebrow="Vendor aggregate"
                title={defaultVendor?.name ?? "Vendor overview"}
                description="This overview reflects the exact vendor identity and performance values returned through the current BFF routes."
                stats={[
                  { label: "Vendors", value: `${profile.vendors.length}` },
                  { label: "Catalog", value: `${mealPlans.count}` },
                  { label: "Published", value: `${metrics.published_meal_plans}` },
                  { label: "Draft", value: `${metrics.draft_meal_plans}` },
                ]}
              />
              <Card className="vendor-dashboard-context" variant="soft">
                <ListRow
                  eyebrow="Workspace context"
                  title="Catalog-first vendor operations"
                  description="The real vendor workspace today centers on meal plans and metrics. The reserved operations tab remains structurally present but intentionally non-operational until backend support exists."
                  metadata={[
                    { label: "Profile route", value: "/api/vendor/me" },
                    { label: "Metrics route", value: "/api/vendor/metrics" },
                    { label: "Catalog route", value: "/api/vendor/meal-plans" },
                  ]}
                />
              </Card>
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Performance"
            title="Operational metrics"
            description="Core vendor performance values surfaced from the current metrics route."
            actions={
              <Link className="link-button" href="/vendor/metrics">
                Full metrics
              </Link>
            }
          >
            <div className="grid grid--2">
              <MetricCard
                label="Published"
                value={`${metrics.published_meal_plans}`}
                hint="Meal plans currently live in the catalog."
                active
              />
              <MetricCard
                label="Draft"
                value={`${metrics.draft_meal_plans}`}
                hint="Meal plans not yet published."
              />
              <MetricCard
                label="Availability rows"
                value={`${metrics.total_availability_entries}`}
                hint="Availability records returned by vendor metrics."
              />
              <MetricCard
                label="Open pickup windows"
                value={`${metrics.open_pickup_windows}`}
                hint="Operational pickup windows currently open."
              />
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Catalog"
            title="Meal-plan visibility"
            description="The vendor catalog remains the main operational surface for current backend support."
            actions={
              <Link className="link-button" href="/vendor/meal-plans">
                Full catalog
              </Link>
            }
          >
            {highlightedMealPlan ? (
              <Card className="vendor-dashboard-featured" variant="soft">
                <PageHeader
                  eyebrow="Catalog highlight"
                  title={highlightedMealPlan.name}
                  description={
                    highlightedMealPlan.description ??
                    "Vendor meal-plan detail is available in the current catalog."
                  }
                  status={{ label: highlightedMealPlan.status, tone: "accent" }}
                />
                <div className="vendor-dashboard-featured__stats">
                  <StatPill label="Price" value={`$${(highlightedMealPlan.total_price_cents / 100).toFixed(2)}`} />
                  <StatPill label="Calories" value={`${highlightedMealPlan.total_calories}`} />
                  <StatPill label="Meals" value={`${highlightedMealPlan.item_count}`} />
                  <StatPill label="Availability" value={`${highlightedMealPlan.availability_count}`} />
                </div>
                <ActionRow>
                  <Link className="link-button" href="/vendor/meal-plans">
                    View catalog
                  </Link>
                  <Link className="link-button" href="/vendor/metrics">
                    Compare metrics
                  </Link>
                </ActionRow>
              </Card>
            ) : (
              <EmptyState
                title="No meal-plan highlight"
                message="A catalog highlight will appear here when the vendor meal-plan route returns inventory."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Inventory"
            title="Catalog snapshot"
            description="A short catalog preview from the live vendor meal-plan inventory."
          >
            {mealPlans.items.length > 0 ? (
              <div className="stacked-list">
                {mealPlans.items.slice(0, 3).map((mealPlan) => (
                  <MealPlanCard key={mealPlan.id} mealPlan={mealPlan} detailHrefBase={null} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No vendor meal plans"
                message="No meal plans were returned for the current vendor membership."
              />
            )}
          </SectionBlock>
        </>
      ) : null}
    </PageShell>
  );
}
