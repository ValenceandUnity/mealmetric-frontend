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
import type {
  ApiResponse,
  MealPlanListPayload,
  VendorMePayload,
  VendorMetricsPayload,
} from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import { adaptVendorDashboardView, type MobileVendorActionView, type MobileVendorMealPlanPreviewView } from "@/lib/view-models/vendor";

type VendorProfileApiResponse = ApiResponse<VendorMePayload>;
type VendorMetricsApiResponse = ApiResponse<VendorMetricsPayload>;
type VendorMealPlansApiResponse = ApiResponse<MealPlanListPayload>;

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type VendorStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
};

type VendorActionCardProps = {
  action: MobileVendorActionView;
};

type VendorHighlightCardProps = {
  mealPlan: MobileVendorMealPlanPreviewView;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function VendorStateCard({
  title,
  message,
  action,
  role = "status",
}: VendorStateCardProps) {
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

function VendorActionCard({ action }: VendorActionCardProps) {
  return (
    <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
      <div className="mobile-pt-client-card__header">
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">Vendor route</p>
          <h3 className="mobile-section__title">{action.title}</h3>
          <p className="mobile-section__description">{action.description}</p>
        </div>
        <span className={`mobile-pill ${action.tone === "purple" ? "mobile-pill--purple" : "mobile-pill--yellow"}`}>
          {action.badgeLabel}
        </span>
      </div>

      <div className="mobile-pt-actions">
        <ActionPill href={action.href} tone={action.tone}>{action.ctaLabel}</ActionPill>
      </div>
    </MobileCard>
  );
}

function VendorHighlightCard({ mealPlan }: VendorHighlightCardProps) {
  return (
    <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
      <div className="mobile-pt-client-card__header">
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">Catalog highlight</p>
          <h3 className="mobile-section__title">{mealPlan.name}</h3>
          <p className="mobile-section__description">{mealPlan.description}</p>
        </div>
        <span className="mobile-pill mobile-pill--purple">{mealPlan.statusLabel}</span>
      </div>

      <dl className="mobile-pt-fact-grid">
        <div>
          <dt>Vendor</dt>
          <dd>{mealPlan.vendorName}</dd>
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

      <div className="mobile-pt-actions">
        <ActionPill href="/vendor/meal-plans">Open meal plans</ActionPill>
        <ActionPill href="/vendor/metrics" tone="purple">Open metrics</ActionPill>
      </div>
    </MobileCard>
  );
}

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

        const profilePayload = (await profileResponse.json()) as VendorProfileApiResponse;
        const metricsPayload = (await metricsResponse.json()) as VendorMetricsApiResponse;
        const mealPlanPayload = (await mealPlanResponse.json()) as VendorMealPlansApiResponse;

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
          setProfile(null);
          setMetrics(null);
          setMealPlans(null);
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

  const view = adaptVendorDashboardView({
    profile,
    metrics,
    mealPlans,
    sessionEmail: user.email,
  });
  const showLoadingState = loading && !profile && !metrics && !mealPlans && !errorMessage;

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title={view.title}
      subtitle={view.subtitle}
      notificationSlot={<ActionPill href="/vendor/account" tone="purple">Account</ActionPill>}
      topHubAction={<ActionPill href="/vendor/meal-plans">Catalog</ActionPill>}
      activePath="/vendor"
    >
      {errorMessage ? (
        <MobileSection
          eyebrow="Dashboard sync"
          title="Vendor dashboard unavailable"
          description="This screen keeps the browser on protected Next/BFF routes and does not fall back to direct backend calls."
        >
          <VendorStateCard
            title="Unable to load vendor dashboard"
            message={errorMessage}
            action={<ActionPill href="/vendor/account" tone="purple">Account</ActionPill>}
            role="alert"
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading vendor dashboard"
          description="Fetching vendor profile, metrics, and catalog slices through the existing vendor BFF routes."
        >
          <VendorStateCard
            title="Refreshing vendor dashboard"
            message="Vendor identity, metrics, and catalog summaries are loading through the current signed frontend-to-BFF path."
          />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <MobileSection
            eyebrow="Vendor identity"
            title="Vendor dashboard"
            description="This mobile overview preserves the current vendor profile, metrics, and catalog semantics without adding mutation workflows."
            action={<ActionPill href="/vendor/account" tone="purple">Open account</ActionPill>}
          >
            {view.hasVendorProfile ? (
              <>
                <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
                  <div className="mobile-pt-client-card__header">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">Vendor identity</p>
                      <h2 className="mobile-section__title">{view.identity.vendorName}</h2>
                      <p className="mobile-section__description">{view.identity.vendorDescription}</p>
                      <p className="mobile-section__description">{view.identity.contextNote}</p>
                    </div>
                    <span className="mobile-pill mobile-pill--yellow">{view.identity.defaultVendorStateLabel}</span>
                  </div>

                  <dl className="mobile-pt-fact-grid">
                    <div>
                      <dt>Email</dt>
                      <dd>{view.identity.vendorEmailLabel}</dd>
                    </div>
                    <div>
                      <dt>Slug</dt>
                      <dd>{view.identity.vendorSlugLabel}</dd>
                    </div>
                    <div>
                      <dt>ZIP</dt>
                      <dd>{view.identity.vendorZipLabel}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{view.identity.vendorStatusLabel}</dd>
                    </div>
                    <div>
                      <dt>Meal plans</dt>
                      <dd>{view.identity.vendorMealPlanCountLabel}</dd>
                    </div>
                    <div>
                      <dt>Memberships</dt>
                      <dd>{view.identity.vendorsCountLabel}</dd>
                    </div>
                  </dl>
                </MobileCard>

                {view.summaryCards.map((card) => (
                  <MobileStatCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    progressText={card.progressText}
                  />
                ))}
              </>
            ) : (
              <VendorStateCard
                title="Vendor identity unavailable"
                message="The vendor identity route did not return usable account context for this dashboard."
                action={<ActionPill href="/vendor/account" tone="purple">Open account</ActionPill>}
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Catalog"
            title="Meal-plan catalog summary"
            description="The dashboard still loads vendor meal-plan inventory on entry and keeps catalog access on the existing route."
            action={<ActionPill href="/vendor/meal-plans">Open meal plans</ActionPill>}
          >
            {view.catalog.cards.map((card) => (
              <MobileStatCard
                key={card.label}
                label={card.label}
                value={card.value}
                progressText={card.progressText}
              />
            ))}

            {view.catalog.highlight ? <VendorHighlightCard mealPlan={view.catalog.highlight} /> : null}

            {view.catalog.hasMealPlans ? (
              <div className="mobile-pt-detail-stack">
                {view.catalog.rows.map((mealPlan) => (
                  <MobileMealPlanRow
                    key={mealPlan.id ?? mealPlan.name}
                    name={mealPlan.name}
                    vendorName={`${mealPlan.vendorName} | ${mealPlan.vendorZipLabel}`}
                    calories={mealPlan.caloriesLabel.replace(/\s*cal$/i, "")}
                    price={mealPlan.priceLabel}
                    status={mealPlan.statusLabel}
                  />
                ))}
              </div>
            ) : (
              <VendorStateCard
                title={view.catalog.emptyTitle}
                message={view.catalog.emptyMessage}
                action={<ActionPill href="/vendor/meal-plans">Open meal plans</ActionPill>}
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Metrics"
            title="Vendor metrics summary"
            description="Metrics remain read-only and are sourced from the existing vendor metrics route."
            action={<ActionPill href="/vendor/metrics" tone="purple">Open metrics</ActionPill>}
          >
            {view.metrics.hasMetrics ? (
              view.metrics.cards.map((card) => (
                <MobileStatCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  progressText={card.progressText}
                />
              ))
            ) : (
              <VendorStateCard
                title={view.metrics.unavailableTitle}
                message={view.metrics.unavailableMessage}
                action={<ActionPill href="/vendor/metrics" tone="purple">Open metrics</ActionPill>}
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Workspace"
            title="Vendor routes"
            description="These action cards only open existing vendor pages. No new operations, payments, or catalog mutation behavior is introduced here."
          >
            <div className="mobile-pt-detail-stack">
              {view.actions.map((action) => (
                <VendorActionCard key={action.href} action={action} />
              ))}
            </div>
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
