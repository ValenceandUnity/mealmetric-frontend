"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { PageShell } from "@/components/layout/PageShell";
import { MealPlanCard } from "@/components/meal-plans/MealPlanCard";
import { MealPlansTopNav } from "@/components/meal-plans/MealPlansTopNav";
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
import {
  readActiveMealPlanZipCodes,
  writeActiveMealPlanZipCodes,
} from "@/lib/client/meal-plan-zip-tracker";
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
type ZipTrackerEntry = {
  id: string;
  label: string;
  kind: "zip" | "city";
  selected: boolean;
};

type FilterDraft = {
  zipCode: string;
  budgetMax: string;
  budgetDuration: string;
  customDuration: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  zipCode: "",
  budgetMax: "",
  budgetDuration: "one day",
  customDuration: "",
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

  if (filters.budgetMax.trim()) {
    chips.push(`Max $${filters.budgetMax.trim()}`);
  }

  return chips;
}

function getSelectedZipCodes(entries: ZipTrackerEntry[]): string[] {
  const selectedZipCodes: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (entry.kind !== "zip" || !entry.selected || seen.has(entry.label)) {
      continue;
    }
    seen.add(entry.label);
    selectedZipCodes.push(entry.label);
  }

  return selectedZipCodes;
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [trackedLocations, setTrackedLocations] = useState<ZipTrackerEntry[]>([]);
  const [draftTrackedLocations, setDraftTrackedLocations] = useState<ZipTrackerEntry[]>([]);
  const [trackerInput, setTrackerInput] = useState("");
  const [trackerStorageReady, setTrackerStorageReady] = useState(false);
  const activeTrackedZipCodes = useMemo(() => getSelectedZipCodes(trackedLocations), [trackedLocations]);

  useEffect(() => {
    const activeZipCodes = readActiveMealPlanZipCodes();
    if (activeZipCodes.length === 0) {
      setTrackerStorageReady(true);
      return;
    }

    const persistedTrackedLocations: ZipTrackerEntry[] = activeZipCodes.map((zipCode) => ({
      id: `zip-${zipCode}-persisted`,
      label: zipCode,
      kind: "zip",
      selected: true,
    }));

    setTrackedLocations(persistedTrackedLocations);
    setDraftTrackedLocations(persistedTrackedLocations);
    setFilters((current) => ({
      ...current,
      zipCode: current.zipCode || activeZipCodes[0] || "",
    }));
    setDraft((current) => ({
      ...current,
      zipCode: current.zipCode || activeZipCodes[0] || "",
    }));
    setTrackerStorageReady(true);
  }, []);

  useEffect(() => {
    if (!trackerStorageReady) {
      return;
    }
    writeActiveMealPlanZipCodes(activeTrackedZipCodes);
  }, [activeTrackedZipCodes, trackerStorageReady]);

  useEffect(() => {
    if (!trackerStorageReady) {
      return;
    }
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const searchParams = new URLSearchParams();
      if (activeTrackedZipCodes.length > 0) {
        searchParams.set("zip_codes", activeTrackedZipCodes.join(","));
      } else if (filters.zipCode.trim()) {
        searchParams.set("zip_code", filters.zipCode.trim());
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
  }, [activeTrackedZipCodes, filters, status, trackerStorageReady, user]);

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
  const resolvedBudget = useMemo(() => Number(filters.budgetMax) || 0, [filters.budgetMax]);
  const resolvedDurationLabel = useMemo(() => {
    if (filters.budgetDuration === "custom duration") {
      return filters.customDuration.trim() || "Custom duration";
    }

    return filters.budgetDuration;
  }, [filters.budgetDuration, filters.customDuration]);
  const activeZipCount = useMemo(
    () => trackedLocations.filter((entry) => entry.kind === "zip" && entry.selected).length,
    [trackedLocations],
  );
  const draftActiveZipCount = useMemo(
    () => draftTrackedLocations.filter((entry) => entry.kind === "zip" && entry.selected).length,
    [draftTrackedLocations],
  );

  function openBudgetMarkerEditor() {
    setDraft(filters);
    setDraftTrackedLocations(trackedLocations);
    setTrackerInput("");
    setFiltersOpen(true);
  }

  function handleAddTrackerEntry() {
    const value = trackerInput.trim();
    if (!value) {
      return;
    }

    const isZip = /^\d{5}$/.test(value);

    setDraftTrackedLocations((current) => {
      const duplicate = current.some(
        (entry) => entry.kind === (isZip ? "zip" : "city") && entry.label.toLowerCase() === value.toLowerCase(),
      );
      if (duplicate) {
        return current;
      }

      const nextEntry: ZipTrackerEntry = {
        id: `${isZip ? "zip" : "city"}-${value}-${Date.now()}`,
        label: value,
        kind: isZip ? "zip" : "city",
        selected: isZip,
      };

      if (!isZip) {
        return [...current, nextEntry];
      }

      return [...current, nextEntry];
    });

    if (/^\d{5}$/.test(value)) {
      setDraft((current) => ({
        ...current,
        zipCode: current.zipCode.trim() ? current.zipCode : value,
      }));
    }

    setTrackerInput("");
  }

  function handleToggleZipEntry(entryId: string) {
    setDraftTrackedLocations((current) => {
      const target = current.find((entry) => entry.id === entryId);
      if (!target || target.kind !== "zip") {
        return current;
      }

      const nextEntries = current.map((entry) =>
        entry.id === entryId ? { ...entry, selected: !entry.selected } : entry,
      );
      const selectedZip = nextEntries.find((entry) => entry.kind === "zip" && entry.selected);

      setDraft((currentDraft) => ({
        ...currentDraft,
        zipCode: selectedZip?.label ?? "",
      }));

      return nextEntries;
    });
  }

  function handleDeleteTrackerEntry(entryId: string) {
    setDraftTrackedLocations((current) => {
      const target = current.find((entry) => entry.id === entryId);
      const nextEntries = current.filter((entry) => entry.id !== entryId);

      if (target?.kind === "zip" && target.selected) {
        const nextSelectedZip = nextEntries.find((entry) => entry.kind === "zip" && entry.selected);
        setDraft((currentDraft) => ({
          ...currentDraft,
          zipCode: nextSelectedZip?.label ?? "",
        }));
      }

      return nextEntries;
    });
  }

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
    <PageShell
      title="Meal plans"
      user={user}
      className="app-shell--client-meal-plans"
      hideTopHub
    >
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
          <Card className="client-meal-plans-budget-marker" variant="accent" as="section">
            <div className="client-meal-plans-budget-marker__header">
              <div className="client-meal-plans-budget-marker__heading">
                <p className="client-meal-plans-budget-marker__eyebrow">Client meal plans</p>
                <h2 className="client-meal-plans-budget-marker__title">Budget Marker</h2>
              </div>
              <div className="client-meal-plans-budget-marker__meta">
                <Chip tone="muted">{resolvedDurationLabel}</Chip>
              </div>
            </div>
            <div className="client-meal-plans-budget-marker__row">
              <div className="client-meal-plans-budget-marker__value-group">
                <p className="client-meal-plans-budget-marker__value">{`$${resolvedBudget}`}</p>
                <p className="client-meal-plans-budget-marker__caption">
                  Use the current supported ZIP and budget controls without leaving the top discovery marker open.
                </p>
              </div>
            </div>
            <div className="client-meal-plans-budget-marker__actions">
              <ActionRow>
                <button
                  type="button"
                  aria-expanded={filtersOpen}
                  aria-controls="budget-marker-controls"
                  onClick={() => {
                    if (filtersOpen) {
                      setFiltersOpen(false);
                      return;
                    }
                    openBudgetMarkerEditor();
                  }}
                >
                  {filtersOpen ? "Close edit" : "Edit Budget Marker"}
                </button>
              </ActionRow>
            </div>
          </Card>

          {filtersOpen ? (
            <section className="client-meal-plans-filter-panel" id="budget-marker-controls">
              <Card className="client-meal-plans-filters" variant="soft">
                <div className="client-meal-plans-edit-section">
                  <PageHeader
                    eyebrow="Budget Marker edit"
                    title="Plan your spend"
                    description="Set your budget, choose how long it should last, then pick the ZIP you want to browse around."
                  />
                </div>

                <form
                  className="client-meal-plans-edit-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setFilters(draft);
                    setTrackedLocations(draftTrackedLocations);
                    setFiltersOpen(false);
                  }}
                >
                  <div className="client-meal-plans-edit-section">
                    <div className="client-meal-plans-edit-section__header">
                      <h3>Budget filters</h3>
                    </div>
                    <div className="form-grid grid--2">
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
                      <div className="field">
                        <label htmlFor="budget-duration">Budget Duration</label>
                        <select
                          id="budget-duration"
                          value={draft.budgetDuration}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, budgetDuration: event.target.value }))
                          }
                        >
                          <option value="one day">one day</option>
                          <option value="one week">one week</option>
                          <option value="bi weekly">bi weekly</option>
                          <option value="month">month</option>
                          <option value="custom duration">custom duration</option>
                        </select>
                      </div>
                    </div>
                    {draft.budgetDuration === "custom duration" ? (
                      <div className="field">
                        <label htmlFor="custom-duration">Custom duration</label>
                        <input
                          id="custom-duration"
                          value={draft.customDuration}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, customDuration: event.target.value }))
                          }
                          placeholder="Enter duration"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="client-meal-plans-edit-section client-meal-plans-zip-tracker">
                    <div className="client-meal-plans-edit-section__header">
                      <h3>ZIP Code Tracker</h3>
                      <Badge
                        label={
                          draftActiveZipCount === 1
                            ? "1 Active Zip Code"
                            : `${draftActiveZipCount} Active Zip Codes`
                        }
                        tone="accent"
                      />
                    </div>
                    <p className="client-meal-plans-zip-tracker__copy">
                      Add ZIPs you want to use for browsing. City names stay local as notes until you add a ZIP.
                    </p>
                    <div className="client-meal-plans-zip-tracker__add">
                      <input
                        aria-label="Add ZIP code or city"
                        value={trackerInput}
                        onChange={(event) => setTrackerInput(event.target.value)}
                        placeholder="10001 or Boston"
                      />
                      <button type="button" onClick={handleAddTrackerEntry}>
                        Add
                      </button>
                    </div>
                    {draftTrackedLocations.length > 0 ? (
                      <div className="client-meal-plans-zip-tracker__list">
                        {draftTrackedLocations.map((entry) => (
                          <div
                            key={entry.id}
                            className={[
                              "client-meal-plans-zip-entry",
                              entry.selected ? "client-meal-plans-zip-entry--active" : "",
                              entry.kind === "city" ? "client-meal-plans-zip-entry--city" : "",
                            ].filter(Boolean).join(" ")}
                          >
                            <button
                              type="button"
                              className="client-meal-plans-zip-entry__select"
                              onClick={() => {
                                if (entry.kind === "zip") {
                                  handleToggleZipEntry(entry.id);
                                }
                              }}
                              aria-pressed={entry.kind === "zip" ? entry.selected : undefined}
                              disabled={entry.kind !== "zip"}
                            >
                              <span className="client-meal-plans-zip-entry__label">{entry.label}</span>
                              <span className="client-meal-plans-zip-entry__meta">
                                {entry.kind === "zip"
                                  ? entry.selected
                                    ? "Active"
                                    : "Tracking Off"
                                  : "City note only"}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="client-meal-plans-zip-entry__delete"
                              aria-label={`Delete ${entry.label}`}
                              onClick={() => handleDeleteTrackerEntry(entry.id)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M9 4.5h6m-8 3h10m-8 0v9m3-9v9m3-9v9M8 7.5l.5 11a1 1 0 0 0 1 .95h5a1 1 0 0 0 1-.95l.5-11" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="No ZIPs tracked yet"
                        message="Add a ZIP to keep it ready for browsing, or save a city note locally until you have a ZIP."
                      />
                    )}
                  </div>

                  <div className="client-meal-plans-filters__actions">
                    <ActionRow>
                      <button type="submit">Apply filters</button>
                    </ActionRow>
                  </div>
                </form>
              </Card>
            </section>
          ) : null}

          <MealPlansTopNav />

          <SectionBlock
            eyebrow="Discover"
            title="Recommended Meal Plans"
            description="A quick visual pass across meal plans already available in your current browsing set."
            actions={
              <button
                type="button"
                className="link-button client-meal-plans-section-link"
                onClick={() => {
                  const catalogSection = document.getElementById("meal-plan-catalog");
                  catalogSection?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                See All
              </button>
            }
          >
            {mealPlans.length > 0 ? (
              <div className="client-meal-plans-recommended">
                {mealPlans.slice(0, 6).map((mealPlan, index) => (
                  <article
                    key={`recommended-${mealPlan.id}`}
                    className={[
                      "client-meal-plans-recommended-card",
                      index === 0 ? "client-meal-plans-recommended-card--highlighted" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <div className="client-meal-plans-recommended-card__top">
                      {index === 0 ? <Badge label="Trainer's Choice" tone="accent" /> : null}
                    </div>
                    <div className="client-meal-plans-recommended-card__body">
                      <h3 className="client-meal-plans-recommended-card__title">{mealPlan.name}</h3>
                    </div>
                    <div className="client-meal-plans-recommended-card__meta">
                      <span>{`${mealPlan.total_calories} Calories`}</span>
                      <span>{formatPrice(mealPlan.total_price_cents)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No meal plans ready"
                message="Recommended meal plans will appear here when the current browsing set has available plans."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Browse Next"
            title="Upcoming Meals"
            description="A quick-scan list built from the meal plans already visible on this page."
            actions={
              <button
                type="button"
                className="link-button client-meal-plans-section-link"
                onClick={() => {
                  const catalogSection = document.getElementById("meal-plan-catalog");
                  catalogSection?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                See All
              </button>
            }
          >
            {mealPlans.length > 0 ? (
              <div className="client-meal-plans-upcoming">
                {mealPlans.slice(0, 5).map((mealPlan) => (
                  <article key={`upcoming-${mealPlan.id}`} className="client-meal-plans-upcoming-row">
                    <div className="client-meal-plans-upcoming-row__main">
                      <h3 className="client-meal-plans-upcoming-row__title">{mealPlan.name}</h3>
                      <p className="client-meal-plans-upcoming-row__vendor">{mealPlan.vendor_name}</p>
                    </div>
                    <div className="client-meal-plans-upcoming-row__meta">
                      <span>{formatPrice(mealPlan.total_price_cents)}</span>
                      <span>{`${mealPlan.total_calories} Calories`}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No meals ready"
                message="Upcoming Meals will appear here when the current meal plan set has available items."
              />
            )}
          </SectionBlock>

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
                      : ["All ZIPs", "Budget max open", "Live catalog"]
                  }
                  actions={
                    <ActionRow>
                      <Link className="link-button" href="/client/metrics">
                        Review metrics
                      </Link>
                      <button type="button" onClick={() => setFiltersOpen(true)}>
                        Edit Budget Marker
                      </button>
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

          <div id="meal-plan-catalog">
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
          </div>
        </>
      ) : null}
    </PageShell>
  );
}
