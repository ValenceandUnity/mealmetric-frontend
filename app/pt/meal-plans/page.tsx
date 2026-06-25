"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileHeaderUtilities } from "@/components/mobile/MobileHeaderUtilities";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import { adaptPTMealPlansView, type MobilePTMealPlanResultView } from "@/lib/view-models/meal-plans";

type PTMealPlansResponse = ApiResponse<JsonValue>;

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type PTMealPlanStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
};

type PTMealPlanResultCardProps = {
  row: MobilePTMealPlanResultView;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function PTMealPlanStateCard({
  title,
  message,
  action,
  role = "status",
}: PTMealPlanStateCardProps) {
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

function PTMealPlanResultCard({ row }: PTMealPlanResultCardProps) {
  return (
    <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
      <div className="mobile-pt-client-card__header">
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">Recommendable meal plan</p>
          <h3 className="mobile-section__title">{row.name}</h3>
          <p className="mobile-section__description">{row.vendorName}</p>
        </div>
        <span className="mobile-pill mobile-pill--purple">{row.statusLabel}</span>
      </div>

      <dl className="mobile-pt-fact-grid">
        <div>
          <dt>Vendor ZIP</dt>
          <dd>{row.vendorZipLabel}</dd>
        </div>
        <div>
          <dt>Calories</dt>
          <dd>{row.caloriesLabel}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{row.priceLabel}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{row.itemCountLabel}</dd>
        </div>
        <div>
          <dt>Availability</dt>
          <dd>{row.availabilityLabel}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{row.statusLabel}</dd>
        </div>
      </dl>

      <div className="mobile-pt-actions">
        <span className="mobile-pill">Discovery only</span>
        <span className="mobile-pill mobile-pill--yellow">Use a client workspace to recommend</span>
      </div>
    </MobileCard>
  );
}

export default function PTMealPlansPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [mealPlansData, setMealPlansData] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/pt/meal-plans/search", { cache: "no-store" });
        const payload = (await response.json()) as PTMealPlansResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setMealPlansData(null);
          return;
        }

        setMealPlansData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load PT meal plans.");
          setMealPlansData(null);
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

  const view = useMemo(
    () => adaptPTMealPlansView({
      mealPlans: mealPlansData,
      query: deferredSearch,
    }),
    [deferredSearch, mealPlansData],
  );

  if (status === "loading") {
    return <LoadingBlock title="Loading PT meal plans" message="Validating your BFF-managed PT session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT meal plans require an authenticated PT session." />;
  }

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="PT Meal Plans"
      subtitle="Discover recommendable meal plans through the protected PT search route while recommendation creation stays in the client workspace."
      searchLabel="Filter PT meal plans"
      searchPlaceholder="Filter loaded meal plans"
      searchValue={searchValue}
      onSearchChange={(nextValue) => {
        startTransition(() => {
          setSearchValue(nextValue);
        });
      }}
      notificationSlot={<MobileHeaderUtilities settingsHref="/pt/settings" />}
      topHubAction={<ActionPill href="/pt/clients">Open clients</ActionPill>}
      activePath="/pt/meal-plans"
      showAvatar={false}
    >
      {loading ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading PT meal plans"
          description="Fetching the current PT meal-plan catalog through the protected PT BFF route."
        >
          <PTMealPlanStateCard
            title="Refreshing PT meal plans"
            message="Your PT meal-plan catalog is loading through the protected frontend-to-BFF path."
          />
        </MobileSection>
      ) : null}

      {errorMessage ? (
        <MobileSection
          eyebrow="Unavailable"
          title="PT meal plans unavailable"
          description="This screen stays inside the protected PT BFF boundary and does not fall back to direct backend calls."
        >
          <PTMealPlanStateCard
            title="Unable to load PT meal plans"
            message={errorMessage}
            action={<ActionPill href="/pt">Back home</ActionPill>}
            role="alert"
          />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <MobileSection
            eyebrow="Supported destinations"
            title="PT meal-plan workspace"
            description="The previous placeholder links remain available here, and recommendation creation still starts from a client workspace."
          >
            <MobileCard as="article" variant="action" className="mobile-meal-plan-hero">
              <div className="mobile-meal-plan-hero__copy">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Protected PT catalog</p>
                  <h3 className="mobile-section__title">Browse meal plans with the same mobile card language</h3>
                  <p className="mobile-section__description">
                    PT discovery remains read-only here. Recommendation creation still belongs to the client-specific workflow.
                  </p>
                </div>
                <div className="mobile-meal-plan-pill-row">
                  <ActionPill href="/pt" tone="purple">PT home</ActionPill>
                  <ActionPill href="/pt/clients">Open clients</ActionPill>
                </div>
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection
            eyebrow="Discovery"
            title="PT meal-plan overview"
            description="This page preserves the current PT meal-plan search route and keeps filtering local on mobile without introducing recommendation mutation."
          >
            {view.summaryCards.map((card) => (
              <MobileStatCard
                key={card.label}
                label={card.label}
                value={card.value}
                progressText={card.progressText}
              />
            ))}

            <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Current filter</p>
                  <h3 className="mobile-section__title">{view.search.queryLabel}</h3>
                  <p className="mobile-section__description">{view.search.note}</p>
                </div>
                <span className="mobile-pill mobile-pill--yellow">{view.search.stateLabel}</span>
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection
            eyebrow="Results"
            title="New meal plan releases"
            description="These cards show only real meal-plan fields already available on the current PT search payload."
          >
            {view.hasResults ? (
              <div className="mobile-pt-detail-stack">
                {view.rows.map((row) => (
                  <PTMealPlanResultCard key={row.id ?? row.name} row={row} />
                ))}
              </div>
            ) : (
              <PTMealPlanStateCard
                title={view.emptyState?.title ?? "No PT meal plans are available"}
                message={
                  view.emptyState?.message ??
                  "The PT meal-plan search route did not return any discoverable meal plans."
                }
                action={<ActionPill href="/pt/clients">Open clients</ActionPill>}
              />
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
