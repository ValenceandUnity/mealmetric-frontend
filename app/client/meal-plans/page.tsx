"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { PageShell } from "@/components/layout/PageShell";
import { MealPlanCard } from "@/components/meal-plans/MealPlanCard";
import { ActionRow } from "@/components/ui/ActionRow";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
import { useSessionBootstrap } from "@/lib/client/session";
import type {
  ApiResponse,
  BookmarkFolder,
  BookmarkFolderListPayload,
  MealPlanSummary,
} from "@/lib/types/api";

type MealPlansResponse = ApiResponse<{ items: MealPlanSummary[]; count: number }>;
type BookmarksResponse = ApiResponse<BookmarkFolderListPayload>;
type CreateFolderResponse = ApiResponse<BookmarkFolder>;

type FilterDraft = {
  zipCode: string;
  budgetMin: string;
  budgetMax: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  zipCode: "",
  budgetMin: "",
  budgetMax: "",
};

function getBookmarkedMealPlanIds(folders: BookmarkFolder[]): Set<string> {
  return new Set(folders.flatMap((folder) => folder.items.map((item) => item.meal_plan_id)));
}

function findBookmarkMatch(
  folders: BookmarkFolder[],
  mealPlanId: string,
): { folderId: string; itemId: string } | null {
  for (const folder of folders) {
    for (const item of folder.items) {
      if (item.meal_plan_id === mealPlanId) {
        return { folderId: folder.id, itemId: item.id };
      }
    }
  }

  return null;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getActiveFilterChips(filters: FilterDraft) {
  const chips: string[] = [];

  if (filters.zipCode.trim()) {
    chips.push(`ZIP ${filters.zipCode.trim()}`);
  }
  if (filters.budgetMin.trim()) {
    chips.push(`Min $${filters.budgetMin.trim()}`);
  }
  if (filters.budgetMax.trim()) {
    chips.push(`Max $${filters.budgetMax.trim()}`);
  }

  return chips;
}

export default function ClientMealPlansPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [filters, setFilters] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [mealPlans, setMealPlans] = useState<MealPlanSummary[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkFolder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkBusyId, setBookmarkBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const searchParams = new URLSearchParams();
      if (filters.zipCode.trim()) {
        searchParams.set("zip_code", filters.zipCode.trim());
      }
      if (filters.budgetMin.trim()) {
        searchParams.set("budget_min_cents", String(Number(filters.budgetMin) * 100));
      }
      if (filters.budgetMax.trim()) {
        searchParams.set("budget_max_cents", String(Number(filters.budgetMax) * 100));
      }

      try {
        const mealPlanUrl = searchParams.toString()
          ? `/api/client/meal-plans?${searchParams.toString()}`
          : "/api/client/meal-plans";

        const [mealPlanResponse, bookmarkResponse] = await Promise.all([
          fetch(mealPlanUrl, { cache: "no-store" }),
          fetch("/api/client/bookmarks", { cache: "no-store" }),
        ]);

        const mealPlanPayload = (await mealPlanResponse.json()) as MealPlansResponse;
        const bookmarkPayload = (await bookmarkResponse.json()) as BookmarksResponse;

        if (!active) {
          return;
        }

        if (!mealPlanPayload.ok) {
          setLoadError(mealPlanPayload.error.message);
          setMealPlans([]);
          return;
        }

        if (!bookmarkPayload.ok) {
          setLoadError(bookmarkPayload.error.message);
          setBookmarks([]);
          return;
        }

        setMealPlans(mealPlanPayload.data.items);
        setBookmarks(bookmarkPayload.data.items);
      } catch {
        if (active) {
          setLoadError("Unable to load meal plans.");
          setMealPlans([]);
          setBookmarks([]);
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
  }, [filters, status, user]);

  const bookmarkedIds = useMemo(() => getBookmarkedMealPlanIds(bookmarks), [bookmarks]);
  const activeFilterChips = useMemo(() => getActiveFilterChips(filters), [filters]);

  const vendorCount = useMemo(
    () => new Set(mealPlans.map((mealPlan) => mealPlan.vendor_id)).size,
    [mealPlans],
  );
  const totalMeals = useMemo(
    () => mealPlans.reduce((sum, mealPlan) => sum + mealPlan.item_count, 0),
    [mealPlans],
  );
  const priceRange = useMemo(() => {
    if (mealPlans.length === 0) {
      return "Unavailable";
    }

    const values = mealPlans.map((mealPlan) => mealPlan.total_price_cents);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return min === max ? formatPrice(min) : `${formatPrice(min)} to ${formatPrice(max)}`;
  }, [mealPlans]);

  const highlightedPlan = useMemo(() => {
    const bookmarkedPlan = mealPlans.find((mealPlan) => bookmarkedIds.has(mealPlan.id));
    return bookmarkedPlan ?? mealPlans[0] ?? null;
  }, [bookmarkedIds, mealPlans]);

  async function ensureDefaultFolder(): Promise<BookmarkFolder | null> {
    if (bookmarks.length > 0) {
      return bookmarks[0];
    }

    const response = await fetch("/api/client/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Favorites" }),
    });
    const payload = (await response.json()) as CreateFolderResponse;
    if (!payload.ok) {
      setActionFeedback({
        tone: "error",
        title: "Bookmark update failed",
        message: payload.error.message,
      });
      return null;
    }

    const nextFolders = [payload.data];
    setBookmarks(nextFolders);
    return payload.data;
  }

  async function refreshBookmarks() {
    const response = await fetch("/api/client/bookmarks", { cache: "no-store" });
    const payload = (await response.json()) as BookmarksResponse;
    if (!payload.ok) {
      throw new Error(payload.error.message);
    }

    setBookmarks(payload.data.items);
  }

  async function handleToggleBookmark(mealPlan: MealPlanSummary) {
    setBookmarkBusyId(mealPlan.id);
    const existing = findBookmarkMatch(bookmarks, mealPlan.id);
    const removing = Boolean(existing);
    setActionFeedback({
      tone: "info",
      title: removing ? "Removing bookmark" : "Saving bookmark",
      message: removing
        ? `${mealPlan.name} is being removed from your saved plans.`
        : `${mealPlan.name} is being added to your saved plans.`,
    });

    try {
      if (existing) {
        const response = await fetch(
          `/api/client/bookmarks/${existing.folderId}/items/${existing.itemId}`,
          { method: "DELETE" },
        );
        const payload = (await response.json()) as ApiResponse<{ deleted: true }>;
        if (!payload.ok) {
          setActionFeedback({
            tone: "error",
            title: "Bookmark update failed",
            message: payload.error.message,
          });
          return;
        }
      } else {
        const folder = await ensureDefaultFolder();
        if (!folder) {
          return;
        }
        const response = await fetch(`/api/client/bookmarks/${folder.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meal_plan_id: mealPlan.id }),
        });
        const payload = (await response.json()) as ApiResponse<unknown>;
        if (!payload.ok) {
          setActionFeedback({
            tone: "error",
            title: "Bookmark update failed",
            message: payload.error.message,
          });
          return;
        }
      }

      await refreshBookmarks();
      setActionFeedback({
        tone: "success",
        title: removing ? "Bookmark removed" : "Bookmark saved",
        message: removing
          ? `${mealPlan.name} was removed from your saved plans.`
          : `${mealPlan.name} was added to your saved plans.`,
      });
    } catch {
      setActionFeedback({
        tone: "error",
        title: "Bookmark update failed",
        message: "Unable to update bookmark.",
      });
    } finally {
      setBookmarkBusyId(null);
    }
  }

  if (status === "loading") {
    return <LoadingBlock title="Loading meal plans" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="Meal plan discovery requires an authenticated client session."
      />
    );
  }

  return (
    <PageShell title="Meal plans" user={user}>
      {loading ? (
        <LoadingBlock title="Loading plans" message="Fetching meal-plan discovery data." />
      ) : null}
      {loadError ? (
        <ErrorBlock title="Unable to load meal plans" message={loadError} />
      ) : null}
      {actionFeedback ? (
        <FeedbackBanner
          tone={actionFeedback.tone}
          title={actionFeedback.title}
          message={actionFeedback.message}
        />
      ) : null}

      {!loading && !loadError ? (
        <>
          <Card className="client-meal-plans-hero" variant="accent" as="section">
            <div className="client-meal-plans-hero__layout">
              <div className="client-meal-plans-hero__lead">
                <PageHeader
                  eyebrow="Client meal plans"
                  title="Discovery workspace"
                  description="Browse the live catalog, keep track of saved options, and move from quick comparison into plan detail without leaving the protected client shell."
                  chips={
                    activeFilterChips.length > 0
                      ? activeFilterChips
                      : ["All ZIPs", "All budgets", "Live catalog"]
                  }
                  actions={
                    <ActionRow>
                      <Link className="link-button link-button--accent" href="/client/bookmarks">
                        Saved plans
                      </Link>
                      <Link className="link-button" href="/client/metrics">
                        Review metrics
                      </Link>
                    </ActionRow>
                  }
                />
                <div className="client-meal-plans-hero__stats">
                  <StatPill
                    label="Available plans"
                    value={`${mealPlans.length}`}
                    hint="Returned through the current client meal-plan BFF route."
                    active
                  />
                  <StatPill
                    label="Saved plans"
                    value={`${bookmarkedIds.size}`}
                    hint="Plans currently saved into client bookmark folders."
                  />
                  <StatPill
                    label="Vendors"
                    value={`${vendorCount}`}
                    hint="Distinct vendors represented in the current results."
                  />
                  <StatPill
                    label="Meals surfaced"
                    value={`${totalMeals}`}
                    hint="Total item count across the currently visible meal plans."
                  />
                </div>
              </div>

              <Card className="client-meal-plans-hero__focus" variant="soft">
                <ListRow
                  eyebrow="Current browse state"
                  title={
                    activeFilterChips.length > 0
                      ? "Focused catalog window"
                      : "Open discovery window"
                  }
                  description={
                    mealPlans.length > 0
                      ? "The current screen is showing live catalog results with saved-state integration, not recommendation scoring or editorial ranking."
                      : "The current filter state did not return any meal plans, so the discovery surface is narrowed to an empty catalog."
                  }
                  metadata={[
                    { label: "Price range", value: priceRange },
                    { label: "Filters", value: `${activeFilterChips.length}` },
                    { label: "Bookmarks", value: `${bookmarkedIds.size}` },
                  ]}
                  status={{
                    label: mealPlans.length > 0 ? "Catalog live" : "No results",
                    tone: mealPlans.length > 0 ? "success" : "warning",
                  }}
                />
                <div className="client-meal-plans-hero__chips">
                  <Chip tone="accent">
                    {highlightedPlan ? highlightedPlan.vendor_name : "Awaiting results"}
                  </Chip>
                  <Chip tone="muted">
                    {highlightedPlan ? `${highlightedPlan.item_count} meals in focus` : "No plan in focus"}
                  </Chip>
                </div>
              </Card>
            </div>
          </Card>

          <SectionBlock
            eyebrow="Controls"
            title="Discovery controls"
            description="ZIP and budget controls use the current supported query params only. No client-side-only search behavior has been added."
          >
            <div className="client-meal-plans-controls">
              <Card className="client-meal-plans-filters" variant="soft">
                <PageHeader
                  eyebrow="Filter context"
                  title="ZIP and budget window"
                  description="These are the only supported discovery controls right now. The page does not invent deeper filtering beyond the approved query params."
                />
                <form
                  className="form-grid grid--3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setFilters(draft);
                  }}
                >
                  <div className="field">
                    <label htmlFor="zip-code">ZIP code</label>
                    <input
                      id="zip-code"
                      value={draft.zipCode}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, zipCode: event.target.value }))
                      }
                      placeholder="10001"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="budget-min">Budget min ($)</label>
                    <input
                      id="budget-min"
                      type="number"
                      min="0"
                      step="1"
                      value={draft.budgetMin}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, budgetMin: event.target.value }))
                      }
                      placeholder="12"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="budget-max">Budget max ($)</label>
                    <input
                      id="budget-max"
                      type="number"
                      min="0"
                      step="1"
                      value={draft.budgetMax}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, budgetMax: event.target.value }))
                      }
                      placeholder="25"
                    />
                  </div>
                  <ActionRow>
                    <button type="submit">Apply filters</button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(DEFAULT_FILTERS);
                        setFilters(DEFAULT_FILTERS);
                      }}
                    >
                      Clear
                    </button>
                  </ActionRow>
                </form>
                <div className="client-meal-plans-filter-chips">
                  {(activeFilterChips.length > 0 ? activeFilterChips : ["No active filters"]).map((chip) => (
                    <Chip key={chip} tone={activeFilterChips.length > 0 ? "accent" : "muted"}>
                      {chip}
                    </Chip>
                  ))}
                </div>
              </Card>

              <Card className="client-meal-plans-filter-note" variant="ghost">
                <ListRow
                  eyebrow="Current boundary"
                  title="Discovery remains neutral"
                  description="The featured plan is a presentation focus only. The page does not imply recommendation scoring, ranking, or hidden selection logic."
                  footer={
                    <Badge
                      label={activeFilterChips.length > 0 ? "Filtered catalog" : "Open catalog"}
                      tone="accent"
                    />
                  }
                />
              </Card>
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Summary"
            title="Catalog framing"
            description="High-level context derived from the current result set."
          >
            <div className="client-meal-plans-analytics">
              <AnalyticsCard
                eyebrow="Current results"
                title="Catalog summary"
                description="This summary reflects the exact meal plans currently returned in the protected discovery route."
                stats={[
                  { label: "Plans", value: `${mealPlans.length}` },
                  { label: "Saved", value: `${bookmarkedIds.size}` },
                  { label: "Vendors", value: `${vendorCount}` },
                  { label: "Price range", value: priceRange },
                ]}
              />
              <Card className="client-meal-plans-context" variant="soft">
                <ListRow
                  eyebrow="Browse context"
                  title={mealPlans.length > 0 ? "Current browse window" : "Catalog not populated"}
                  description={
                    mealPlans.length > 0
                      ? "Use the featured plan as the visual entry point, then scan the catalog stack below."
                      : "No meal plans were returned for the current filter combination."
                  }
                  metadata={[
                    { label: "Meals surfaced", value: `${totalMeals}` },
                    { label: "Filters", value: activeFilterChips.length > 0 ? `${activeFilterChips.length}` : "0" },
                    { label: "Bookmarks", value: `${bookmarkedIds.size}` },
                  ]}
                />
              </Card>
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Highlight"
            title="Featured plan"
            description="This spotlight gives the current catalog a stronger visual entry point without implying recommendation logic the payload does not provide."
          >
            {highlightedPlan ? (
              <div className="client-meal-plans-featured-layout">
                <Card className="client-meal-plans-featured" variant="soft">
                  <PageHeader
                    eyebrow={bookmarkedIds.has(highlightedPlan.id) ? "Saved highlight" : "Catalog highlight"}
                    title={highlightedPlan.name}
                    description={highlightedPlan.description ?? "Meal-plan detail is available from the current protected route."}
                    status={{
                      label: bookmarkedIds.has(highlightedPlan.id) ? "Saved" : highlightedPlan.status,
                      tone: bookmarkedIds.has(highlightedPlan.id) ? "success" : "accent",
                    }}
                  />
                  <div className="client-meal-plans-featured__chips">
                    <Chip tone="accent">{formatPrice(highlightedPlan.total_price_cents)}</Chip>
                    <Chip tone="muted">{`${highlightedPlan.item_count} meals`}</Chip>
                    <Chip tone="muted">{highlightedPlan.vendor_name}</Chip>
                    <Chip tone="muted">{highlightedPlan.vendor_zip_code ?? "ZIP unavailable"}</Chip>
                  </div>
                  <div className="client-meal-plans-featured__stats">
                    <StatPill label="Availability windows" value={`${highlightedPlan.availability_count}`} />
                    <StatPill label="Calories" value={`${highlightedPlan.total_calories}`} />
                    <StatPill label="Status" value={highlightedPlan.status} />
                    <StatPill
                      label="Bookmark state"
                      value={bookmarkedIds.has(highlightedPlan.id) ? "Saved" : "Not saved"}
                    />
                  </div>
                  <ActionRow>
                    <Link className="link-button" href={`/client/meal-plans/${highlightedPlan.id}`}>
                      View plan
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleToggleBookmark(highlightedPlan)}
                      disabled={bookmarkBusyId === highlightedPlan.id}
                    >
                      {bookmarkBusyId === highlightedPlan.id
                        ? "Saving..."
                        : bookmarkedIds.has(highlightedPlan.id)
                          ? "Remove bookmark"
                          : "Bookmark"}
                    </button>
                  </ActionRow>
                </Card>

                <Card className="client-meal-plans-spotlight" variant="ghost">
                  <ListRow
                    eyebrow="Spotlight note"
                    title="Featured is a curated presentation layer"
                    description="The spotlight uses the current visible catalog window and saved state to create a stronger entry point, while staying honest about the absence of recommendation scoring."
                    metadata={[
                      { label: "Visible plans", value: `${mealPlans.length}` },
                      { label: "Saved plans", value: `${bookmarkedIds.size}` },
                      { label: "Vendors", value: `${vendorCount}` },
                    ]}
                  />
                </Card>
              </div>
            ) : (
              <EmptyState
                title="No featured plan yet"
                message="As soon as the catalog returns meal plans, one plan will be highlighted here for quick scanning."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Browse"
            title="Meal-plan catalog"
            description="Browse the current meal-plan results and open detail pages through the existing route structure."
          >
            {mealPlans.length > 0 ? (
              <div className="client-meal-plans-catalog">
                <Card className="client-meal-plans-catalog-note" variant="ghost">
                  <ListRow
                    eyebrow="Catalog scan"
                    title="Start with the first visible plans"
                    description="The catalog remains a live result stack. The first visible plans are surfaced as the easiest scan point, then the full stack continues below."
                  />
                </Card>
                {mealPlans.map((mealPlan, index) => (
                  <MealPlanCard
                    key={mealPlan.id}
                    mealPlan={mealPlan}
                    bookmarked={bookmarkedIds.has(mealPlan.id)}
                    bookmarkBusy={bookmarkBusyId === mealPlan.id}
                    onToggleBookmark={handleToggleBookmark}
                    footer={
                      index < 3 ? (
                        <Badge
                          label={index === 0 ? "Top visible plan" : "Visible now"}
                          tone="accent"
                        />
                      ) : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No meal plans returned"
                message={
                  activeFilterChips.length > 0
                    ? "Try broadening the current ZIP or budget filters."
                    : "The meal-plan catalog is currently empty for this client session."
                }
              />
            )}
          </SectionBlock>
        </>
      ) : null}
    </PageShell>
  );
}
