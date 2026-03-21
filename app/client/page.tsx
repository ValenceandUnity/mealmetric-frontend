"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { MealPlanCard } from "@/components/meal-plans/MealPlanCard";
import { PageShell } from "@/components/layout/PageShell";
import { AssignmentCard } from "@/components/training/AssignmentCard";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { adaptClientHome } from "@/lib/adapters/dashboard";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, ClientHomeResponse } from "@/lib/types/api";

type ClientHomeApiResponse = ApiResponse<ClientHomeResponse>;

export default function ClientDashboardPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [homeData, setHomeData] = useState<ClientHomeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/client/home", { cache: "no-store" });
        const payload = (await response.json()) as ClientHomeApiResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setHomeData(null);
          return;
        }

        setHomeData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load the client home slice.");
          setHomeData(null);
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
    return <LoadingBlock title="Loading client session" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client access requires an authenticated client session." />;
  }

  const view = homeData ? adaptClientHome(homeData) : null;

  return (
    <PageShell
      title={`Welcome back`}
      user={user}
      navigation={
        <>
          <Link className="link-button" href="/client/training">Training</Link>
          <Link className="link-button" href="/client/metrics">Metrics</Link>
          <Link className="link-button" href="/client/meal-plans">Meal Plans</Link>
          <Link className="link-button" href="/client/bookmarks">Bookmarks</Link>
        </>
      }
      actions={<LogoutButton />}
    >
      {loading ? <LoadingBlock title="Loading home data" message="Calling /api/client/home through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load home" message={errorMessage} /> : null}

      {view && homeData ? (
        <>
          <Section title="Analytics summary">
            <div className="grid grid--2">
              {view.summary.length > 0 ? (
                view.summary.map((item) => (
                  <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
                ))
              ) : (
                <SummaryCard label="Overview" value="Live" hint="Overview payload did not expose numeric headline fields." />
              )}
            </div>
          </Section>

          <Section title="Training">
            {view.assignments.length > 0 ? (
              <div className="stacked-list">
                {view.assignments.map((assignment) => (
                  <AssignmentCard key={assignment.id ?? assignment.title} assignment={assignment} />
                ))}
              </div>
            ) : (
              <EmptyState title="No assignments yet" message="Training assignments will appear here when the BFF returns them." />
            )}
          </Section>

          <Section title="Meal plans">
            {view.mealPlans.length > 0 ? (
              <div className="stacked-list">
                {view.mealPlans.map((mealPlan) => (
                  <MealPlanCard key={mealPlan.id ?? mealPlan.title} mealPlan={mealPlan} />
                ))}
              </div>
            ) : (
              <EmptyState title="No meal plans returned" message="Available meal plans will surface here once the BFF provides them." />
            )}
          </Section>

          <Section title="Hub shortcuts">
            <div className="row">
              <Link className="link-button link-button--accent" href="/client/training">Open training hub</Link>
              <Link className="link-button" href="/client/metrics">Review metrics</Link>
              <Link className="link-button" href="/client/meal-plans">Browse meal plans</Link>
              <Link className="link-button" href="/client/bookmarks">Manage bookmarks</Link>
            </div>
            {view.summary.length === 0 ? (
              <DebugPreview value={homeData.overview} label="Overview debug fallback" />
            ) : null}
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
