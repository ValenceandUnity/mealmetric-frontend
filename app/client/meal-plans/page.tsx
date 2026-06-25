"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileHeaderUtilities } from "@/components/mobile/MobileHeaderUtilities";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileMealPlanRow } from "@/components/mobile/MobileMealPlanRow";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import {
  readActiveMealPlanZipCodes,
  writeActiveMealPlanZipCodes,
} from "@/lib/client/meal-plan-zip-tracker";
import { useSessionBootstrap } from "@/lib/client/session";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import type {
  ApiResponse,
  BookmarkFolder,
  BookmarkFolderListPayload,
  MealPlanListPayload,
} from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import {
  adaptClientMealPlansView,
  type MealPlanTrackedLocationInput,
  type MobileBookmarkFolderView,
  type MobileMealPlanRowView,
} from "@/lib/view-models/meal-plans";

type MealPlansApiResponse = ApiResponse<MealPlanListPayload>;
type BookmarksApiResponse = ApiResponse<BookmarkFolderListPayload>;
type CreateFolderResponse = ApiResponse<BookmarkFolder>;

type FilterDraft = {
  zipCode: string;
  budgetMax: string;
  budgetDuration: string;
  customDuration: string;
};

type FeedbackState = {
  tone: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
};

type SectionErrors = {
  mealPlans: string | null;
  bookmarks: string | null;
};

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type ActionPillButtonProps = {
  onClick: () => void;
  children: string;
  tone?: "purple" | "yellow";
  disabled?: boolean;
  ariaLabel?: string;
};

type DirectoryStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

type DirectoryFeedbackCardProps = {
  feedback: FeedbackState;
};

type MealPlanDirectoryCardProps = {
  row: MobileMealPlanRowView;
  eyebrow: string;
  bookmarkBusy: boolean;
  bookmarksAvailable: boolean;
  onToggleBookmark: (row: MobileMealPlanRowView) => void;
};

const DEFAULT_FILTERS: FilterDraft = {
  zipCode: "",
  budgetMax: "",
  budgetDuration: "one day",
  customDuration: "",
};

const EMPTY_SECTION_ERRORS: SectionErrors = {
  mealPlans: null,
  bookmarks: null,
};

const DIRECTORY_LINKS: Array<{
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

function ActionPillButton({
  onClick,
  children,
  tone = "yellow",
  disabled = false,
  ariaLabel,
}: ActionPillButtonProps) {
  return (
    <button
      type="button"
      className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function DirectoryStateCard({ title, message, action }: DirectoryStateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

function DirectoryFeedbackCard({ feedback }: DirectoryFeedbackCardProps) {
  const tone = feedback.tone === "success" ? "yellow" : "purple";

  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div
        className="mobile-pt-client-card__header"
        role={feedback.tone === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">Bookmark status</p>
          <h3 className="mobile-section__title">{feedback.title}</h3>
          <p className="mobile-section__description">{feedback.message}</p>
        </div>
        <span className={`mobile-pill mobile-pill--${tone}`}>{feedback.tone}</span>
      </div>
    </MobileCard>
  );
}

function MealPlanDirectoryCard({
  row,
  eyebrow,
  bookmarkBusy,
  bookmarksAvailable,
  onToggleBookmark,
}: MealPlanDirectoryCardProps) {
  const bookmarkActionLabel = row.isBookmarked ? "Remove bookmark" : "Save plan";
  const bookmarkButtonLabel = bookmarkBusy
    ? row.isBookmarked
      ? "Removing..."
      : "Saving..."
    : bookmarksAvailable
      ? bookmarkActionLabel
      : "Bookmarks unavailable";

  return (
    <MobileCard as="article" variant="action">
      <div className="mobile-pt-client-card__header">
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">{eyebrow}</p>
          <h3 className="mobile-section__title">{row.name}</h3>
          <p className="mobile-section__description">{row.vendorName}</p>
        </div>
        <span className={`mobile-pill ${row.isBookmarked ? "mobile-pill--yellow" : "mobile-pill--purple"}`}>
          {row.isBookmarked ? "Saved" : row.statusLabel}
        </span>
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
        <ActionPill href={row.href} tone="purple">View plan</ActionPill>
        <ActionPillButton
          onClick={() => onToggleBookmark(row)}
          tone={row.isBookmarked ? "yellow" : "purple"}
          disabled={!bookmarksAvailable || bookmarkBusy}
          ariaLabel={`${bookmarkActionLabel} for ${row.name}`}
        >
          {bookmarkButtonLabel}
        </ActionPillButton>
      </div>
    </MobileCard>
  );
}

function matchesQuery(query: string, fields: Array<string | null | undefined>): boolean {
  if (!query) {
    return true;
  }

  return fields.some((field) => field?.toLowerCase().includes(query));
}

function getSelectedZipCodes(entries: MealPlanTrackedLocationInput[]): string[] {
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

function findBookmarkMatch(
  folders: BookmarkFolderListPayload | null,
  mealPlanId: string,
): { folderId: string; itemId: string } | null {
  for (const folder of folders?.items ?? []) {
    for (const item of folder.items) {
      if (item.meal_plan_id === mealPlanId) {
        return {
          folderId: folder.id,
          itemId: item.id,
        };
      }
    }
  }

  return null;
}

function getSummaryIcon(label: string) {
  switch (label.toLowerCase()) {
    case "loaded plans":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 6h10l2 4-7 8-7-8 2-4Zm0 0 5 6 5-6" />
        </svg>
      );
    case "saved plans":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5h8a1 1 0 0 1 1 1v13l-5-3-5 3V6a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case "vendors":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 19V9l7-4 7 4v10m-9 0v-5h4v5" />
        </svg>
      );
    case "active zips":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20s6-4.35 6-9a6 6 0 1 0-12 0c0 4.65 6 9 6 9Z" />
          <circle cx="12" cy="11" r="2.5" />
        </svg>
      );
    default:
      return null;
  }
}

function getMealPlanSearchFields(row: MobileMealPlanRowView): string[] {
  return [
    row.name,
    row.vendorName,
    row.vendorZipLabel,
    row.statusLabel,
    row.priceLabel,
    row.caloriesLabel,
    row.itemCountLabel,
    row.availabilityLabel,
    row.bookmarkLabel,
  ];
}

export default function ClientMealPlansPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [filters, setFilters] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [mealPlansData, setMealPlansData] = useState<MealPlanListPayload | null>(null);
  const [bookmarksData, setBookmarksData] = useState<BookmarkFolderListPayload | null>(null);
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>(EMPTY_SECTION_ERRORS);
  const [actionFeedback, setActionFeedback] = useState<FeedbackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkBusyId, setBookmarkBusyId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [trackedLocations, setTrackedLocations] = useState<MealPlanTrackedLocationInput[]>([]);
  const [draftTrackedLocations, setDraftTrackedLocations] = useState<MealPlanTrackedLocationInput[]>([]);
  const [trackerInput, setTrackerInput] = useState("");
  const [trackerStorageReady, setTrackerStorageReady] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);

  const activeTrackedZipCodes = useMemo(
    () => getSelectedZipCodes(trackedLocations),
    [trackedLocations],
  );

  useEffect(() => {
    const activeZipCodes = readActiveMealPlanZipCodes();
    if (activeZipCodes.length === 0) {
      setTrackerStorageReady(true);
      return;
    }

    const persistedTrackedLocations: MealPlanTrackedLocationInput[] = activeZipCodes.map((zipCode) => ({
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
      setSectionErrors(EMPTY_SECTION_ERRORS);

      const searchParams = new URLSearchParams();
      if (activeTrackedZipCodes.length > 0) {
        searchParams.set("zip_codes", activeTrackedZipCodes.join(","));
      } else if (filters.zipCode.trim()) {
        searchParams.set("zip_code", filters.zipCode.trim());
      }
      if (filters.budgetMax.trim()) {
        searchParams.set("budget_max_cents", String(Number(filters.budgetMax) * 100));
      }

      const mealPlanUrl = searchParams.toString()
        ? `/api/client/meal-plans?${searchParams.toString()}`
        : "/api/client/meal-plans";

      try {
        const [mealPlansResult, bookmarksResult] = await Promise.allSettled([
          fetch(mealPlanUrl, { cache: "no-store" }).then(
            (response) => response.json() as Promise<MealPlansApiResponse>,
          ),
          fetch("/api/client/bookmarks", { cache: "no-store" }).then(
            (response) => response.json() as Promise<BookmarksApiResponse>,
          ),
        ]);

        if (!active) {
          return;
        }

        const nextErrors: SectionErrors = { ...EMPTY_SECTION_ERRORS };

        if (mealPlansResult.status === "fulfilled") {
          if (mealPlansResult.value.ok) {
            setMealPlansData(mealPlansResult.value.data);
          } else {
            nextErrors.mealPlans = mealPlansResult.value.error.message ?? "Unable to load meal plans.";
            setMealPlansData(null);
          }
        } else {
          nextErrors.mealPlans = "Unable to load meal plans.";
          setMealPlansData(null);
        }

        if (bookmarksResult.status === "fulfilled") {
          if (bookmarksResult.value.ok) {
            setBookmarksData(bookmarksResult.value.data);
          } else {
            nextErrors.bookmarks = bookmarksResult.value.error.message ?? "Unable to load bookmarks.";
            setBookmarksData(null);
          }
        } else {
          nextErrors.bookmarks = "Unable to load bookmarks.";
          setBookmarksData(null);
        }

        setSectionErrors(nextErrors);
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
  }, [
    activeTrackedZipCodes,
    filters.budgetMax,
    filters.zipCode,
    status,
    trackerStorageReady,
    user,
  ]);

  async function refreshBookmarks() {
    const response = await fetch("/api/client/bookmarks", { cache: "no-store" });
    const payload = (await response.json()) as BookmarksApiResponse;
    if (!payload.ok) {
      throw new Error(payload.error.message);
    }

    setBookmarksData(payload.data);
    setSectionErrors((current) => ({
      ...current,
      bookmarks: null,
    }));
  }

  async function ensureDefaultFolder(): Promise<BookmarkFolder | null> {
    if (bookmarksData?.items?.length) {
      return bookmarksData.items[0] ?? null;
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

    setBookmarksData({
      items: [payload.data],
      count: 1,
    });
    setSectionErrors((current) => ({
      ...current,
      bookmarks: null,
    }));

    return payload.data;
  }

  async function handleToggleBookmark(row: MobileMealPlanRowView) {
    if (!row.id) {
      setActionFeedback({
        tone: "error",
        title: "Bookmark update failed",
        message: "This meal plan is missing an identifier.",
      });
      return;
    }

    if (!bookmarksData) {
      setActionFeedback({
        tone: "error",
        title: "Bookmarks unavailable",
        message: "Bookmark folders are unavailable right now, so saved-state updates are disabled.",
      });
      return;
    }

    const existing = findBookmarkMatch(bookmarksData, row.id);
    const removing = Boolean(existing);

    setBookmarkBusyId(row.id);
    setActionFeedback({
      tone: "info",
      title: removing ? "Removing bookmark" : "Saving bookmark",
      message: removing
        ? `${row.name} is being removed from your saved plans.`
        : `${row.name} is being added to your saved plans.`,
    });

    try {
      if (existing) {
        const response = await fetch(
          `/api/client/bookmarks/${existing.folderId}/items/${existing.itemId}`,
          { method: "DELETE" },
        );
        const payload = (await response.json()) as ApiResponse<{ deleted: true }>;
        if (!payload.ok) {
          throw new Error(payload.error.message);
        }
      } else {
        const folder = await ensureDefaultFolder();
        if (!folder) {
          return;
        }

        const response = await fetch(`/api/client/bookmarks/${folder.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meal_plan_id: row.id }),
        });
        const payload = (await response.json()) as ApiResponse<unknown>;
        if (!payload.ok) {
          throw new Error(payload.error.message);
        }
      }

      await refreshBookmarks();

      setActionFeedback({
        tone: "success",
        title: removing ? "Bookmark removed" : "Bookmark saved",
        message: removing
          ? `${row.name} was removed from your saved plans.`
          : `${row.name} was added to your saved plans.`,
      });
    } catch (error) {
      setActionFeedback({
        tone: "error",
        title: "Bookmark update failed",
        message: error instanceof Error ? error.message : "Unable to update bookmark.",
      });
    } finally {
      setBookmarkBusyId(null);
    }
  }

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

      const nextEntry: MealPlanTrackedLocationInput = {
        id: `${isZip ? "zip" : "city"}-${value}-${Date.now()}`,
        label: value,
        kind: isZip ? "zip" : "city",
        selected: isZip,
      };

      return [...current, nextEntry];
    });

    if (isZip) {
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

  const view = useMemo(
    () => adaptClientMealPlansView({
      mealPlans: mealPlansData,
      bookmarks: bookmarksData,
      budgetMax: filters.budgetMax,
      budgetDuration: filters.budgetDuration,
      customDuration: filters.customDuration,
      zipCode: filters.zipCode,
      trackedLocations,
    }),
    [bookmarksData, filters.budgetDuration, filters.budgetMax, filters.customDuration, filters.zipCode, mealPlansData, trackedLocations],
  );

  const query = deferredSearch.trim().toLowerCase();
  const visibleRows = useMemo(
    () =>
      view.rows.filter((row) =>
        matchesQuery(query, getMealPlanSearchFields(row)),
      ),
    [query, view.rows],
  );
  const visibleRecommendations = useMemo(
    () => visibleRows.slice(0, 3),
    [visibleRows],
  );
  const visibleBookmarkFolders = useMemo(
    () =>
      view.bookmarkFolders
        .map((folder): MobileBookmarkFolderView => ({
          ...folder,
          items: folder.items.filter((row) => matchesQuery(query, getMealPlanSearchFields(row))),
        }))
        .filter((folder) => query.length === 0 || folder.items.length > 0),
    [query, view.bookmarkFolders],
  );

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

  const errorMessages = Object.values(sectionErrors).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  const allSectionsFailed = !loading && !view.hasAnyData && errorMessages.length > 0;
  const showLoadingState = loading && !view.hasAnyData && errorMessages.length === 0;
  const bookmarksAvailable = bookmarksData !== null;
  const searchEmptyStateActive = query.length > 0 && visibleRows.length === 0;

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="MP Directory"
      subtitle="Budget-aware meal-plan discovery stays inside the existing client BFF marketplace routes."
      searchLabel="Filter loaded meal plans"
      searchPlaceholder="Filter visible plans locally"
      searchValue={searchValue}
      onSearchChange={(nextValue) => {
        startTransition(() => {
          setSearchValue(nextValue);
        });
      }}
      notificationSlot={(
        <MobileHeaderUtilities
          role="client"
          settingsHref="/client/settings"
          leadingSlot={<ActionPill href="/client" tone="purple">Client home</ActionPill>}
        />
      )}
      topHubAction={
        <ActionPillButton
          onClick={() => {
            if (filtersOpen) {
              setFiltersOpen(false);
              return;
            }
            openBudgetMarkerEditor();
          }}
          tone="yellow"
          ariaLabel={filtersOpen ? "Close budget marker editor" : "Open budget marker editor"}
        >
          {filtersOpen ? "Close filters" : "Edit budget"}
        </ActionPillButton>
      }
      activePath="/client/meal-plans"
      showAvatar={false}
    >
      {allSectionsFailed ? (
        <MobileSection
          eyebrow="Marketplace sync"
          title="Meal plans unavailable"
          description="This landing page stays on protected client BFF routes and does not fall back to direct backend calls."
        >
          <DirectoryStateCard
            title="Unable to load meal-plan data"
            message={errorMessages.join(" ")}
            action={<ActionPill href="/client" tone="purple">Back home</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading MP Directory"
          description="Fetching meal plans and bookmark folders through the existing protected client routes."
        >
          <DirectoryStateCard
            title="Refreshing meal-plan discovery"
            message="This mobile marketplace surface is loading through the signed frontend-to-BFF path."
          />
        </MobileSection>
      ) : null}

      {!showLoadingState && !allSectionsFailed ? (
        <>
          {errorMessages.length > 0 && view.hasAnyData ? (
            <MobileSection
              eyebrow="Partial data"
              title="Some marketplace sources are unavailable"
              description="The page keeps the client routes that succeeded instead of inventing missing marketplace or bookmark state."
            >
              <DirectoryStateCard
                title="Partial meal-plan data"
                message={errorMessages.join(" ")}
              />
            </MobileSection>
          ) : null}

          {actionFeedback ? (
            <MobileSection
              eyebrow="Action"
              title="Bookmark update"
              description="Bookmark actions continue to use the existing bookmark folder routes only."
            >
              <DirectoryFeedbackCard feedback={actionFeedback} />
            </MobileSection>
          ) : null}

          <MobileSection
            eyebrow="Workspace"
            title="Marketplace links"
            description="These links preserve the existing meal-plan home, schedule, search, and bookmark subpages."
          >
            <MobileCard as="article" variant="action" className="mobile-meal-plan-hero">
              <div className="mobile-meal-plan-hero__copy">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Protected client marketplace</p>
                  <h3 className="mobile-section__title">Dark-shell meal-plan browsing with truthful state only</h3>
                  <p className="mobile-section__description">
                    The catalog, bookmarks, and filters stay on the certified client BFF routes. This phase only tightens the visual hierarchy toward the shared meal-card language.
                  </p>
                </div>

                <div className="mobile-meal-plan-pill-row">
                  {DIRECTORY_LINKS.map((item) => (
                    <ActionPill key={item.href} href={item.href} tone={item.tone}>
                      {item.label}
                    </ActionPill>
                  ))}
                </div>
              </div>

              <div className="mobile-meal-plan-hero__signals">
                <div className="mobile-meal-plan-hero__signal">
                  <p className="mobile-section__eyebrow">Loaded plans</p>
                  <h3 className="mobile-section__title">{view.summaryCards[0]?.value ?? "0"}</h3>
                  <p className="mobile-section__description">Returned by the current marketplace request only.</p>
                </div>
                <div className="mobile-meal-plan-hero__signal">
                  <p className="mobile-section__eyebrow">Saved plans</p>
                  <h3 className="mobile-section__title">{view.bookmarkState.savedPlanCountLabel}</h3>
                  <p className="mobile-section__description">Bookmark state remains on existing folder routes.</p>
                </div>
                <div className="mobile-meal-plan-hero__signal">
                  <p className="mobile-section__eyebrow">ZIP filter</p>
                  <h3 className="mobile-section__title">{view.budgetMarker.zipSummaryLabel}</h3>
                  <p className="mobile-section__description">Only supported ZIP filters shape the catalog request.</p>
                </div>
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection
            eyebrow="Budget Marker"
            title="Budget-aware discovery"
            description="Budget duration and city notes stay local here. Only the current ZIP and budget-max filters shape meal-plan requests."
            action={
              <ActionPillButton
                onClick={() => {
                  if (filtersOpen) {
                    setFiltersOpen(false);
                    return;
                  }
                  openBudgetMarkerEditor();
                }}
                tone="purple"
                ariaLabel={filtersOpen ? "Close budget marker controls" : "Open budget marker controls"}
              >
                {filtersOpen ? "Close editor" : "Open editor"}
              </ActionPillButton>
            }
          >
            <MobileCard as="article" variant="accent">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Current budget marker</p>
                  <h3 className="mobile-section__title">{view.budgetMarker.amountLabel}</h3>
                  <p className="mobile-section__description">{view.budgetMarker.note}</p>
                </div>
                <span className="mobile-pill mobile-pill--yellow">{view.budgetMarker.durationLabel}</span>
              </div>

              <dl className="mobile-pt-fact-grid">
                <div>
                  <dt>ZIP filter</dt>
                  <dd>{view.budgetMarker.zipSummaryLabel}</dd>
                </div>
                <div>
                  <dt>Saved plans</dt>
                  <dd>{view.bookmarkState.savedPlanCountLabel}</dd>
                </div>
                <div>
                  <dt>Folders</dt>
                  <dd>{view.bookmarkState.folderCountLabel}</dd>
                </div>
                <div>
                  <dt>Primary folder</dt>
                  <dd>{view.bookmarkState.latestFolderLabel}</dd>
                </div>
              </dl>

              <div className="mobile-pt-actions">
                {view.budgetMarker.activeChips.length > 0 ? (
                  view.budgetMarker.activeChips.map((chip) => (
                    <span
                      key={chip.id}
                      className={[
                        "mobile-pill",
                        chip.tone === "purple"
                          ? "mobile-pill--purple"
                          : chip.tone === "yellow"
                            ? "mobile-pill--yellow"
                            : "",
                      ].filter(Boolean).join(" ")}
                    >
                      {chip.label}
                    </span>
                  ))
                ) : (
                  <span className="mobile-pill">No active filter chips</span>
                )}
              </div>
            </MobileCard>
          </MobileSection>

          {filtersOpen ? (
            <MobileSection
              eyebrow="Filter editor"
              title="Edit budget and ZIP filters"
              description="The current page keeps budget duration and city entries local, while ZIP selection and budget max continue to drive the existing meal-plan request."
            >
              <form
                className="mobile-pt-form-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  setFilters(draft);
                  setTrackedLocations(draftTrackedLocations);
                  setFiltersOpen(false);
                }}
              >
                <div className="field">
                  <label htmlFor="meal-plan-budget-max">Budget max ($)</label>
                  <input
                    id="meal-plan-budget-max"
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
                  <label htmlFor="meal-plan-budget-duration">Budget duration</label>
                  <select
                    id="meal-plan-budget-duration"
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

                {draft.budgetDuration === "custom duration" ? (
                  <div className="field">
                    <label htmlFor="meal-plan-custom-duration">Custom duration</label>
                    <input
                      id="meal-plan-custom-duration"
                      value={draft.customDuration}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, customDuration: event.target.value }))
                      }
                      placeholder="Enter duration"
                    />
                  </div>
                ) : null}

                <div className="field">
                  <label htmlFor="meal-plan-zip-or-city">Add ZIP code or city</label>
                  <input
                    id="meal-plan-zip-or-city"
                    value={trackerInput}
                    onChange={(event) => setTrackerInput(event.target.value)}
                    placeholder="10001 or Boston"
                    aria-label="Add ZIP code or city"
                  />
                </div>

                <div className="mobile-pt-actions">
                  <ActionPillButton
                    onClick={handleAddTrackerEntry}
                    tone="yellow"
                    ariaLabel="Add ZIP code or city to the local tracker"
                  >
                    Add location
                  </ActionPillButton>
                  <span className="mobile-pill mobile-pill--purple">{view.zipFilter.activeZipCountLabel}</span>
                </div>

                {draftTrackedLocations.length > 0 ? (
                  <div className="mobile-pt-detail-stack">
                    {draftTrackedLocations.map((entry) => (
                      <MobileCard
                        key={entry.id}
                        as="article"
                        variant={entry.selected ? "action" : "soft"}
                      >
                        <div className="mobile-pt-client-card__header">
                          <div className="mobile-section__copy">
                            <p className="mobile-section__eyebrow">
                              {entry.kind === "zip" ? "Tracked ZIP" : "City note"}
                            </p>
                            <h3 className="mobile-section__title">{entry.label}</h3>
                            <p className="mobile-section__description">
                              {entry.kind === "zip"
                                ? entry.selected
                                  ? "This ZIP is currently active in the meal-plan request."
                                  : "This ZIP is tracked locally but not currently active."
                                : "City entries stay local until you add a ZIP."}
                            </p>
                          </div>
                          <span className={`mobile-pill ${entry.selected ? "mobile-pill--yellow" : "mobile-pill--purple"}`}>
                            {entry.kind === "zip"
                              ? entry.selected
                                ? "Active ZIP"
                                : "Tracking off"
                              : "City note"}
                          </span>
                        </div>

                        <div className="mobile-pt-actions">
                          {entry.kind === "zip" ? (
                            <ActionPillButton
                              onClick={() => handleToggleZipEntry(entry.id)}
                              tone={entry.selected ? "yellow" : "purple"}
                              ariaLabel={`${entry.selected ? "Deactivate" : "Activate"} ZIP ${entry.label}`}
                            >
                              {entry.selected ? "Deactivate ZIP" : "Activate ZIP"}
                            </ActionPillButton>
                          ) : (
                            <span className="mobile-pill">City note only</span>
                          )}
                          <ActionPillButton
                            onClick={() => handleDeleteTrackerEntry(entry.id)}
                            tone="purple"
                            ariaLabel={`Delete ${entry.label}`}
                          >
                            Delete
                          </ActionPillButton>
                        </div>
                      </MobileCard>
                    ))}
                  </div>
                ) : (
                  <DirectoryStateCard
                    title="No ZIPs tracked yet"
                    message={view.zipFilter.emptyMessage}
                  />
                )}

                <div className="mobile-pt-actions">
                  <ActionPillButton
                    onClick={() => {
                      setFilters(draft);
                      setTrackedLocations(draftTrackedLocations);
                      setFiltersOpen(false);
                    }}
                    tone="yellow"
                    ariaLabel="Apply meal-plan filters"
                  >
                    Apply filters
                  </ActionPillButton>
                  <ActionPillButton
                    onClick={() => {
                      setDraft(filters);
                      setDraftTrackedLocations(trackedLocations);
                      setTrackerInput("");
                      setFiltersOpen(false);
                    }}
                    tone="purple"
                    ariaLabel="Cancel budget marker editing"
                  >
                    Cancel
                  </ActionPillButton>
                </div>
              </form>
            </MobileSection>
          ) : null}

          <MobileSection
            eyebrow="Directory summary"
            title="Marketplace overview"
            description="These cards summarize the currently loaded meal-plan catalog and bookmark state without inventing unsupported recommendation or checkout behavior."
          >
            {view.summaryCards.map((card) => (
              <MobileStatCard
                key={card.label}
                label={card.label}
                value={card.value}
                progressText={card.progressText}
                icon={getSummaryIcon(card.label)}
              />
            ))}
          </MobileSection>

          {query.length > 0 ? (
            <MobileSection
              eyebrow="Local filter"
              title="Filtered view"
              description="This search narrows the already-loaded meal plans locally and does not send new backend queries."
            >
              <DirectoryStateCard
                title={visibleRows.length > 0 ? "Local meal-plan filter active" : "No meal plans match this search"}
                message={
                  visibleRows.length > 0
                    ? `${visibleRows.length} loaded meal plans currently match "${searchValue.trim()}".`
                    : `No loaded meal plans currently match "${searchValue.trim()}".`
                }
                action={
                  <ActionPillButton
                    onClick={() => {
                      setSearchValue("");
                    }}
                    tone="yellow"
                    ariaLabel="Clear local meal-plan search"
                  >
                    Clear search
                  </ActionPillButton>
                }
              />
            </MobileSection>
          ) : null}

          <MobileSection
            eyebrow="Recommended now"
            title="New meal plan releases"
            description="These rows come directly from the current client meal-plan catalog and keep the discovery pass light on mobile."
            action={<ActionPill href="/client/meal-plans/search" tone="purple">Search page</ActionPill>}
          >
            {visibleRecommendations.length > 0 ? (
              visibleRecommendations.map((row) => (
                <MobileMealPlanRow
                  key={row.id ?? row.name}
                  name={row.name}
                  vendorName={`${row.vendorName} | ${row.vendorZipLabel}`}
                  calories={row.caloriesLabel.replace(/\s*cal$/i, "")}
                  price={row.priceLabel}
                  status={row.isBookmarked ? "saved" : row.statusLabel}
                  action={<ActionPill href={row.href}>View plan</ActionPill>}
                />
              ))
            ) : searchEmptyStateActive ? (
              <DirectoryStateCard
                title="No meal plans match this search"
                message={`No quick-browse rows match "${searchValue.trim()}".`}
                action={
                  <ActionPillButton
                    onClick={() => {
                      setSearchValue("");
                    }}
                    tone="yellow"
                    ariaLabel="Clear local meal-plan search"
                  >
                    Clear search
                  </ActionPillButton>
                }
              />
            ) : sectionErrors.mealPlans ? (
              <DirectoryStateCard
                title="Meal plans unavailable"
                message={sectionErrors.mealPlans}
              />
            ) : (
              <DirectoryStateCard
                title={view.emptyState?.title ?? "No meal plans returned"}
                message={view.emptyState?.message ?? "Meal plans will appear here when the existing client route returns browse-ready data."}
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Available plans"
            title="Catalog cards"
            description="These cards expose only the plan, vendor, ZIP, calorie, price, item-count, availability, status, and bookmark fields already available on the current payload."
            action={<ActionPill href="/client/meal-plans/schedule" tone="purple">Schedule</ActionPill>}
          >
            {visibleRows.length > 0 ? (
              <div className="mobile-pt-detail-stack">
                {visibleRows.map((row) => (
                  <MealPlanDirectoryCard
                    key={row.id ?? row.name}
                    row={row}
                    eyebrow="Available meal plan"
                    bookmarkBusy={bookmarkBusyId === row.id}
                    bookmarksAvailable={bookmarksAvailable}
                    onToggleBookmark={(nextRow) => {
                      void handleToggleBookmark(nextRow);
                    }}
                  />
                ))}
              </div>
            ) : searchEmptyStateActive ? (
              <DirectoryStateCard
                title="No meal plans match this search"
                message={`No catalog cards match "${searchValue.trim()}".`}
                action={
                  <ActionPillButton
                    onClick={() => {
                      setSearchValue("");
                    }}
                    tone="yellow"
                    ariaLabel="Clear local meal-plan search"
                  >
                    Clear search
                  </ActionPillButton>
                }
              />
            ) : sectionErrors.mealPlans ? (
              <DirectoryStateCard
                title="Meal plans unavailable"
                message={sectionErrors.mealPlans}
              />
            ) : (
              <DirectoryStateCard
                title={view.emptyState?.title ?? "No meal plans returned"}
                message={view.emptyState?.message ?? "The current client marketplace request did not return any meal plans."}
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Saved state"
            title="Bookmarks"
            description="Saved plans stay on the existing bookmark folder routes, and saved state is shown here without inventing new bookmark-folder UX."
            action={<ActionPill href="/client/meal-plans/bookmark" tone="purple">Bookmark page</ActionPill>}
          >
            {visibleBookmarkFolders.length > 0 ? (
              <div className="mobile-pt-detail-stack">
                {visibleBookmarkFolders.map((folder) => (
                  <MobileCard key={folder.id} as="article" variant="soft">
                    <div className="mobile-pt-client-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">Bookmark folder</p>
                        <h3 className="mobile-section__title">{folder.name}</h3>
                        <p className="mobile-section__description">{folder.itemCountLabel}</p>
                      </div>
                      <span className="mobile-pill mobile-pill--yellow">Saved</span>
                    </div>

                    {folder.items.length > 0 ? (
                      <div className="mobile-pt-detail-stack">
                        {folder.items.map((row) => (
                          <MobileMealPlanRow
                            key={`${folder.id}-${row.id ?? row.name}`}
                            name={row.name}
                            vendorName={`${row.vendorName} | ${row.vendorZipLabel}`}
                            calories={row.caloriesLabel.replace(/\s*cal$/i, "")}
                            price={row.priceLabel}
                            status={row.statusLabel}
                            action={<ActionPill href={row.href}>View plan</ActionPill>}
                          />
                        ))}
                      </div>
                    ) : (
                      <DirectoryStateCard
                        title="No saved plans in this folder"
                        message="This folder exists, but it does not currently contain any saved meal plans."
                      />
                    )}
                  </MobileCard>
                ))}
              </div>
            ) : sectionErrors.bookmarks ? (
              <DirectoryStateCard
                title="Bookmarks unavailable"
                message={sectionErrors.bookmarks}
              />
            ) : query.length > 0 && view.hasBookmarks ? (
              <DirectoryStateCard
                title="No saved plans match this search"
                message={`No bookmarked meal plans currently match "${searchValue.trim()}".`}
                action={
                  <ActionPillButton
                    onClick={() => {
                      setSearchValue("");
                    }}
                    tone="yellow"
                    ariaLabel="Clear local meal-plan search"
                  >
                    Clear search
                  </ActionPillButton>
                }
              />
            ) : (
              <DirectoryStateCard
                title="No bookmarks yet"
                message={view.bookmarkState.emptyMessage}
              />
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
