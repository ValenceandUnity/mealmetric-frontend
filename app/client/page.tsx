"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
import { ActionRow } from "@/components/ui/ActionRow";
import { ListRow } from "@/components/ui/ListRow";
import { MealPlanCard } from "@/components/meal-plans/MealPlanCard";
import { PageShell } from "@/components/layout/PageShell";
import { RoutineCard } from "@/components/training/RoutineCard";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
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
  const summaryItems = view?.summary ?? [];
  const assignments = view?.assignments ?? [];
  const mealPlans = view?.mealPlans ?? [];
  const summaryChips = [
    `${assignments.length} training highlight${assignments.length === 1 ? "" : "s"}`,
    `${mealPlans.length} meal-plan highlight${mealPlans.length === 1 ? "" : "s"}`,
  ];

  return (
    <PageShell
      title={`Welcome back`}
      user={user}
      actions={<LogoutButton />}
    >
      {loading ? <LoadingBlock title="Loading home data" message="Calling /api/client/home through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load home" message={errorMessage} /> : null}

      {view && homeData ? (
        <>
          <Card className="client-home-hero" variant="accent" as="section">
            <PageHeader
              eyebrow="Client dashboard"
              title="Your meal and training rhythm"
              description="Track active momentum across analytics, training, and meal plans without leaving the protected client workspace."
              chips={summaryChips}
            />
            <div className="client-home-hero__stats">
              {summaryItems.length > 0 ? (
                summaryItems.map((item, index) => (
                  <StatPill
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    hint={item.hint}
                    active={index === 0}
                  />
                ))
              ) : (
                <>
                  <StatPill label="Overview" value="Live" hint="Connected to the current client home BFF slice." active />
                  <StatPill
                    label="Analytics"
                    value="Pending"
                    hint="Overview payload did not expose headline summary fields."
                  />
                </>
              )}
            </div>
            <ActionRow>
              <Link className="link-button link-button--accent" href="/client/training">
                Open training
              </Link>
              <Link className="link-button" href="/client/metrics">
                Review metrics
              </Link>
              <Link className="link-button" href="/client/meal-plans">
                Browse meal plans
              </Link>
            </ActionRow>
          </Card>

          <SectionBlock
            eyebrow="Overview"
            title="Analytics summary"
            description="Headline metrics surfaced from the current home payload."
          >
            <AnalyticsCard
              eyebrow="BFF overview"
              title="Current summary"
              description="These values come directly from the protected client home aggregation route."
              stats={
                summaryItems.length > 0
                  ? summaryItems
                  : [
                      {
                        label: "Overview",
                        value: "Live",
                        hint: "Overview payload is connected but did not expose summary-ready fields.",
                      },
                    ]
              }
              actions={
                <ActionRow>
                  <Link className="link-button" href="/client/metrics">
                    Open metrics
                  </Link>
                </ActionRow>
              }
            />
          </SectionBlock>

          <SectionBlock
            eyebrow="Training"
            title="Training highlights"
            description="Recent assignment summaries from the home slice."
            actions={
              <Link className="link-button" href="/client/training">
                Full training hub
              </Link>
            }
          >
            {assignments.length > 0 ? (
              <div className="stacked-list">
                {assignments.map((assignment) => (
                  <RoutineCard
                    key={assignment.id ?? assignment.title}
                    eyebrow="Assignment"
                    title={assignment.title}
                    description={assignment.description}
                    status={assignment.status ? { label: assignment.status, tone: "accent" } : undefined}
                    metadata={[
                      { label: "Package", value: assignment.packageId ?? "Unavailable" },
                      { label: "Window", value: assignment.schedule },
                      { label: "Checklist", value: assignment.checklistCount },
                    ]}
                    footer={
                      assignment.id ? (
                        <Link className="link-button" href={`/client/training/${assignment.id}`}>
                          Open assignment
                        </Link>
                      ) : (
                        <Link className="link-button" href="/client/training">
                          Open training
                        </Link>
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No assignments yet"
                message="Training highlights will populate here when the home route returns active assignment data."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Nutrition"
            title="Meal-plan highlights"
            description="A lightweight preview of meal-plan options available from the same signed-in client context."
            actions={
              <Link className="link-button" href="/client/meal-plans">
                Full meal-plan catalog
              </Link>
            }
          >
            {mealPlans.length > 0 ? (
              <div className="stacked-list">
                {mealPlans.map((mealPlan) => (
                  <MealPlanCard key={mealPlan.id ?? mealPlan.title} mealPlan={mealPlan} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No meal plans returned"
                message="Meal-plan highlights will appear here when the client home route returns available plans."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Shortcuts"
            title="Next actions"
            description="Fast routes into the main client surfaces."
          >
            <Card className="client-home-actions" variant="soft">
              <ListRow
                eyebrow="Client workspace"
                title="Move into the next task"
                description="Use direct links into the current client surfaces without leaving the authenticated shell."
              />
              <ActionRow>
                <Link className="link-button link-button--accent" href="/client/training">
                  Open training hub
                </Link>
                <Link className="link-button" href="/client/metrics">
                  Review metrics
                </Link>
                <Link className="link-button" href="/client/meal-plans">
                  Browse meal plans
                </Link>
                <Link className="link-button" href="/client/bookmarks">
                  Manage bookmarks
                </Link>
              </ActionRow>
            </Card>
            {summaryItems.length === 0 ? (
              <DebugPreview value={homeData.overview} label="Overview debug fallback" />
            ) : null}
          </SectionBlock>
        </>
      ) : null}

      {!loading && !errorMessage && !view ? (
        <SectionBlock
          eyebrow="Client dashboard"
          title="Home data is not ready"
          description="The authenticated route loaded, but it did not return a dashboard-ready client home view."
        >
          <EmptyState
            title="Dashboard unavailable"
            message="Try opening training, metrics, or meal plans directly while the home payload shape is refined."
          />
          <ActionRow>
            <Link className="link-button" href="/client/training">
              Open training
            </Link>
            <Link className="link-button" href="/client/metrics">
              Open metrics
            </Link>
            <Link className="link-button" href="/client/meal-plans">
              Open meal plans
            </Link>
          </ActionRow>
        </SectionBlock>
      ) : null}
    </PageShell>
  );
}
