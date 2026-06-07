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
  children: string;
  tone?: "purple" | "yellow";
};

type ActionPillButtonProps = {
  onClick: () => void;
  children: string;
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
    <MobileCard as="div" variant="soft">
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
      notificationSlot={<ActionPill href="/client/bookmarks">Bookmarks</ActionPill>}
      topHubAction={<ActionPill href="/client/add-log">Add log</ActionPill>}
      activePath="/client"
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
            eyebrow="Daily activity"
            title="Today at a glance"
            description="Your overview stays compact here so training and nutrition remain one thumb away."
            action={<ActionPill href="/client/metrics">Open metrics</ActionPill>}
          >
            {view.dailyActivity.length > 0 ? (
              view.dailyActivity.map((activity) => (
                <MobileStatCard
                  key={activity.label}
                  label={activity.label}
                  value={activity.value}
                  target={activity.target}
                  unit={activity.unit}
                  progressText={activity.progressText}
                  icon={getActivityIcon(activity.label)}
                />
              ))
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
            eyebrow="Training"
            title="Training preview"
            description="Assigned routines stay in a horizontal strip so the next session is easy to reopen."
            action={<ActionPill href="/client/training">Open training</ActionPill>}
            scroll
          >
            {filteredRoutines.length > 0 ? (
              filteredRoutines.map((routine, index) => (
                <MobileRoutineCard
                  key={routine.id ?? `${routine.title}-${index}`}
                  title={routine.title}
                  subtitle={routine.subtitle}
                  taskCount={routine.taskCount}
                  category={routine.category}
                  gradient={routine.gradient}
                  action={
                    <ActionPill href={routine.href} tone="yellow">
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
            eyebrow="Meal plans"
            title="Upcoming meal plans"
            description="Meal-plan rows stay lighter than training so nutrition still stays visible without taking over the home screen."
            action={<ActionPill href="/client/meal-plans">Browse plans</ActionPill>}
          >
            {filteredMealPlans.length > 0 ? (
              filteredMealPlans.map((mealPlan, index) => (
                <MobileMealPlanRow
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
        eyebrow="Session"
        title="Account"
        description="Sign-out continues to use the existing protected client auth flow."
      >
        <LogoutButton />
      </MobileSection>
    </MobileAppShell>
  );
}
