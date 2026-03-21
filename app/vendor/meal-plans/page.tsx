"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { MealPlanCard } from "@/components/meal-plans/MealPlanCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
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
      navigation={<Link className="link-button" href="/vendor">Back to vendor dashboard</Link>}
    >
      {loading ? <LoadingBlock title="Loading meal plans" message="Fetching vendor meal-plan inventory." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load meal plans" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <Section title="Catalog">
          {mealPlans && mealPlans.items.length > 0 ? (
            <div className="stacked-list">
              {mealPlans.items.map((mealPlan) => (
                <MealPlanCard key={mealPlan.id} mealPlan={mealPlan} detailHrefBase={null} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No vendor meal plans"
              message="No meal plans were returned for the current vendor membership."
            />
          )}
        </Section>
      ) : null}
    </PageShell>
  );
}
