import type {
  BookmarkFolder,
  BookmarkFolderListPayload,
  JsonValue,
  MealPlanListPayload,
  MealPlanSummary,
} from "@/lib/types/api";

import { getArray, isObject, pickOptionalText } from "@/lib/adapters/common";
import {
  formatCalories,
  formatCountLabel,
  formatDateTimeLabel,
  formatNumber,
  formatPriceCents,
  getNumberLike,
  getNestedArray,
} from "@/lib/view-models/common";

export type MobileMealPlanRowView = {
  id: string | null;
  name: string;
  vendorName: string;
  vendorZipLabel: string;
  caloriesLabel: string;
  priceLabel: string;
  status: string | null;
  statusLabel: string;
  itemCountLabel: string;
  availabilityLabel: string;
  bookmarkLabel: string;
  href: string;
  isBookmarked: boolean;
};

export type MobileMealPlanRecommendationView = {
  id: string | null;
  title: string;
  subtitle: string;
  caloriesLabel: string;
  priceLabel: string;
  badge: string | null;
  href: string;
};

export type MobileBookmarkFolderView = {
  id: string;
  name: string;
  description: string | null;
  itemCountLabel: string;
  items: MobileMealPlanRowView[];
  isEmpty: boolean;
};

export type MobileMealPlanDiscoveryView = {
  rows: MobileMealPlanRowView[];
  recommendations: MobileMealPlanRecommendationView[];
  bookmarkFolders: MobileBookmarkFolderView[];
  featuredRow: MobileMealPlanRowView | null;
  emptyMessage: string | null;
};

export type MealPlanTrackedLocationInput = {
  id: string;
  label: string;
  kind: "zip" | "city";
  selected: boolean;
};

export type MobileMealPlanFilterChipView = {
  id: string;
  label: string;
  tone: "purple" | "yellow" | "default";
};

export type MobileBudgetMarkerView = {
  amountLabel: string;
  durationLabel: string;
  zipSummaryLabel: string;
  note: string;
  activeChips: MobileMealPlanFilterChipView[];
};

export type MobileZipFilterEntryView = {
  id: string;
  label: string;
  kind: "zip" | "city";
  isActive: boolean;
  metaLabel: string;
};

export type MobileZipFilterView = {
  items: MobileZipFilterEntryView[];
  activeZipCountLabel: string;
  emptyMessage: string;
};

export type MobileBookmarkStateView = {
  savedPlanCountLabel: string;
  folderCountLabel: string;
  latestFolderLabel: string;
  hasBookmarks: boolean;
  emptyMessage: string;
};

export type MobileMealPlanDirectorySummaryCardView = {
  label: string;
  value: string;
  progressText: string;
};

export type MobileMealPlanEmptyStateView = {
  title: string;
  message: string;
};

export type MobileClientMealPlansView = {
  summaryCards: MobileMealPlanDirectorySummaryCardView[];
  budgetMarker: MobileBudgetMarkerView;
  zipFilter: MobileZipFilterView;
  bookmarkState: MobileBookmarkStateView;
  rows: MobileMealPlanRowView[];
  recommendations: MobileMealPlanRecommendationView[];
  bookmarkFolders: MobileBookmarkFolderView[];
  featuredRow: MobileMealPlanRowView | null;
  emptyState: MobileMealPlanEmptyStateView | null;
  hasMealPlans: boolean;
  hasBookmarks: boolean;
  hasAnyData: boolean;
};

export type MobileMealPlanDetailFieldView = {
  label: string;
  value: string;
};

export type MobileMealPlanDetailHeroView = {
  id: string | null;
  title: string;
  vendorName: string;
  vendorZipLabel: string;
  description: string;
  priceLabel: string;
  caloriesLabel: string;
  itemCountLabel: string;
  availabilityLabel: string;
  statusLabel: string;
  heroImageUrl: string | null;
};

export type MobileMealPlanItemView = {
  key: string;
  name: string;
  quantityLabel: string | null;
  caloriesLabel: string | null;
  priceLabel: string | null;
  noteLabel: string | null;
  metadata: MobileMealPlanDetailFieldView[];
};

export type MobileMealPlanAvailabilityView = {
  key: string;
  title: string;
  statusLabel: string | null;
  windowLabel: string | null;
  inventoryLabel: string | null;
  locationLabel: string | null;
  noteLabel: string | null;
  metadata: MobileMealPlanDetailFieldView[];
};

export type MobileMealPlanCheckoutView = {
  mealPlanId: string | null;
  canCheckout: boolean;
  disabledReason: string | null;
};

export type MobileMealPlanBookmarkView = {
  isBookmarked: boolean;
  label: string;
};

export type MobileMealPlanDetailView = {
  hero: MobileMealPlanDetailHeroView;
  macros: MobileMealPlanDetailFieldView[];
  meals: MobileMealPlanItemView[];
  availability: MobileMealPlanAvailabilityView[];
  vendorDetails: MobileMealPlanDetailFieldView[];
  bookmark: MobileMealPlanBookmarkView;
  checkout: MobileMealPlanCheckoutView;
  hasMeals: boolean;
  hasAvailability: boolean;
  hasVendorDetails: boolean;
};

export type MobileBookmarksPageView = {
  summaryCards: MobileMealPlanDirectorySummaryCardView[];
  bookmarkState: MobileBookmarkStateView;
  folders: MobileBookmarkFolderView[];
  emptyState: MobileMealPlanEmptyStateView | null;
  hasFolders: boolean;
  hasSavedPlans: boolean;
};

export type MobileMealPlanSearchResultView = MobileMealPlanRowView;

export type MobileMealPlanSearchFilterView = {
  queryLabel: string;
  activeZipCountLabel: string;
  activeZipChips: string[];
  note: string;
  hasActiveZipFilter: boolean;
};

export type MobileMealPlanSearchView = {
  summaryCards: MobileMealPlanDirectorySummaryCardView[];
  filters: MobileMealPlanSearchFilterView;
  rows: MobileMealPlanSearchResultView[];
  emptyState: MobileMealPlanEmptyStateView | null;
  hasQuery: boolean;
  hasResults: boolean;
};

export type MobilePTMealPlanResultView = {
  id: string | null;
  name: string;
  vendorName: string;
  vendorZipLabel: string;
  caloriesLabel: string;
  priceLabel: string;
  statusLabel: string;
  itemCountLabel: string;
  availabilityLabel: string;
};

export type MobilePTMealPlanSearchView = {
  queryLabel: string;
  note: string;
  stateLabel: string;
};

export type MobilePTMealPlansView = {
  summaryCards: MobileMealPlanDirectorySummaryCardView[];
  search: MobilePTMealPlanSearchView;
  rows: MobilePTMealPlanResultView[];
  emptyState: MobileMealPlanEmptyStateView | null;
  hasQuery: boolean;
  hasResults: boolean;
  hasAnyMealPlans: boolean;
};

const NO_VENDOR_ZIP = "ZIP unavailable";
const NO_STATUS = "Status unavailable";
const NO_MEAL_COUNT = "Meal count unavailable";
const NO_AVAILABILITY = "Availability unavailable";
const NO_DESCRIPTION = "Meal-plan configuration available through the signed BFF flow.";

export function formatMealPlanPrice(value: number | null | undefined): string {
  return formatPriceCents(value);
}

export function formatMealPlanCalories(value: number | null | undefined): string {
  return formatCalories(value, "Calories unavailable");
}

export function formatMealPlanVendor(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : "Meal plan vendor";
}

function formatMealPlanVendorZip(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : NO_VENDOR_ZIP;
}

function readMealPlans(value: MealPlanListPayload | JsonValue | null | undefined): MealPlanSummary[] {
  const items = isObject(value) && Array.isArray(value.items) ? value.items : getArray(value);

  return items.flatMap((item) => {
    if (!isObject(item)) {
      return [];
    }

    const id = pickOptionalText(item, ["id", "meal_plan_id"]);
    const name = pickOptionalText(item, ["name", "title"]);
    const vendorId = pickOptionalText(item, ["vendor_id"]);
    const vendorName = pickOptionalText(item, ["vendor_name", "vendor"]);
    const slug = pickOptionalText(item, ["slug"]) ?? id;

    if (!id || !name || !vendorId || !vendorName || !slug) {
      return [];
    }

    return [{
      id,
      name,
      vendor_id: vendorId,
      vendor_name: vendorName,
      vendor_zip_code: pickOptionalText(item, ["vendor_zip_code"]),
      slug,
      description: pickOptionalText(item, ["description"]),
      status: pickOptionalText(item, ["status"]) ?? "available",
      total_price_cents: getNumberLike(item, ["total_price_cents"]) ?? 0,
      total_calories: getNumberLike(item, ["total_calories", "calories"]) ?? 0,
      item_count: getNumberLike(item, ["item_count"]) ?? 0,
      availability_count: getNumberLike(item, ["availability_count"]) ?? 0,
    }];
  });
}

function readBookmarkFolders(
  value: BookmarkFolderListPayload | BookmarkFolder[] | null | undefined,
): BookmarkFolder[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value?.items ?? [];
}

function buildBookmarkedIdSet(folders: BookmarkFolder[]): Set<string> {
  return new Set(folders.flatMap((folder) => folder.items.map((item) => item.meal_plan_id)));
}

function countSavedPlans(folders: BookmarkFolder[]): number {
  return folders.reduce((sum, folder) => sum + folder.items.length, 0);
}

function buildMealPlanRow(
  mealPlan: MealPlanSummary,
  bookmarkedIds: Set<string>,
): MobileMealPlanRowView {
  const isBookmarked = bookmarkedIds.has(mealPlan.id);
  const statusLabel =
    typeof mealPlan.status === "string" && mealPlan.status.trim().length > 0
      ? mealPlan.status
      : NO_STATUS;

  return {
    id: mealPlan.id,
    name: mealPlan.name,
    vendorName: formatMealPlanVendor(mealPlan.vendor_name),
    vendorZipLabel: formatMealPlanVendorZip(mealPlan.vendor_zip_code),
    caloriesLabel: formatMealPlanCalories(mealPlan.total_calories),
    priceLabel: formatMealPlanPrice(mealPlan.total_price_cents),
    status: mealPlan.status,
    statusLabel,
    itemCountLabel: formatCountLabel(mealPlan.item_count, "meal"),
    availabilityLabel: formatCountLabel(mealPlan.availability_count, "availability window"),
    bookmarkLabel: isBookmarked ? "Saved" : "Not saved",
    href: `/client/meal-plans/${mealPlan.id}`,
    isBookmarked,
  };
}

function adaptMealPlanRows(
  mealPlans: MealPlanSummary[],
  bookmarkedIds: Set<string>,
): MobileMealPlanRowView[] {
  return mealPlans.map((mealPlan) => buildMealPlanRow(mealPlan, bookmarkedIds));
}

function adaptRecommendations(
  rows: MobileMealPlanRowView[],
  recommendationsValue?: JsonValue | null,
): MobileMealPlanRecommendationView[] {
  const recommendationRows = getArray(recommendationsValue).flatMap((item, index) => {
    if (!isObject(item)) {
      return [];
    }

    const id = pickOptionalText(item, ["id", "meal_plan_id"]);
    const title = pickOptionalText(item, ["name", "title"]) ?? `Recommendation ${index + 1}`;
    const subtitle =
      pickOptionalText(item, ["vendor_name", "vendor", "rationale"]) ??
      "Meal-plan recommendation";

    return [{
      id,
      title,
      subtitle,
      caloriesLabel: formatMealPlanCalories(getNumberLike(item, ["total_calories", "calories"])),
      priceLabel: formatMealPlanPrice(getNumberLike(item, ["total_price_cents"])),
      badge: pickOptionalText(item, ["status", "tag"]),
      href: id ? `/client/meal-plans/${id}` : "/client/meal-plans",
    }];
  });

  if (recommendationRows.length > 0) {
    return recommendationRows;
  }

  return rows.slice(0, 3).map((row, index) => ({
    id: row.id,
    title: row.name,
    subtitle: `${row.vendorName} | ${row.vendorZipLabel}`,
    caloriesLabel: row.caloriesLabel,
    priceLabel: row.priceLabel,
    badge: index === 0 ? "featured" : row.statusLabel,
    href: row.href,
  }));
}

function adaptBookmarkFoldersView(
  folders: BookmarkFolder[],
  bookmarkedIds: Set<string>,
): MobileBookmarkFolderView[] {
  return folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    description: folder.description,
    itemCountLabel: `${folder.items.length} saved plan${folder.items.length === 1 ? "" : "s"}`,
    items: folder.items.map((item) => buildMealPlanRow(item.meal_plan, bookmarkedIds)),
    isEmpty: folder.items.length === 0,
  }));
}

function resolveDurationLabel(
  budgetDuration: string | null | undefined,
  customDuration: string | null | undefined,
): string {
  if (budgetDuration === "custom duration") {
    return customDuration?.trim() || "Custom duration";
  }

  return budgetDuration?.trim() || "one day";
}

function countSelectedZipEntries(trackedLocations: MealPlanTrackedLocationInput[]): number {
  return trackedLocations.filter((entry) => entry.kind === "zip" && entry.selected).length;
}

function countCityNotes(trackedLocations: MealPlanTrackedLocationInput[]): number {
  return trackedLocations.filter((entry) => entry.kind === "city").length;
}

function buildActiveFilterChips(args: {
  budgetMax?: string | null;
  budgetDuration?: string | null;
  customDuration?: string | null;
  trackedLocations?: MealPlanTrackedLocationInput[];
}): MobileMealPlanFilterChipView[] {
  const trackedLocations = args.trackedLocations ?? [];
  const durationLabel = resolveDurationLabel(args.budgetDuration, args.customDuration);
  const activeZipCount = countSelectedZipEntries(trackedLocations);
  const cityNoteCount = countCityNotes(trackedLocations);
  const chips: MobileMealPlanFilterChipView[] = [];

  if (args.budgetMax?.trim()) {
    chips.push({
      id: "budget-max",
      label: `Max $${args.budgetMax.trim()}`,
      tone: "yellow",
    });
  }

  chips.push({
    id: "budget-duration",
    label: durationLabel,
    tone: "purple",
  });

  if (activeZipCount > 0) {
    chips.push({
      id: "active-zips",
      label: activeZipCount === 1 ? "1 active ZIP" : `${activeZipCount} active ZIPs`,
      tone: "default",
    });
  }

  if (cityNoteCount > 0) {
    chips.push({
      id: "city-notes",
      label: cityNoteCount === 1 ? "1 city note" : `${cityNoteCount} city notes`,
      tone: "default",
    });
  }

  return chips;
}

function buildBudgetMarker(args: {
  budgetMax?: string | null;
  budgetDuration?: string | null;
  customDuration?: string | null;
  trackedLocations?: MealPlanTrackedLocationInput[];
}): MobileBudgetMarkerView {
  const trackedLocations = args.trackedLocations ?? [];
  const activeZipCount = countSelectedZipEntries(trackedLocations);
  const cityNoteCount = countCityNotes(trackedLocations);
  const durationLabel = resolveDurationLabel(args.budgetDuration, args.customDuration);

  return {
    amountLabel: args.budgetMax?.trim() ? `$${args.budgetMax.trim()}` : "Budget open",
    durationLabel,
    zipSummaryLabel:
      activeZipCount > 0
        ? activeZipCount === 1
          ? "1 active ZIP"
          : `${activeZipCount} active ZIPs`
        : "All ZIPs",
    note:
      cityNoteCount > 0
        ? "Budget duration and city entries stay local until the current client meal-plan filters support them."
        : "Only the current ZIP and budget-max query params shape meal-plan requests from this landing page.",
    activeChips: buildActiveFilterChips(args),
  };
}

function buildZipFilter(
  trackedLocations: MealPlanTrackedLocationInput[] | undefined,
): MobileZipFilterView {
  const items = (trackedLocations ?? []).map((entry) => ({
    id: entry.id,
    label: entry.label,
    kind: entry.kind,
    isActive: entry.kind === "zip" ? entry.selected : false,
    metaLabel:
      entry.kind === "zip"
        ? entry.selected
          ? "Active ZIP"
          : "Tracking off"
        : "City note only",
  }));

  return {
    items,
    activeZipCountLabel:
      items.filter((entry) => entry.kind === "zip" && entry.isActive).length === 1
        ? "1 active ZIP"
        : `${items.filter((entry) => entry.kind === "zip" && entry.isActive).length} active ZIPs`,
    emptyMessage: "Add a ZIP to keep it ready for browsing, or save a city note locally until you have a ZIP.",
  };
}

function buildBookmarkState(folders: BookmarkFolder[]): MobileBookmarkStateView {
  const savedPlanCount = countSavedPlans(folders);

  return {
    savedPlanCountLabel: formatCountLabel(savedPlanCount, "saved plan"),
    folderCountLabel: formatCountLabel(folders.length, "folder"),
    latestFolderLabel: folders[0]?.name ?? "Favorites not created yet",
    hasBookmarks: savedPlanCount > 0,
    emptyMessage: "Saved plans will appear here after you use the existing bookmark routes.",
  };
}

function buildSummaryCards(
  rows: MobileMealPlanRowView[],
  folders: BookmarkFolder[],
  trackedLocations: MealPlanTrackedLocationInput[] | undefined,
): MobileMealPlanDirectorySummaryCardView[] {
  const savedPlanCount = countSavedPlans(folders);
  const vendorCount = new Set(rows.map((row) => row.vendorName)).size;
  const activeZipCount = countSelectedZipEntries(trackedLocations ?? []);

  return [
    {
      label: "Loaded plans",
      value: formatNumber(rows.length),
      progressText:
        rows.length > 0
          ? "Current meal-plan results returned by the protected client BFF."
          : "No meal plans are currently loaded.",
    },
    {
      label: "Saved plans",
      value: formatNumber(savedPlanCount),
      progressText:
        savedPlanCount > 0
          ? "Saved through the existing bookmark folder routes."
          : "No saved plans yet.",
    },
    {
      label: "Vendors",
      value: formatNumber(vendorCount),
      progressText:
        vendorCount > 0
          ? "Distinct vendors represented in the current catalog."
          : "Vendor coverage appears after plans load.",
    },
    {
      label: "Active ZIPs",
      value: formatNumber(activeZipCount),
      progressText:
        activeZipCount > 0
          ? "ZIP filters currently shaping the client meal-plan request."
          : "Browsing is currently open across all ZIPs.",
    },
  ];
}

function buildEmptyState(args: {
  rows: MobileMealPlanRowView[];
  budgetMax?: string | null;
  zipCode?: string | null;
  trackedLocations?: MealPlanTrackedLocationInput[];
}): MobileMealPlanEmptyStateView | null {
  if (args.rows.length > 0) {
    return null;
  }

  const activeZipCount = countSelectedZipEntries(args.trackedLocations ?? []);
  const hasBackendFilter = Boolean(args.budgetMax?.trim()) || Boolean(args.zipCode?.trim()) || activeZipCount > 0;

  if (hasBackendFilter) {
    return {
      title: "No meal plans match current filters",
      message: "Try broadening the current ZIP or budget filters to reopen the marketplace directory.",
    };
  }

  return {
    title: "No meal plans returned",
    message: "The client meal-plan directory is currently empty for this protected session.",
  };
}

export function adaptMealPlanDiscoveryView(args: {
  mealPlans: MealPlanListPayload | JsonValue | null;
  bookmarks?: BookmarkFolderListPayload | BookmarkFolder[] | null;
  recommendations?: JsonValue | null;
}): MobileMealPlanDiscoveryView {
  const mealPlans = readMealPlans(args.mealPlans);
  const folders = readBookmarkFolders(args.bookmarks);
  const bookmarkedIds = buildBookmarkedIdSet(folders);
  const rows = adaptMealPlanRows(mealPlans, bookmarkedIds);

  return {
    rows,
    recommendations: adaptRecommendations(rows, args.recommendations),
    bookmarkFolders: adaptBookmarkFoldersView(folders, bookmarkedIds),
    featuredRow: rows[0] ?? null,
    emptyMessage: rows.length === 0 ? "No meal plans returned." : null,
  };
}

export function adaptClientMealPlansView(args: {
  mealPlans: MealPlanListPayload | JsonValue | null;
  bookmarks?: BookmarkFolderListPayload | BookmarkFolder[] | null;
  recommendations?: JsonValue | null;
  budgetMax?: string | null;
  budgetDuration?: string | null;
  customDuration?: string | null;
  zipCode?: string | null;
  trackedLocations?: MealPlanTrackedLocationInput[];
}): MobileClientMealPlansView {
  const discovery = adaptMealPlanDiscoveryView({
    mealPlans: args.mealPlans,
    bookmarks: args.bookmarks,
    recommendations: args.recommendations,
  });
  const folders = readBookmarkFolders(args.bookmarks);

  return {
    summaryCards: buildSummaryCards(discovery.rows, folders, args.trackedLocations),
    budgetMarker: buildBudgetMarker({
      budgetMax: args.budgetMax,
      budgetDuration: args.budgetDuration,
      customDuration: args.customDuration,
      trackedLocations: args.trackedLocations,
    }),
    zipFilter: buildZipFilter(args.trackedLocations),
    bookmarkState: buildBookmarkState(folders),
    rows: discovery.rows,
    recommendations: discovery.recommendations,
    bookmarkFolders: discovery.bookmarkFolders,
    featuredRow: discovery.featuredRow,
    emptyState: buildEmptyState({
      rows: discovery.rows,
      budgetMax: args.budgetMax,
      zipCode: args.zipCode,
      trackedLocations: args.trackedLocations,
    }),
    hasMealPlans: discovery.rows.length > 0,
    hasBookmarks: countSavedPlans(folders) > 0,
    hasAnyData: discovery.rows.length > 0 || folders.length > 0,
  };
}

export function adaptClientMealPlanBookmarksView(args: {
  bookmarks?: BookmarkFolderListPayload | BookmarkFolder[] | null;
}): MobileBookmarksPageView {
  const folders = readBookmarkFolders(args.bookmarks);
  const bookmarkedIds = buildBookmarkedIdSet(folders);
  const bookmarkState = buildBookmarkState(folders);
  const savedPlanCount = countSavedPlans(folders);
  const folderViews = adaptBookmarkFoldersView(folders, bookmarkedIds);

  return {
    summaryCards: [
      {
        label: "Folders",
        value: formatNumber(folders.length),
        progressText:
          folders.length > 0
            ? "Bookmark folders returned by the protected client route."
            : "No bookmark folders currently exist for this session.",
      },
      {
        label: "Saved plans",
        value: formatNumber(savedPlanCount),
        progressText:
          savedPlanCount > 0
            ? "Saved meal plans currently present across returned folders."
            : "No saved meal plans currently exist.",
      },
      {
        label: "Primary folder",
        value: bookmarkState.latestFolderLabel,
        progressText:
          folders.length > 0
            ? "The first folder returned by the current bookmark route."
            : "A primary folder appears after bookmarks exist.",
      },
    ],
    bookmarkState,
    folders: folderViews,
    emptyState: folders.length === 0
      ? {
          title: "No saved meal plans yet",
          message: "Start exploring and bookmark plans to see them here",
        }
      : null,
    hasFolders: folders.length > 0,
    hasSavedPlans: savedPlanCount > 0,
  };
}

export function adaptClientMealPlanSearchView(args: {
  mealPlans: MealPlanListPayload | JsonValue | null;
  query?: string | null;
  activeZipCodes?: string[];
}): MobileMealPlanSearchView {
  const mealPlans = readMealPlans(args.mealPlans);
  const rows = adaptMealPlanRows(mealPlans, new Set<string>());
  const normalizedQuery = args.query?.trim() ?? "";
  const activeZipCodes = args.activeZipCodes ?? [];
  const activeZipCountLabel =
    activeZipCodes.length === 1 ? "1 active ZIP" : `${formatNumber(activeZipCodes.length)} active ZIPs`;
  const queryLabel = normalizedQuery || "All meal plans";

  return {
    summaryCards: [
      {
        label: "Results",
        value: formatNumber(rows.length),
        progressText:
          rows.length > 0
            ? "Current search results returned by the protected client meal-plan route."
            : "No search results are currently loaded.",
      },
      {
        label: "Tracked ZIPs",
        value: formatNumber(activeZipCodes.length),
        progressText:
          activeZipCodes.length > 0
            ? "Tracked ZIP filters currently included in the protected search request."
            : "No tracked ZIP filters are currently applied.",
      },
      {
        label: "Query",
        value: queryLabel,
        progressText:
          normalizedQuery
            ? "Search text currently included in the protected client request."
            : "Browsing the current client meal-plan catalog without a search query.",
      },
    ],
    filters: {
      queryLabel,
      activeZipCountLabel,
      activeZipChips: activeZipCodes,
      note:
        activeZipCodes.length > 0
          ? "Tracked ZIP filters stay aligned with the existing client meal-plan request shape."
          : "This page uses the current protected client catalog without tracked ZIP filters.",
      hasActiveZipFilter: activeZipCodes.length > 0,
    },
    rows,
    emptyState: rows.length === 0
      ? normalizedQuery
        ? {
            title: "No meal plans match your search",
            message: "Try a different meal plan name or vendor.",
          }
        : {
            title: "No meal plans are available",
            message: "No meal plans are available in the current catalog.",
          }
      : null,
    hasQuery: Boolean(normalizedQuery),
    hasResults: rows.length > 0,
  };
}

function buildPTMealPlanResultRows(
  value: MealPlanListPayload | JsonValue | null,
): MobilePTMealPlanResultView[] {
  const items = isObject(value) && Array.isArray(value.items) ? value.items : getArray(value);

  return items.flatMap((item, index) => {
    if (!isObject(item)) {
      return [];
    }

    const id = pickOptionalText(item, ["id", "meal_plan_id"]);
    const name = pickOptionalText(item, ["name", "title"]) ?? `Meal plan ${index + 1}`;
    const vendorName = formatMealPlanVendor(pickOptionalText(item, ["vendor_name", "vendor"]));
    const vendorZipLabel = formatMealPlanVendorZip(pickOptionalText(item, ["vendor_zip_code"]));
    const totalCalories = getNumberLike(item, ["total_calories", "calories"]);
    const totalPriceCents = getNumberLike(item, ["total_price_cents"]);
    const itemCount = getNumberLike(item, ["item_count"]);
    const availabilityCount = getNumberLike(item, ["availability_count"]);
    const status = pickOptionalText(item, ["status"]) ?? "available";

    return [{
      id,
      name,
      vendorName,
      vendorZipLabel,
      caloriesLabel: formatMealPlanCalories(totalCalories),
      priceLabel: formatMealPlanPrice(totalPriceCents),
      statusLabel: status.trim().length > 0 ? status : NO_STATUS,
      itemCountLabel: formatOptionalCountLabel(itemCount, "meal", "meals", NO_MEAL_COUNT),
      availabilityLabel: formatOptionalCountLabel(
        availabilityCount,
        "availability window",
        "availability windows",
        NO_AVAILABILITY,
      ),
    }];
  });
}

function matchesPTMealPlanQuery(query: string, row: MobilePTMealPlanResultView): boolean {
  if (!query) {
    return true;
  }

  const fields = [
    row.name,
    row.vendorName,
    row.vendorZipLabel,
    row.caloriesLabel,
    row.priceLabel,
    row.statusLabel,
    row.itemCountLabel,
    row.availabilityLabel,
  ];

  return fields.some((field) => field.toLowerCase().includes(query));
}

export function adaptPTMealPlansView(args: {
  mealPlans: MealPlanListPayload | JsonValue | null;
  query?: string | null;
}): MobilePTMealPlansView {
  const allRows = buildPTMealPlanResultRows(args.mealPlans);
  const normalizedQuery = args.query?.trim() ?? "";
  const loweredQuery = normalizedQuery.toLowerCase();
  const rows = loweredQuery
    ? allRows.filter((row) => matchesPTMealPlanQuery(loweredQuery, row))
    : allRows;
  const visibleVendorCount = new Set(rows.map((row) => row.vendorName)).size;

  return {
    summaryCards: [
      {
        label: "Loaded plans",
        value: formatNumber(allRows.length),
        progressText:
          allRows.length > 0
            ? "Loaded from the protected PT meal-plan search route."
            : "No PT meal plans are currently loaded.",
      },
      {
        label: "Visible plans",
        value: formatNumber(rows.length),
        progressText:
          normalizedQuery
            ? "Filtered locally from the currently loaded PT meal-plan catalog."
            : "All currently loaded PT meal plans are visible.",
      },
      {
        label: "Vendors",
        value: formatNumber(visibleVendorCount),
        progressText:
          visibleVendorCount > 0
            ? "Distinct vendors represented in the current visible PT results."
            : "Vendor coverage appears after PT meal plans load.",
      },
    ],
    search: {
      queryLabel: normalizedQuery || "All loaded plans",
      note:
        normalizedQuery
          ? "This local filter narrows the already loaded PT meal-plan catalog and does not change the protected PT request shape."
          : "This page loads the current PT meal-plan catalog once and keeps filtering local on mobile.",
      stateLabel: normalizedQuery ? "Local filter active" : "All loaded plans",
    },
    rows,
    emptyState: rows.length === 0
      ? normalizedQuery
        ? {
            title: "No PT meal plans match this search",
            message: "Adjust the local search to revisit the currently loaded PT meal-plan results.",
          }
        : {
            title: "No PT meal plans are available",
            message: "The PT meal-plan search route did not return any discoverable meal plans.",
          }
      : null,
    hasQuery: Boolean(normalizedQuery),
    hasResults: rows.length > 0,
    hasAnyMealPlans: allRows.length > 0,
  };
}

function getFirstText(value: JsonValue | null | undefined, keys: string[]): string | null {
  for (const key of keys) {
    if (!isObject(value)) {
      continue;
    }

    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

function getMealPlanHeroImageUrl(value: JsonValue | null): string | null {
  const directImage = getFirstText(value, ["image_url", "image", "hero_image_url"]);
  if (directImage) {
    return directImage;
  }

  for (const item of getNestedArray(value, ["images"])) {
    if (typeof item === "string" && item.trim().length > 0) {
      return item;
    }

    const imageUrl = getFirstText(item, ["url", "src", "image_url"]);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
}

function formatOptionalCountLabel(
  value: number | null | undefined,
  singular: string,
  plural: string,
  fallback: string,
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return formatCountLabel(value, singular, plural);
}

function buildMacroFields(value: JsonValue | null): MobileMealPlanDetailFieldView[] {
  const macroCandidates = [
    {
      label: "Protein",
      value: getNumberLike(value, ["protein_grams", "protein", "total_protein"]),
    },
    {
      label: "Carbs",
      value: getNumberLike(value, ["carbs_grams", "carbs", "carbohydrates", "total_carbs"]),
    },
    {
      label: "Fat",
      value: getNumberLike(value, ["fat_grams", "fat", "total_fat"]),
    },
  ];

  return macroCandidates
    .filter((entry) => typeof entry.value === "number")
    .map((entry) => ({
      label: entry.label,
      value: `${formatNumber(entry.value)}g`,
    }));
}

function buildMealMetadata(item: JsonValue | null | undefined): MobileMealPlanDetailFieldView[] {
  const metadata: MobileMealPlanDetailFieldView[] = [];

  const category = pickOptionalText(item, ["category", "meal_type", "type"]);
  const portion = pickOptionalText(item, ["portion_size", "size"]);
  const servings = getNumberLike(item, ["servings", "serving_count"]);

  if (category) {
    metadata.push({ label: "Type", value: category });
  }

  if (portion) {
    metadata.push({ label: "Portion", value: portion });
  }

  if (typeof servings === "number") {
    metadata.push({ label: "Servings", value: formatNumber(servings) });
  }

  return metadata;
}

function readMealPlanItems(value: JsonValue | null): MobileMealPlanItemView[] {
  const candidates = getNestedArray(value, ["meals", "items", "meal_items", "included_meals"]);

  return candidates.flatMap((item, index) => {
    if (typeof item === "string" && item.trim().length > 0) {
      return [{
        key: `meal-${index}-${item}`,
        name: item,
        quantityLabel: null,
        caloriesLabel: null,
        priceLabel: null,
        noteLabel: null,
        metadata: [],
      }];
    }

    const name = pickOptionalText(item, ["name", "title"]) ?? `Meal ${index + 1}`;
    const quantity = getNumberLike(item, ["quantity"]);
    const calories = getNumberLike(item, ["calories", "total_calories"]);
    const priceCents = getNumberLike(item, ["total_price_cents", "price_cents", "unit_price_cents"]);
    const note = pickOptionalText(item, ["description", "summary", "note"]);

    return [{
      key: `meal-${index}-${name}`,
      name,
      quantityLabel: typeof quantity === "number" ? formatNumber(quantity) : null,
      caloriesLabel: typeof calories === "number" ? formatCalories(calories) : null,
      priceLabel: typeof priceCents === "number" ? formatPriceCents(priceCents) : null,
      noteLabel: note,
      metadata: buildMealMetadata(item),
    }];
  });
}

function readVendorDetails(
  value: JsonValue | null,
  fallbackVendorName: string | null,
): MobileMealPlanDetailFieldView[] {
  const details: MobileMealPlanDetailFieldView[] = [];

  const vendorName = pickOptionalText(value, ["vendor_name", "vendor"]) ?? fallbackVendorName;
  const zipCode = pickOptionalText(value, ["vendor_zip_code", "zip_code"]);
  const pickupLocation = pickOptionalText(value, ["pickup_location", "location"]);
  const pickupNotes = pickOptionalText(value, ["pickup_notes", "fulfillment_notes"]);

  if (vendorName) {
    details.push({ label: "Vendor", value: vendorName });
  }

  if (zipCode) {
    details.push({ label: "ZIP", value: zipCode });
  }

  if (pickupLocation) {
    details.push({ label: "Location", value: pickupLocation });
  }

  if (pickupNotes) {
    details.push({ label: "Notes", value: pickupNotes });
  }

  return details;
}

function buildAvailabilityWindowLabel(item: JsonValue | null | undefined): string | null {
  const directLabel = pickOptionalText(item, ["window_label", "label", "title", "name"]);
  if (directLabel) {
    return directLabel;
  }

  const start = pickOptionalText(item, ["pickup_start_at", "start_at", "starts_at"]);
  const end = pickOptionalText(item, ["pickup_end_at", "end_at", "ends_at"]);

  if (start && end) {
    return `${formatDateTimeLabel(start)} - ${formatDateTimeLabel(end)}`;
  }

  if (start) {
    return formatDateTimeLabel(start);
  }

  if (end) {
    return formatDateTimeLabel(end);
  }

  return null;
}

function buildAvailabilityMetadata(item: JsonValue | null | undefined): MobileMealPlanDetailFieldView[] {
  const metadata: MobileMealPlanDetailFieldView[] = [];

  const status = pickOptionalText(item, ["status"]);
  const windowLabel = buildAvailabilityWindowLabel(item);
  const inventory = getNumberLike(item, ["remaining_inventory", "inventory", "available_quantity", "capacity"]);
  const location = pickOptionalText(item, ["pickup_location", "location"]);
  const note = pickOptionalText(item, ["pickup_notes", "fulfillment_notes", "notes"]);

  if (status) {
    metadata.push({ label: "Status", value: status });
  }

  if (windowLabel) {
    metadata.push({ label: "Window", value: windowLabel });
  }

  if (typeof inventory === "number") {
    metadata.push({ label: "Inventory", value: formatNumber(inventory) });
  }

  if (location) {
    metadata.push({ label: "Location", value: location });
  }

  if (note) {
    metadata.push({ label: "Notes", value: note });
  }

  return metadata;
}

function readAvailabilityEntries(value: JsonValue | null): MobileMealPlanAvailabilityView[] {
  const candidates = getNestedArray(value, [
    "availability",
    "availability_windows",
    "pickup_windows",
    "pickup_slots",
  ]);

  return candidates.flatMap((item, index) => {
    if (typeof item === "string" && item.trim().length > 0) {
      return [{
        key: `availability-${index}-${item}`,
        title: item,
        statusLabel: null,
        windowLabel: null,
        inventoryLabel: null,
        locationLabel: null,
        noteLabel: null,
        metadata: [],
      }];
    }

    const title =
      pickOptionalText(item, ["name", "title", "label", "window_label"]) ?? `Availability ${index + 1}`;
    const status = pickOptionalText(item, ["status"]);
    const windowLabel = buildAvailabilityWindowLabel(item);
    const inventory = getNumberLike(item, ["remaining_inventory", "inventory", "available_quantity", "capacity"]);
    const location = pickOptionalText(item, ["pickup_location", "location"]);
    const note = pickOptionalText(item, ["pickup_notes", "fulfillment_notes", "notes"]);

    return [{
      key: `availability-${index}-${title}`,
      title,
      statusLabel: status,
      windowLabel,
      inventoryLabel: typeof inventory === "number" ? formatNumber(inventory) : null,
      locationLabel: location,
      noteLabel: note,
      metadata: buildAvailabilityMetadata(item),
    }];
  });
}

export function adaptMealPlanDetailView(args: {
  mealPlan: JsonValue | null;
  mealPlanId?: string | null;
  bookmarks?: BookmarkFolderListPayload | BookmarkFolder[] | null;
}): MobileMealPlanDetailView {
  const mealPlanId =
    pickOptionalText(args.mealPlan, ["id", "meal_plan_id"]) ??
    (typeof args.mealPlanId === "string" && args.mealPlanId.trim().length > 0 ? args.mealPlanId : null);
  const vendorName = pickOptionalText(args.mealPlan, ["vendor_name", "vendor"]);
  const meals = readMealPlanItems(args.mealPlan);
  const availability = readAvailabilityEntries(args.mealPlan);
  const itemCount = getNumberLike(args.mealPlan, ["item_count"]) ?? (meals.length > 0 ? meals.length : null);
  const availabilityCount =
    getNumberLike(args.mealPlan, ["availability_count"]) ??
    (availability.length > 0 ? availability.length : null);
  const folders = readBookmarkFolders(args.bookmarks);
  const bookmarkedIds = buildBookmarkedIdSet(folders);
  const vendorDetails = readVendorDetails(args.mealPlan, vendorName);

  return {
    hero: {
      id: mealPlanId,
      title: pickOptionalText(args.mealPlan, ["name", "title"]) ?? "Meal plan detail",
      vendorName: formatMealPlanVendor(vendorName),
      vendorZipLabel: formatMealPlanVendorZip(pickOptionalText(args.mealPlan, ["vendor_zip_code", "zip_code"])),
      description: pickOptionalText(args.mealPlan, ["description", "summary"]) ?? NO_DESCRIPTION,
      priceLabel: formatMealPlanPrice(getNumberLike(args.mealPlan, ["total_price_cents", "price_cents"])),
      caloriesLabel: formatMealPlanCalories(getNumberLike(args.mealPlan, ["total_calories", "calories"])),
      itemCountLabel: formatOptionalCountLabel(itemCount, "meal", "meals", NO_MEAL_COUNT),
      availabilityLabel: formatOptionalCountLabel(
        availabilityCount,
        "availability window",
        "availability windows",
        NO_AVAILABILITY,
      ),
      statusLabel:
        pickOptionalText(args.mealPlan, ["status"])?.trim().length
          ? pickOptionalText(args.mealPlan, ["status"]) ?? NO_STATUS
          : NO_STATUS,
      heroImageUrl: getMealPlanHeroImageUrl(args.mealPlan),
    },
    macros: buildMacroFields(args.mealPlan),
    meals,
    availability,
    vendorDetails,
    bookmark: {
      isBookmarked: mealPlanId ? bookmarkedIds.has(mealPlanId) : false,
      label: mealPlanId && bookmarkedIds.has(mealPlanId) ? "Saved" : "Not saved",
    },
    checkout: {
      mealPlanId,
      canCheckout: Boolean(mealPlanId),
      disabledReason: mealPlanId ? null : "Meal plan identifier unavailable.",
    },
    hasMeals: meals.length > 0,
    hasAvailability: availability.length > 0,
    hasVendorDetails: vendorDetails.length > 0,
  };
}
