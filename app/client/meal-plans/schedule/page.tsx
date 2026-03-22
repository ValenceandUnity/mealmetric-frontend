"use client";

import { PageShell } from "@/components/layout/PageShell";
import { MealPlansTopNav } from "@/components/meal-plans/MealPlansTopNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { useSessionBootstrap } from "@/lib/client/session";

export default function ClientMealPlansSchedulePage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  if (status === "loading") {
    return <LoadingBlock title="Loading meal plan schedule" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Meal plan schedule requires an authenticated client session." />;
  }

  return (
    <PageShell
      title="Meal plan schedule"
      user={user}
      className="app-shell--client-meal-plans"
      hideTopHub
    >
      <MealPlansTopNav />
      <SectionBlock
        eyebrow="Meal Plans"
        title="Schedule"
        description="Assigned and upcoming scheduling views stay limited until the meal plan workspace exposes dedicated schedule data."
      >
        <EmptyState
          title="Schedule view is not wired yet"
          message="This placeholder keeps Meal Plan navigation coherent without inventing unsupported schedule behavior."
        />
      </SectionBlock>
    </PageShell>
  );
}
