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
  formatNumber,
  formatPriceCents,
  getNumberLike,
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

const NO_VENDOR_ZIP = "ZIP unavailable";
const NO_STATUS = "Status unavailable";

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
    const slug = pickOptionalText(item, ["slug"]);

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
