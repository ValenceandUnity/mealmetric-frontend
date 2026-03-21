"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SummaryCard } from "@/components/cards/SummaryCard";
import { PageShell } from "@/components/layout/PageShell";
import { MealPlanCard } from "@/components/meal-plans/MealPlanCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import type {
  ApiResponse,
  BookmarkFolder,
  BookmarkFolderListPayload,
  MealPlanListPayload,
  MealPlanSummary,
} from "@/lib/types/api";

type MealPlansResponse = ApiResponse<MealPlanListPayload>;
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

export default function ClientMealPlansPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [filters, setFilters] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [mealPlans, setMealPlans] = useState<MealPlanSummary[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkFolder[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkBusyId, setBookmarkBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

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
          setErrorMessage(mealPlanPayload.error.message);
          setMealPlans([]);
          return;
        }

        if (!bookmarkPayload.ok) {
          setErrorMessage(bookmarkPayload.error.message);
          setBookmarks([]);
          return;
        }

        setMealPlans(mealPlanPayload.data.items);
        setBookmarks(bookmarkPayload.data.items);
      } catch {
        if (active) {
          setErrorMessage("Unable to load meal plans.");
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
      setErrorMessage(payload.error.message);
      return null;
    }

    const nextFolders = [payload.data];
    setBookmarks(nextFolders);
    return payload.data;
  }

  async function refreshBookmarks() {
    const response = await fetch("/api/client/bookmarks", { cache: "no-store" });
    const payload = (await response.json()) as BookmarksResponse;
    if (payload.ok) {
      setBookmarks(payload.data.items);
    }
  }

  async function handleToggleBookmark(mealPlan: MealPlanSummary) {
    setBookmarkBusyId(mealPlan.id);
    setErrorMessage(null);

    try {
      const existing = findBookmarkMatch(bookmarks, mealPlan.id);
      if (existing) {
        const response = await fetch(
          `/api/client/bookmarks/${existing.folderId}/items/${existing.itemId}`,
          { method: "DELETE" },
        );
        const payload = (await response.json()) as ApiResponse<{ deleted: true }>;
        if (!payload.ok) {
          setErrorMessage(payload.error.message);
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
          setErrorMessage(payload.error.message);
          return;
        }
      }

      await refreshBookmarks();
    } catch {
      setErrorMessage("Unable to update bookmark.");
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
      navigation={
        <>
          <Link className="link-button" href="/client">
            Back to client home
          </Link>
          <Link className="link-button" href="/client/bookmarks">
            Open bookmarks
          </Link>
        </>
      }
    >
      {loading ? (
        <LoadingBlock title="Loading plans" message="Fetching meal-plan discovery data." />
      ) : null}
      {errorMessage ? (
        <ErrorBlock title="Unable to load meal plans" message={errorMessage} />
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <Section title="Filters">
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
              <div className="row">
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
              </div>
            </form>
          </Section>

          <Section title="Plan summary">
            <div className="grid grid--2">
              <SummaryCard
                label="Available plans"
                value={`${mealPlans.length}`}
                hint="Returned from the protected client catalog route."
              />
              <SummaryCard
                label="Bookmarked plans"
                value={`${bookmarkedIds.size}`}
                hint="Meal plans saved into your client bookmark folders."
              />
            </div>
          </Section>

          <Section title="Available plans">
            {mealPlans.length > 0 ? (
              <div className="stacked-list">
                {mealPlans.map((mealPlan) => (
                  <MealPlanCard
                    key={mealPlan.id}
                    mealPlan={mealPlan}
                    bookmarked={bookmarkedIds.has(mealPlan.id)}
                    bookmarkBusy={bookmarkBusyId === mealPlan.id}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No meal plans returned"
                message="Try broadening your ZIP code or budget filters."
              />
            )}
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
