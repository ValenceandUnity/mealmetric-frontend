"use client";

import { useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { MealPlansTopNav } from "@/components/meal-plans/MealPlansTopNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { readActiveMealPlanZipCodes } from "@/lib/client/meal-plan-zip-tracker";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, MealPlanSummary } from "@/lib/types/api";

type MealPlansResponse = ApiResponse<{ items: MealPlanSummary[]; count: number }>;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ClientMealPlansSearchPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [query, setQuery] = useState("");
  const [mealPlans, setMealPlans] = useState<MealPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeZipCodes, setActiveZipCodes] = useState<string[]>([]);
  const [zipStorageReady, setZipStorageReady] = useState(false);

  useEffect(() => {
    setActiveZipCodes(readActiveMealPlanZipCodes());
    setZipStorageReady(true);
  }, []);

  const activeZipCodesCsv = useMemo(() => activeZipCodes.join(","), [activeZipCodes]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  useEffect(() => {
    if (!zipStorageReady) {
      return;
    }
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const searchParams = new URLSearchParams();
        if (debouncedQuery) {
          searchParams.set("q", debouncedQuery);
        }
        if (activeZipCodesCsv) {
          searchParams.set("zip_codes", activeZipCodesCsv);
        }

        const url = searchParams.toString()
          ? `/api/client/meal-plans?${searchParams.toString()}`
          : "/api/client/meal-plans";

        const response = await fetch(url, { cache: "no-store" });
        const payload = (await response.json()) as MealPlansResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setMealPlans([]);
          return;
        }

        setMealPlans(payload.data.items);
      } catch {
        if (active) {
          setErrorMessage("Unable to load meal plans for search.");
          setMealPlans([]);
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
  }, [activeZipCodesCsv, debouncedQuery, status, user, zipStorageReady]);

  if (status === "loading") {
    return <LoadingBlock title="Loading meal plan search" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Meal plan search requires an authenticated client session." />;
  }

  return (
    <PageShell
      title="Meal plan search"
      user={user}
      className="app-shell--client-meal-plans"
      hideTopHub
    >
      <MealPlansTopNav />
      {loading ? (
        <LoadingBlock
          title={debouncedQuery ? "Searching meal plans" : "Loading meal plans"}
          message={
            debouncedQuery
              ? "Refreshing results from your current meal plan catalog."
              : "Preparing your current meal plan list."
          }
        />
      ) : null}
      {errorMessage ? <ErrorBlock title="Unable to load search" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <SectionBlock
          eyebrow="Meal Plans"
          title="Search"
          description="Search the current meal-plan catalog by meal plan or vendor through the protected client route."
        >
          <div className="client-meal-plans-search-input">
            <span className="client-meal-plans-search-input__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="5.5" />
                <path d="m15 15 4 4" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search meal plans..."
              aria-label="Search meal plans"
            />
          </div>

          {mealPlans.length > 0 ? (
            <div className="client-meal-plans-search-results">
              {mealPlans.map((mealPlan) => (
                <Card key={mealPlan.id} className="client-meal-plans-search-card" variant="soft">
                  <div className="client-meal-plans-search-card__header">
                    <h3 className="client-meal-plans-search-card__title">{mealPlan.name}</h3>
                    {mealPlan.vendor_name ? <Badge label={mealPlan.vendor_name} tone="accent" /> : null}
                  </div>
                  <div className="client-meal-plans-search-card__meta">
                    <span>{`${mealPlan.total_calories} Calories`}</span>
                    <span>{formatPrice(mealPlan.total_price_cents)}</span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No meal plans match your search"
              message={
                debouncedQuery
                  ? "Try a different meal plan name or vendor."
                  : "No meal plans are available in the current catalog."
              }
            />
          )}
        </SectionBlock>
      ) : null}
    </PageShell>
  );
}
