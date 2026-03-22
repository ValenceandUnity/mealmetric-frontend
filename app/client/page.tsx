"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { PageShell } from "@/components/layout/PageShell";
import { ActionRow } from "@/components/ui/ActionRow";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
import { extractDetails, extractSummary, getArray } from "@/lib/adapters/common";
import { adaptMealPlanList } from "@/lib/adapters/meal-plans";
import { adaptTrainingAssignments } from "@/lib/adapters/training";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, ClientHomeResponse } from "@/lib/types/api";

type ClientHomeApiResponse = ApiResponse<ClientHomeResponse>;

function getGreetingLabel(email: string): string {
  const localPart = email.split("@")[0]?.trim() ?? "";
  if (!localPart) {
    return "Welcome back";
  }

  const normalized = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`);

  return normalized.length > 0 ? `Hi, ${normalized[0]}` : "Welcome back";
}

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
          setErrorMessage("Unable to load the client home dashboard.");
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

  const activityStats = useMemo(() => extractSummary(homeData?.overview, 4), [homeData]);
  const activityHighlights = useMemo(() => extractDetails(homeData?.overview, 3), [homeData]);
  const trainingPackages = useMemo(
    () => adaptTrainingAssignments(homeData?.assignments ?? null).slice(0, 6),
    [homeData],
  );
  const mealPlanPreview = useMemo(
    () => adaptMealPlanList(homeData?.mealPlans ?? null).slice(0, 3),
    [homeData],
  );

  if (status === "loading") {
    return <LoadingBlock title="Loading client session" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client access requires an authenticated client session." />;
  }

  const greetingLabel = getGreetingLabel(user.email);
  const assignmentCount = homeData ? getArray(homeData.assignments).length : 0;
  const mealPlanCount = homeData ? getArray(homeData.mealPlans).length : 0;
  const hasOverviewPayload = homeData?.overview !== null && typeof homeData?.overview !== "undefined";
  const leadHighlight = activityHighlights[0] ?? null;

  return (
    <PageShell
      title={greetingLabel}
      user={user}
      className="app-shell--client-home"
      subtitle="Training stays in focus here, with your current activity snapshot and meal-plan preview kept close."
      actions={<LogoutButton />}
    >
      {errorMessage ? <ErrorBlock title="Unable to load home" message={errorMessage} /> : null}

      {!errorMessage ? (
        <>
          <Card className="client-dashboard-scorecard" variant="accent" as="section">
            <PageHeader
              eyebrow="Daily activity"
              title="Today at a glance"
              description="A compact scorecard built only from the live overview fields already returned by your client home BFF."
              chips={[
                `${trainingPackages.length} training item${trainingPackages.length === 1 ? "" : "s"} in focus`,
                `${mealPlanCount} meal plan${mealPlanCount === 1 ? "" : "s"} available`,
              ]}
              actions={
                <ActionRow>
                  <Link className="link-button link-button--accent" href="/client/metrics">
                    Open metrics
                  </Link>
                  <Link className="link-button" href="/client/meal-plans/search">
                    Search plans
                  </Link>
                </ActionRow>
              }
            />

            {loading ? (
              <div className="client-dashboard-scorecard__loading" aria-hidden="true">
                <div className="client-dashboard-skeleton client-dashboard-skeleton--hero" />
                <div className="client-dashboard-scorecard__grid">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="client-dashboard-skeleton client-dashboard-skeleton--pill" />
                  ))}
                </div>
              </div>
            ) : activityStats.length > 0 ? (
              <>
                <div className="client-dashboard-scorecard__grid">
                  {activityStats.map((item, index) => (
                    <StatPill
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      hint={item.hint ?? (index === 0 ? "Lead value from the current overview payload." : undefined)}
                      active={index === 0}
                    />
                  ))}
                </div>
                {leadHighlight ? (
                  <Card className="client-dashboard-scorecard__note" variant="soft">
                    <p className="client-dashboard-scorecard__note-label">{leadHighlight.label}</p>
                    <p className="client-dashboard-scorecard__note-value">{leadHighlight.value}</p>
                  </Card>
                ) : null}
              </>
            ) : hasOverviewPayload ? (
              <EmptyState
                title="No daily activity metrics yet"
                message="Your home route is connected, but it did not return summary-ready activity fields for today."
              />
            ) : (
              <EmptyState
                title="Activity is not available"
                message="The overview payload is not ready yet, so this scorecard stays empty instead of inventing values."
              />
            )}
          </Card>

          <SectionBlock
            eyebrow="Training"
            title="Training Preview"
            description="Assigned training is surfaced here as a quick workout-ready preview so you can continue from the next routine."
            actions={
              <ActionRow>
                <Link className="link-button link-button--accent" href="/client/training">
                  Open training
                </Link>
              </ActionRow>
            }
          >
            {loading ? (
              <div className="client-dashboard-carousel" aria-hidden="true">
                {[0, 1, 2].map((index) => (
                  <Card key={index} className="client-dashboard-package client-dashboard-package--loading" variant="soft">
                    <div className="client-dashboard-skeleton client-dashboard-skeleton--badge" />
                    <div className="client-dashboard-skeleton client-dashboard-skeleton--title" />
                    <div className="client-dashboard-skeleton client-dashboard-skeleton--copy" />
                    <div className="client-dashboard-skeleton client-dashboard-skeleton--copy short" />
                  </Card>
                ))}
              </div>
            ) : trainingPackages.length > 0 ? (
              <div className="client-dashboard-carousel">
                {trainingPackages.map((assignment, index) => (
                  <Card
                    key={assignment.id ?? `${assignment.title}-${index}`}
                    className="client-dashboard-package"
                    variant={index === 0 ? "accent" : "soft"}
                  >
                    <div className="client-dashboard-package__top">
                      <div className="client-dashboard-package__eyebrow-row">
                        <p className="client-dashboard-package__eyebrow">
                          {assignment.coachName ? `With ${assignment.coachName}` : "Training item"}
                        </p>
                        {assignment.status ? <Badge label={assignment.status} tone="accent" /> : null}
                      </div>
                      <h3 className="client-dashboard-package__title">{assignment.title}</h3>
                      <p className="client-dashboard-package__description">{assignment.description}</p>
                    </div>

                    <div className="client-dashboard-package__chips">
                      {assignment.routineCount ? <Chip tone="accent">{assignment.routineCount}</Chip> : null}
                      {assignment.progressLabel ? <Chip tone="muted">{assignment.progressLabel}</Chip> : null}
                      {assignment.packageId ? <Chip tone="muted">{assignment.packageId}</Chip> : null}
                    </div>

                    <div className="client-dashboard-package__meta">
                      <span>{assignment.schedule}</span>
                      <span>{assignment.checklistCount}</span>
                    </div>

                    <ActionRow>
                      <Link
                        className="link-button link-button--accent"
                        href={assignment.id ? `/client/training/${assignment.id}` : "/client/training"}
                      >
                        {index === 0 ? "Continue workout" : "Open training"}
                      </Link>
                    </ActionRow>
                  </Card>
                ))}
              </div>
            ) : assignmentCount === 0 ? (
              <EmptyState
                title="No training assigned yet"
                message="Assigned training will appear here when the current home payload returns active workout structure."
              />
            ) : (
              <EmptyState
                title="Training preview is not ready"
                message="The home route returned training data, but it did not expose preview-ready fields for this screen."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Meal plans"
            title="Upcoming Meal Plan Preview"
            description="Meal plans stay visible here as a lighter secondary preview beneath training."
            actions={
              <ActionRow>
                <Link className="link-button" href="/client/meal-plans">
                  Browse meal plans
                </Link>
              </ActionRow>
            }
          >
            {loading ? (
              <div className="client-dashboard-meal-preview" aria-hidden="true">
                {[0, 1].map((index) => (
                  <Card key={index} className="client-dashboard-meal-card client-dashboard-meal-card--loading" variant="ghost">
                    <div className="client-dashboard-skeleton client-dashboard-skeleton--badge" />
                    <div className="client-dashboard-skeleton client-dashboard-skeleton--title" />
                    <div className="client-dashboard-skeleton client-dashboard-skeleton--copy" />
                  </Card>
                ))}
              </div>
            ) : mealPlanPreview.length > 0 ? (
              <div className="client-dashboard-meal-preview">
                {mealPlanPreview.map((mealPlan, index) => (
                  <Card key={mealPlan.id ?? `${mealPlan.title}-${index}`} className="client-dashboard-meal-card" variant="ghost">
                    <div className="client-dashboard-meal-card__top">
                      <p className="client-dashboard-package__eyebrow">
                        {mealPlan.vendor ?? "Meal plan preview"}
                      </p>
                      <h3 className="client-dashboard-package__title">{mealPlan.title}</h3>
                    </div>
                    <p className="client-dashboard-package__description">{mealPlan.description}</p>
                    <div className="client-dashboard-package__chips">
                      <Chip tone="accent">{mealPlan.price}</Chip>
                      <Chip tone="muted">{mealPlan.mealCount}</Chip>
                    </div>
                    <ActionRow>
                      <Link
                        className="link-button"
                        href={mealPlan.id ? `/client/meal-plans/${mealPlan.id}` : "/client/meal-plans"}
                      >
                        View meal plan
                      </Link>
                    </ActionRow>
                  </Card>
                ))}
              </div>
            ) : mealPlanCount === 0 ? (
              <EmptyState
                title="No meal plans available"
                message="When meal-plan browse data is available through the current client BFF, a preview will appear here."
              />
            ) : (
              <EmptyState
                title="Meal plan preview is not ready"
                message="Meal-plan data was returned, but it did not expose preview-ready fields for this dashboard card."
              />
            )}
          </SectionBlock>
        </>
      ) : null}
    </PageShell>
  );
}
