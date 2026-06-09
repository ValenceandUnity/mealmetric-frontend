"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileMealPlanRow } from "@/components/mobile/MobileMealPlanRow";
import { MobileRoutineCard } from "@/components/mobile/MobileRoutineCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, ClientHomeResponse } from "@/lib/types/api";
import { adaptClientHomeView } from "@/lib/view-models/client-home";

type ClientHomeApiResponse = ApiResponse<ClientHomeResponse>;

type ActionPillProps = {
  href: string;
  children: ReactNode;
  tone?: "purple" | "yellow";
};

type ActionPillButtonProps = {
  onClick: () => void;
  children: ReactNode;
  tone?: "purple" | "yellow";
};

type HomeStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function ActionPillButton({
  onClick,
  children,
  tone = "yellow",
}: ActionPillButtonProps) {
  return (
    <button
      type="button"
      className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function HomeStateCard({ title, message, action }: HomeStateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="client-home-state-card">
      <div className="mobile-section__copy">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </MobileCard>
  );
}

function matchesQuery(query: string, fields: Array<string | null | undefined>): boolean {
  if (!query) {
    return true;
  }

  return fields.some((field) => field?.toLowerCase().includes(query));
}

function PillLabel({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span className="client-home-pill-label">
      {icon ? <span className="client-home-pill-label__icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}

function getActivityIcon(label: string) {
  switch (label.toLowerCase()) {
    case "intake":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4c2.4 2.8 4 5.1 4 7.7A4 4 0 0 1 8 11.7C8 9.1 9.6 6.8 12 4Z" />
          <path d="M8.5 13.5A3.5 3.5 0 0 0 12 17a3.5 3.5 0 0 0 3.5-3.5" />
        </svg>
      );
    case "burn":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 3c.4 2.8 2.7 3.6 2.7 6.2A2.7 2.7 0 0 1 11 11.9 3.9 3.9 0 0 1 7.5 8c-2 1.7-3.5 4.3-3.5 7a8 8 0 1 0 16 0c0-3.5-2-6.3-5-8.4" />
        </svg>
      );
    case "net":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 16.5 9 12l3 3 7-7" />
          <path d="M14 8h5v5" />
        </svg>
      );
    case "deficit":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
  }
}

function getShortcutIcon(kind: "bookmarks" | "log" | "search") {
  switch (kind) {
    case "bookmarks":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M8 5h8a1 1 0 0 1 1 1v13l-5-3-5 3V6a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24">
          <path d="m21 21-4.35-4.35" />
          <circle cx="11" cy="11" r="5.5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24">
          <path d="M7 5.5h7l3 3V18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-12.5Z" />
          <path d="M9 10.5h6m-6 3h6" />
        </svg>
      );
  }
}

export default function ClientDashboardPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [homeData, setHomeData] = useState<ClientHomeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);

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
          setErrorMessage(payload.error.message ?? "Unable to load the client home.");
          setHomeData(null);
          return;
        }

        setHomeData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load the client home.");
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

  const view = adaptClientHomeView(homeData, user);
  const query = deferredSearch.trim().toLowerCase();
  const filteredRoutines = view.routines.filter((routine) =>
    matchesQuery(query, [
      routine.title,
      routine.subtitle,
      routine.category,
      routine.status,
    ]),
  );
  const filteredMealPlans = view.upcomingMealPlans.filter((mealPlan) =>
    matchesQuery(query, [
      mealPlan.name,
      mealPlan.vendorName,
      mealPlan.status,
      mealPlan.caloriesLabel,
      mealPlan.priceLabel,
    ]),
  );
  const showLoadingState = loading && !homeData && !errorMessage;
  const showFilteredEmptyState = query.length > 0;
  const featuredRoutine = filteredRoutines[0] ?? null;
  const routineCountLabel =
    view.routines.length > 0 ? `${view.routines.length} routine${view.routines.length === 1 ? "" : "s"}` : "Training preview";
  const mealPlanCountLabel =
    view.upcomingMealPlans.length > 0 ? `${view.upcomingMealPlans.length} meal plan${view.upcomingMealPlans.length === 1 ? "" : "s"}` : "Meal rows";

  return (
    <MobileAppShell
      user={user}
      greeting={view.header.greeting}
      title={view.header.title}
      subtitle={view.header.subtitle}
      searchLabel="Search client home"
      searchPlaceholder="Search routines or meal plans"
      searchValue={searchValue}
      onSearchChange={(nextValue) => {
        startTransition(() => {
          setSearchValue(nextValue);
        });
      }}
      notificationSlot={(
        <ActionPill href="/client/bookmarks" tone="purple">
          <PillLabel icon={getShortcutIcon("bookmarks")}>Bookmarks</PillLabel>
        </ActionPill>
      )}
      topHubAction={(
        <>
          <ActionPill href="/client/meal-plans/search" tone="purple">
            <PillLabel icon={getShortcutIcon("search")}>Plan search</PillLabel>
          </ActionPill>
          <ActionPill href="/client/add-log">
            <PillLabel icon={getShortcutIcon("log")}>Add log</PillLabel>
          </ActionPill>
        </>
      )}
      activePath="/client"
      statusStrip={(
        <>
          <span className="mobile-pill mobile-pill--purple">{routineCountLabel}</span>
          <span className="mobile-pill">{mealPlanCountLabel}</span>
          <span className="mobile-pill">Signed BFF</span>
        </>
      )}
    >
      {errorMessage ? (
        <MobileSection
          eyebrow="Home sync"
          title="Home unavailable"
          description="The mobile client home stays behind the existing BFF route and does not fall back to direct backend calls."
        >
          <HomeStateCard
            title="Unable to load the client home"
            message={errorMessage}
            action={<ActionPill href="/client/metrics">Open metrics</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          className="client-home-section client-home-section--state"
          eyebrow="Syncing"
          title="Loading your client home"
          description="Fetching the protected overview, training, and meal-plan summary from the current client BFF."
        >
          <HomeStateCard
            title="Refreshing home data"
            message="Your home dashboard is loading through the existing signed frontend-to-BFF path."
          />
        </MobileSection>
      ) : (
        <>
          <MobileSection
            className="client-home-section client-home-section--activity"
            eyebrow="Daily activity"
            title="Daily Activity / Progress"
            description="A compact progress card that stays tied to the current client overview response."
            action={<ActionPill href="/client/metrics">Open metrics</ActionPill>}
          >
            {view.dailyActivity.length > 0 ? (
              <div className="client-home-activity-grid">
                {view.dailyActivity.map((activity, index) => (
                  <MobileStatCard
                    key={activity.label}
                    className={index === 0 ? "mobile-stat-card--featured" : ""}
                    label={activity.label}
                    value={activity.value}
                    target={activity.target}
                    unit={activity.unit}
                    progressText={activity.progressText}
                    icon={getActivityIcon(activity.label)}
                  />
                ))}
              </div>
            ) : view.hasOverviewData ? (
              <HomeStateCard
                title="No daily activity metrics yet"
                message="The home payload is connected, but it did not return summary-ready overview values for this screen."
              />
            ) : (
              <HomeStateCard
                title="Activity is not available"
                message="The current client home response does not include overview data yet, so this mobile scorecard stays empty."
              />
            )}
          </MobileSection>

          <MobileSection
            className="client-home-section client-home-section--training"
            eyebrow="Training routines"
            title="Training routines"
            description="Image-forward cards keep the next routine scannable without changing the certified training workflow."
            action={<ActionPill href="/client/training">Open training</ActionPill>}
            contentClassName="client-home-training-strip"
            scroll
          >
            {featuredRoutine ? (
              <div className="client-home-featured-routine">
                <div className="client-home-featured-routine__copy">
                  <p className="client-home-featured-routine__eyebrow">Featured routine</p>
                  <p className="client-home-featured-routine__title">{featuredRoutine.title}</p>
                  <p className="client-home-featured-routine__subtitle">
                    {featuredRoutine.subtitle}
                  </p>
                </div>
                <ActionPill href={featuredRoutine.href} tone="yellow">
                  Continue
                </ActionPill>
              </div>
            ) : null}
            {filteredRoutines.length > 0 ? (
              filteredRoutines.map((routine, index) => (
                <MobileRoutineCard
                  key={routine.id ?? `${routine.title}-${index}`}
                  className="client-home-routine-card"
                  title={routine.title}
                  subtitle={routine.subtitle}
                  taskCount={routine.taskCount}
                  category={routine.category}
                  gradient={routine.gradient}
                  media={(
                    <div className="mobile-routine-card__visual client-home-routine-card__visual">
                      <div className="client-home-routine-card__overlay">
                        {routine.status ? (
                          <span className="mobile-pill mobile-pill--purple">{routine.status}</span>
                        ) : null}
                        <span className="mobile-pill">{routine.taskCount} {routine.taskCount === 1 ? "task" : "tasks"}</span>
                      </div>
                    </div>
                  )}
                  action={
                    <ActionPill href={routine.href} tone={index === 0 ? "yellow" : "purple"}>
                      {index === 0 ? "Continue" : "Open"}
                    </ActionPill>
                  }
                />
              ))
            ) : showFilteredEmptyState ? (
              <HomeStateCard
                title="No routines match this search"
                message={`No training cards matched "${searchValue.trim()}".`}
                action={
                  <ActionPillButton
                    onClick={() => {
                      setSearchValue("");
                    }}
                  >
                    Clear search
                  </ActionPillButton>
                }
              />
            ) : view.hasAssignments ? (
              <HomeStateCard
                title="Training preview is not ready"
                message="Assignments were returned, but the current home payload did not expose routine-preview fields for this mobile strip."
              />
            ) : (
              <HomeStateCard
                title="No training assigned yet"
                message="Assigned routines will appear here when the protected client home payload returns active training items."
              />
            )}
          </MobileSection>

          <MobileSection
            className="client-home-section client-home-section--meal-plans"
            eyebrow="Upcoming meal plan"
            title="Upcoming meal plan"
            description="Gray row cards stay factual to the current client home payload and preserve existing plan links."
            contentClassName="client-home-meal-plan-list"
            action={<ActionPill href="/client/meal-plans">Browse plans</ActionPill>}
          >
            {filteredMealPlans.length > 0 ? (
              filteredMealPlans.map((mealPlan, index) => (
                <MobileMealPlanRow
                  className="client-home-meal-plan-card"
                  key={mealPlan.id ?? `${mealPlan.name}-${index}`}
                  name={mealPlan.name}
                  vendorName={mealPlan.vendorName}
                  calories={mealPlan.caloriesLabel.replace(/\s*cal$/i, "")}
                  price={mealPlan.priceLabel}
                  status={mealPlan.status ?? undefined}
                  action={<ActionPill href={mealPlan.href}>View plan</ActionPill>}
                />
              ))
            ) : showFilteredEmptyState ? (
              <HomeStateCard
                title="No meal plans match this search"
                message={`No meal-plan rows matched "${searchValue.trim()}".`}
                action={
                  <ActionPillButton
                    onClick={() => {
                      setSearchValue("");
                    }}
                  >
                    Clear search
                  </ActionPillButton>
                }
              />
            ) : view.hasMealPlans ? (
              <HomeStateCard
                title="Meal-plan preview is not ready"
                message="Meal-plan data was returned, but the current home payload did not expose preview-ready fields for this mobile list."
              />
            ) : (
              <HomeStateCard
                title="No meal plans available"
                message="Meal plans will appear here when the existing client BFF returns browse-ready plan data."
              />
            )}
          </MobileSection>
        </>
      )}

      <MobileSection
        className="client-home-section client-home-section--account"
        eyebrow="Session"
        title="Account"
        description="Sign-out continues to use the existing protected client auth flow."
      >
        <LogoutButton />
      </MobileSection>
    </MobileAppShell>
  );
}
