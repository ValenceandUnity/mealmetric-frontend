"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SummaryCard } from "@/components/cards/SummaryCard";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
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
      {loading ? <LoadingBlock title="Loading dashboard" message="Fetching vendor profile and metrics." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load vendor dashboard" message={errorMessage} /> : null}

      {!loading && !errorMessage && profile && metrics && mealPlans ? (
        <>
          <Section title="Vendor summary">
            <div className="grid grid--2">
              <SummaryCard
                label="Vendor"
                value={profile.default_vendor?.name ?? "Unavailable"}
                hint={profile.default_vendor?.zip_code ?? "No ZIP configured"}
              />
              <SummaryCard
                label="Meal plans"
                value={`${mealPlans.count}`}
                hint="All vendor-accessible meal plans returned through the BFF."
              />
            </div>
          </Section>

          <Section title="Operational metrics">
            <div className="grid grid--2">
              <SummaryCard label="Published" value={`${metrics.published_meal_plans}`} />
              <SummaryCard label="Draft" value={`${metrics.draft_meal_plans}`} />
              <SummaryCard label="Availability rows" value={`${metrics.total_availability_entries}`} />
              <SummaryCard label="Open pickup windows" value={`${metrics.open_pickup_windows}`} />
            </div>
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
