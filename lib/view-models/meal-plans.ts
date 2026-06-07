import type {
  BookmarkFolder,
  BookmarkFolderListPayload,
  JsonValue,
  MealPlanListPayload,
  MealPlanSummary,
} from "@/lib/types/api";

import { getArray, getId, isObject, pickOptionalText } from "@/lib/adapters/common";
import {
  formatCalories,
  formatPriceCents,
  getNumberLike,
} from "@/lib/view-models/common";

export type MobileMealPlanRowView = {
  id: string | null;
  name: string;
  vendorName: string;
  caloriesLabel: string;
  priceLabel: string;
  status: string | null;
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

export function formatMealPlanPrice(value: number | null | undefined): string {
  return formatPriceCents(value);
}

export function formatMealPlanCalories(value: number | null | undefined): string {
  return formatCalories(value, "Calories unavailable");
}

export function formatMealPlanVendor(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : "Meal plan vendor";
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

function adaptMealPlanRows(
  mealPlans: MealPlanSummary[],
  bookmarkedIds: Set<string>,
): MobileMealPlanRowView[] {
  return mealPlans.map((mealPlan) => ({
    id: mealPlan.id,
    name: mealPlan.name,
    vendorName: formatMealPlanVendor(mealPlan.vendor_name),
    caloriesLabel: formatMealPlanCalories(mealPlan.total_calories),
    priceLabel: formatMealPlanPrice(mealPlan.total_price_cents),
    status: mealPlan.status,
    href: `/client/meal-plans/${mealPlan.id}`,
    isBookmarked: bookmarkedIds.has(mealPlan.id),
  }));
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
    subtitle: row.vendorName,
    caloriesLabel: row.caloriesLabel,
    priceLabel: row.priceLabel,
    badge: index === 0 ? "featured" : row.status,
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
    items: folder.items.map((item) => ({
      id: item.meal_plan_id,
      name: item.meal_plan.name,
      vendorName: formatMealPlanVendor(item.meal_plan.vendor_name),
      caloriesLabel: formatMealPlanCalories(item.meal_plan.total_calories),
      priceLabel: formatMealPlanPrice(item.meal_plan.total_price_cents),
      status: item.meal_plan.status,
      href: `/client/meal-plans/${item.meal_plan.id}`,
      isBookmarked: bookmarkedIds.has(item.meal_plan.id),
    })),
    isEmpty: folder.items.length === 0,
  }));
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
