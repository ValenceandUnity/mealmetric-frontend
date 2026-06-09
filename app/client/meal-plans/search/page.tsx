"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileMealPlanRow } from "@/components/mobile/MobileMealPlanRow";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { readActiveMealPlanZipCodes } from "@/lib/client/meal-plan-zip-tracker";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, MealPlanListPayload } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import { adaptClientMealPlanSearchView, type MobileMealPlanSearchResultView } from "@/lib/view-models/meal-plans";

type MealPlansResponse = ApiResponse<MealPlanListPayload>;

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type SearchStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
};

type SearchResultCardProps = {
  row: MobileMealPlanSearchResultView;
};

const SEARCH_LINKS: Array<{
  href: string;
  label: string;
  tone: "purple" | "yellow";
}> = [
  { href: "/client/meal-plans", label: "Home", tone: "purple" },
  { href: "/client/meal-plans/schedule", label: "Schedule", tone: "yellow" },
  { href: "/client/meal-plans/search", label: "Search", tone: "yellow" },
  { href: "/client/meal-plans/bookmark", label: "Bookmark", tone: "yellow" },
];

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function SearchStateCard({
  title,
  message,
  action,
  role = "status",
}: SearchStateCardProps) {
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

function SearchResultCard({ row }: SearchResultCardProps) {
  return (
    <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
      <MobileMealPlanRow
        name={row.name}
        vendorName={`${row.vendorName} | ${row.vendorZipLabel}`}
        calories={row.caloriesLabel.replace(/\s*cal$/i, "")}
        price={row.priceLabel}
        status={row.statusLabel}
        action={<ActionPill href={row.href} tone="purple">View plan</ActionPill>}
      />

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
    </MobileCard>
  );
}

export default function ClientMealPlansSearchPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [query, setQuery] = useState("");
  const [mealPlansData, setMealPlansData] = useState<MealPlanListPayload | null>(null);
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
          setMealPlansData(null);
          return;
        }

        setMealPlansData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load meal plans for search.");
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
  }, [activeZipCodesCsv, debouncedQuery, status, user, zipStorageReady]);

  if (status === "loading") {
    return <LoadingBlock title="Loading meal plan search" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="Meal plan search requires an authenticated client session."
      />
    );
  }

  const view = adaptClientMealPlanSearchView({
    mealPlans: mealPlansData,
    query: debouncedQuery,
    activeZipCodes,
  });

  return (
    <MobileAppShell
      user={user}
      activePath="/client/meal-plans"
      greeting={formatDisplayNameFromUser(user)}
      title="Search meal plans"
      subtitle="Search the current meal-plan catalog through the protected client route."
      searchLabel="Search meal plans"
      searchPlaceholder="Search meal plans..."
      searchValue={query}
      onSearchChange={setQuery}
      topHubAction={<ActionPill href="/client/meal-plans" tone="purple">Back to plans</ActionPill>}
    >
      {loading ? (
        <MobileSection
          eyebrow="Loading"
          title={debouncedQuery ? "Searching meal plans" : "Loading meal plans"}
          description={
            debouncedQuery
              ? "Refreshing results from your current meal plan catalog."
              : "Preparing your current meal plan list."
          }
        >
          <SearchStateCard
            title={debouncedQuery ? "Searching meal plans" : "Loading meal plans"}
            message={
              debouncedQuery
                ? "Refreshing results from your current meal plan catalog."
                : "Preparing your current meal plan list."
            }
          />
        </MobileSection>
      ) : null}

      {errorMessage ? (
        <MobileSection
          eyebrow="Unavailable"
          title="Unable to load search"
          description="The protected client meal-plan route did not return usable search results."
        >
          <SearchStateCard
            title="Search unavailable"
            message={errorMessage}
            action={<ActionPill href="/client/meal-plans" tone="purple">Back to plans</ActionPill>}
            role="alert"
          />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <MobileSection
            eyebrow="Workspace"
            title="Meal-plan links"
            description="These links preserve the existing meal-plan home, schedule, search, and bookmark pages."
          >
            <MobileCard as="article" variant="action" className="mobile-meal-plan-hero">
              <div className="mobile-meal-plan-hero__copy">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Protected search surface</p>
                  <h3 className="mobile-section__title">Search results in the same meal-card system</h3>
                  <p className="mobile-section__description">
                    Search keeps the existing 250ms debounce and the supported `q` plus `zip_codes` request shape. This patch only changes presentation.
                  </p>
                </div>
                <div className="mobile-meal-plan-pill-row">
                  {SEARCH_LINKS.map((item) => (
                    <ActionPill key={item.href} href={item.href} tone={item.tone}>
                      {item.label}
                    </ActionPill>
                  ))}
                </div>
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection
            eyebrow="Search state"
            title="Current query and filters"
            description="This page preserves the existing 250ms debounced query behavior and sends only the currently supported `q` and `zip_codes` params."
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
                  <p className="mobile-section__eyebrow">Current search</p>
                  <h3 className="mobile-section__title">{view.filters.queryLabel}</h3>
                  <p className="mobile-section__description">{view.filters.note}</p>
                </div>
                <span className="mobile-pill mobile-pill--yellow">{view.filters.activeZipCountLabel}</span>
              </div>

              <div className="mobile-pt-actions">
                {view.filters.hasActiveZipFilter ? (
                  view.filters.activeZipChips.map((zipCode) => (
                    <span key={zipCode} className="mobile-pill mobile-pill--purple">{zipCode}</span>
                  ))
                ) : (
                  <span className="mobile-pill">No tracked ZIP filters</span>
                )}
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection
            eyebrow="Results"
            title="New meal plan releases"
            description="Search results show only real meal-plan fields already available on the current protected client payload."
          >
            {view.hasResults ? (
              <div className="mobile-pt-detail-stack">
                {view.rows.map((row) => (
                  <SearchResultCard key={row.id ?? row.name} row={row} />
                ))}
              </div>
            ) : (
              <SearchStateCard
                title={view.emptyState?.title ?? "No meal plans match your search"}
                message={
                  view.emptyState?.message ??
                  "No meal plans are available in the current catalog."
                }
              />
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
