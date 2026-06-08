"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileMealPlanRow } from "@/components/mobile/MobileMealPlanRow";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, MealPlanListPayload } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import {
  adaptVendorMealPlansView,
  type MobileVendorMealPlanPreviewView,
} from "@/lib/view-models/vendor";

type VendorMealPlansApiResponse = ApiResponse<MealPlanListPayload>;

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type VendorCatalogStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
};

type VendorMealPlanCardProps = {
  mealPlan: MobileVendorMealPlanPreviewView;
  highlight?: boolean;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function VendorCatalogStateCard({
  title,
  message,
  action,
  role = "status",
}: VendorCatalogStateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy" role={role} aria-live="polite">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

function VendorMealPlanCard({ mealPlan, highlight = false }: VendorMealPlanCardProps) {
  return (
    <MobileCard
      as="article"
      variant={highlight ? "accent" : "action"}
      className="mobile-pt-detail-action-card"
    >
      <MobileMealPlanRow
        name={mealPlan.name}
        vendorName={`${mealPlan.vendorName} | ${mealPlan.vendorZipLabel}`}
        calories={mealPlan.caloriesLabel.replace(/\s*cal$/i, "")}
        price={mealPlan.priceLabel}
        badge={
          <span className={`mobile-pill ${highlight ? "mobile-pill--yellow" : "mobile-pill--purple"}`}>
            {highlight ? "Spotlight" : mealPlan.statusLabel}
          </span>
        }
      />

      <p className="mobile-section__description">{mealPlan.description}</p>

      <dl className="mobile-pt-fact-grid">
        <div>
          <dt>Status</dt>
          <dd>{mealPlan.statusLabel}</dd>
        </div>
        <div>
          <dt>ZIP</dt>
          <dd>{mealPlan.vendorZipLabel}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{mealPlan.priceLabel}</dd>
        </div>
        <div>
          <dt>Calories</dt>
          <dd>{mealPlan.caloriesLabel}</dd>
        </div>
        <div>
          <dt>Meals</dt>
          <dd>{mealPlan.itemCountLabel}</dd>
        </div>
        <div>
          <dt>Availability</dt>
          <dd>{mealPlan.availabilityLabel}</dd>
        </div>
      </dl>
    </MobileCard>
  );
}

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
        const payload = (await response.json()) as VendorMealPlansApiResponse;
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
          setMealPlans(null);
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

  const view = adaptVendorMealPlansView({ mealPlans });
  const showLoadingState = loading && !mealPlans && !errorMessage;

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title={view.title}
      subtitle={view.subtitle}
      notificationSlot={<ActionPill href="/vendor" tone="purple">Vendor dashboard</ActionPill>}
      topHubAction={<ActionPill href="/vendor/metrics">Metrics</ActionPill>}
      activePath="/vendor/meal-plans"
    >
      {errorMessage ? (
        <MobileSection
          eyebrow="Catalog sync"
          title="Vendor meal plans unavailable"
          description="This mobile catalog stays on the existing vendor meal-plan BFF route and does not fall back to direct backend calls."
        >
          <VendorCatalogStateCard
            title="Unable to load meal plans"
            message={errorMessage}
            action={<ActionPill href="/vendor" tone="purple">Vendor dashboard</ActionPill>}
            role="alert"
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading vendor meal plans"
          description="Fetching vendor meal-plan inventory through the existing vendor BFF route."
        >
          <VendorCatalogStateCard
            title="Refreshing catalog inventory"
            message="Your vendor meal plans are loading through the current signed frontend-to-BFF path."
          />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <MobileSection
            eyebrow="Catalog summary"
            title="Read-only meal-plan inventory"
            description={view.readOnlyNote}
            action={<ActionPill href="/vendor" tone="purple">Vendor dashboard</ActionPill>}
          >
            {view.summaryCards.map((card) => (
              <MobileStatCard
                key={card.label}
                label={card.label}
                value={card.value}
                progressText={card.progressText}
              />
            ))}
          </MobileSection>

          <MobileSection
            eyebrow="Catalog spotlight"
            title="First returned meal plan"
            description="The first meal plan returned by the current vendor catalog route remains the mobile spotlight. No backend ranking or merchandising signal is introduced."
            action={<ActionPill href="/vendor/metrics">Compare with metrics</ActionPill>}
          >
            {view.highlight ? (
              <VendorMealPlanCard mealPlan={view.highlight} highlight />
            ) : (
              <VendorCatalogStateCard
                title={view.highlightEmptyTitle}
                message={view.highlightEmptyMessage}
                action={<ActionPill href="/vendor" tone="purple">Vendor dashboard</ActionPill>}
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Inventory"
            title="Meal-plan catalog"
            description="Browse the returned meal-plan inventory without implying unsupported create, edit, publish, archive, or delete behavior."
            action={<ActionPill href="/vendor/metrics">Metrics</ActionPill>}
          >
            {view.hasMealPlans ? (
              <div className="mobile-pt-detail-stack">
                {view.mealPlans.map((mealPlan, index) => (
                  <VendorMealPlanCard
                    key={mealPlan.id ?? `${mealPlan.name}-${index}`}
                    mealPlan={mealPlan}
                  />
                ))}
              </div>
            ) : (
              <VendorCatalogStateCard
                title={view.emptyTitle}
                message={view.emptyMessage}
                action={<ActionPill href="/vendor" tone="purple">Vendor dashboard</ActionPill>}
              />
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
