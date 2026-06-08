import type {
  JsonValue,
  MealPlanListPayload,
  VendorMePayload,
  VendorMetricsPayload,
} from "@/lib/types/api";

import { getArray, isObject, pickOptionalText } from "@/lib/adapters/common";
import {
  formatCalories,
  formatCountLabel,
  formatNumber,
  formatPriceCents,
  getNumberLike,
} from "@/lib/view-models/common";

const VENDOR_NAME_FALLBACK = "Vendor operations";
const VENDOR_DESCRIPTION_FALLBACK =
  "Manage catalog visibility and operational performance through the existing vendor BFF routes.";
const EMAIL_FALLBACK = "Email unavailable";
const SLUG_FALLBACK = "Slug unavailable";
const ZIP_FALLBACK = "ZIP unavailable";
const STATUS_FALLBACK = "Vendor account";
const MEAL_PLAN_NAME_FALLBACK = "Meal plan";
const MEAL_PLAN_DESCRIPTION_FALLBACK =
  "Vendor meal-plan detail remains available through the existing vendor catalog route.";

export type MobileVendorSummaryCardView = {
  label: string;
  value: string;
  progressText: string;
};

export type MobileVendorIdentityView = {
  vendorName: string;
  vendorDescription: string;
  vendorEmailLabel: string;
  vendorSlugLabel: string;
  vendorZipLabel: string;
  vendorStatusLabel: string;
  vendorMealPlanCountLabel: string;
  vendorsCountLabel: string;
  defaultVendorStateLabel: string;
  contextNote: string;
  hasDefaultVendor: boolean;
};

export type MobileVendorMealPlanPreviewView = {
  id: string | null;
  name: string;
  vendorName: string;
  vendorZipLabel: string;
  caloriesLabel: string;
  priceLabel: string;
  statusLabel: string;
  itemCountLabel: string;
  availabilityLabel: string;
  description: string;
};

export type MobileVendorCatalogSummaryView = {
  cards: MobileVendorSummaryCardView[];
  highlight: MobileVendorMealPlanPreviewView | null;
  rows: MobileVendorMealPlanPreviewView[];
  hasMealPlans: boolean;
  emptyTitle: string;
  emptyMessage: string;
};

export type MobileVendorMetricsSummaryView = {
  cards: MobileVendorSummaryCardView[];
  hasMetrics: boolean;
  unavailableTitle: string;
  unavailableMessage: string;
};

export type MobileVendorActionView = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  badgeLabel: string;
  tone: "purple" | "yellow";
  isPlaceholder: boolean;
};

export type MobileVendorDashboardView = {
  title: string;
  subtitle: string;
  summaryCards: MobileVendorSummaryCardView[];
  identity: MobileVendorIdentityView;
  catalog: MobileVendorCatalogSummaryView;
  metrics: MobileVendorMetricsSummaryView;
  actions: MobileVendorActionView[];
  hasVendorProfile: boolean;
};

type VendorIdentityRecord = {
  email: string | null;
  vendorsCount: number;
  defaultVendor: {
    name: string | null;
    slug: string | null;
    description: string | null;
    zipCode: string | null;
    status: string | null;
    mealPlanCount: number | null;
  } | null;
};

type VendorMetricsRecord = {
  vendorName: string | null;
  zipCode: string | null;
  totalMealPlans: number | null;
  publishedMealPlans: number | null;
  draftMealPlans: number | null;
  totalAvailabilityEntries: number | null;
  openPickupWindows: number | null;
  hasMetrics: boolean;
};

function readVendorProfile(value: VendorMePayload | JsonValue | null | undefined): VendorIdentityRecord {
  if (!isObject(value)) {
    return {
      email: null,
      vendorsCount: 0,
      defaultVendor: null,
    };
  }

  const vendors = getArray(value.vendors);
  const defaultVendor = isObject(value.default_vendor)
    ? {
        name: pickOptionalText(value.default_vendor, ["name"]),
        slug: pickOptionalText(value.default_vendor, ["slug"]),
        description: pickOptionalText(value.default_vendor, ["description"]),
        zipCode: pickOptionalText(value.default_vendor, ["zip_code"]),
        status: pickOptionalText(value.default_vendor, ["status"]),
        mealPlanCount: getNumberLike(value.default_vendor, ["meal_plan_count"]),
      }
    : null;

  return {
    email: pickOptionalText(value, ["email"]),
    vendorsCount: vendors.filter((item) => isObject(item)).length,
    defaultVendor,
  };
}

function readVendorMetrics(value: VendorMetricsPayload | JsonValue | null | undefined): VendorMetricsRecord {
  if (!isObject(value)) {
    return {
      vendorName: null,
      zipCode: null,
      totalMealPlans: null,
      publishedMealPlans: null,
      draftMealPlans: null,
      totalAvailabilityEntries: null,
      openPickupWindows: null,
      hasMetrics: false,
    };
  }

  const totalMealPlans = getNumberLike(value, ["total_meal_plans"]);
  const publishedMealPlans = getNumberLike(value, ["published_meal_plans"]);
  const draftMealPlans = getNumberLike(value, ["draft_meal_plans"]);
  const totalAvailabilityEntries = getNumberLike(value, ["total_availability_entries"]);
  const openPickupWindows = getNumberLike(value, ["open_pickup_windows"]);
  const zipCode = pickOptionalText(value, ["zip_code"]);
  const vendorName = pickOptionalText(value, ["vendor_name"]);

  return {
    vendorName,
    zipCode,
    totalMealPlans,
    publishedMealPlans,
    draftMealPlans,
    totalAvailabilityEntries,
    openPickupWindows,
    hasMetrics: [
      totalMealPlans,
      publishedMealPlans,
      draftMealPlans,
      totalAvailabilityEntries,
      openPickupWindows,
    ].some((entry) => typeof entry === "number") || Boolean(vendorName) || Boolean(zipCode),
  };
}

function readMealPlanRows(value: MealPlanListPayload | JsonValue | null | undefined): MobileVendorMealPlanPreviewView[] {
  const items = isObject(value) && Array.isArray(value.items) ? value.items : getArray(value);

  return items.flatMap((item) => {
    if (!isObject(item)) {
      return [];
    }

    const status = pickOptionalText(item, ["status"]);
    const id = pickOptionalText(item, ["id", "meal_plan_id"]);

    return [{
      id,
      name: pickOptionalText(item, ["name", "title"]) ?? MEAL_PLAN_NAME_FALLBACK,
      vendorName: pickOptionalText(item, ["vendor_name", "vendor"]) ?? VENDOR_NAME_FALLBACK,
      vendorZipLabel: pickOptionalText(item, ["vendor_zip_code", "zip_code"]) ?? ZIP_FALLBACK,
      caloriesLabel: formatCalories(getNumberLike(item, ["total_calories", "calories"]), "Calories unavailable"),
      priceLabel: formatPriceCents(getNumberLike(item, ["total_price_cents", "price_cents"])),
      statusLabel: status ?? "Status unavailable",
      itemCountLabel: formatCountLabel(getNumberLike(item, ["item_count"]), "meal"),
      availabilityLabel: formatCountLabel(
        getNumberLike(item, ["availability_count"]),
        "availability window",
      ),
      description: pickOptionalText(item, ["description", "summary"]) ?? MEAL_PLAN_DESCRIPTION_FALLBACK,
    }];
  });
}

function resolveMealPlanCount(args: {
  defaultVendorMealPlanCount: number | null;
  metricsMealPlanCount: number | null;
  mealPlanRows: MobileVendorMealPlanPreviewView[];
}): number {
  return args.defaultVendorMealPlanCount
    ?? args.metricsMealPlanCount
    ?? args.mealPlanRows.length;
}

function resolvePublishedCount(metrics: VendorMetricsRecord, mealPlans: MobileVendorMealPlanPreviewView[]): number {
  if (typeof metrics.publishedMealPlans === "number") {
    return metrics.publishedMealPlans;
  }

  return mealPlans.filter((mealPlan) => mealPlan.statusLabel.toLowerCase() === "published").length;
}

function resolveDraftCount(metrics: VendorMetricsRecord, mealPlans: MobileVendorMealPlanPreviewView[]): number {
  if (typeof metrics.draftMealPlans === "number") {
    return metrics.draftMealPlans;
  }

  return mealPlans.filter((mealPlan) => mealPlan.statusLabel.toLowerCase() !== "published").length;
}

function resolveAvailabilityCount(metrics: VendorMetricsRecord, mealPlans: MobileVendorMealPlanPreviewView[]): number {
  if (typeof metrics.totalAvailabilityEntries === "number") {
    return metrics.totalAvailabilityEntries;
  }

  return mealPlans.reduce((sum, mealPlan) => sum + Number.parseInt(mealPlan.availabilityLabel, 10), 0);
}

function buildSummaryCards(args: {
  mealPlanCount: number;
  publishedCount: number;
  draftCount: number;
  openPickupWindows: number | null;
}): MobileVendorSummaryCardView[] {
  return [
    {
      label: "Meal plans",
      value: formatNumber(args.mealPlanCount),
      progressText: "Current catalog inventory returned through the vendor meal-plan route.",
    },
    {
      label: "Published",
      value: formatNumber(args.publishedCount),
      progressText: "Catalog entries currently surfaced as published.",
    },
    {
      label: "Draft",
      value: formatNumber(args.draftCount),
      progressText: "Catalog entries still held back from publication.",
    },
    {
      label: "Pickup windows",
      value: formatNumber(args.openPickupWindows, "0"),
      progressText: "Open pickup windows currently exposed through vendor metrics.",
    },
  ];
}

function buildMetricsCards(args: {
  metrics: VendorMetricsRecord;
  mealPlanCount: number;
  publishedCount: number;
  draftCount: number;
  availabilityCount: number;
}): MobileVendorSummaryCardView[] {
  return [
    {
      label: "Total meal plans",
      value: formatNumber(args.metrics.totalMealPlans ?? args.mealPlanCount),
      progressText: "Total catalog size returned by vendor metrics.",
    },
    {
      label: "Published meal plans",
      value: formatNumber(args.metrics.publishedMealPlans ?? args.publishedCount),
      progressText: "Published catalog entries returned by vendor metrics.",
    },
    {
      label: "Draft meal plans",
      value: formatNumber(args.metrics.draftMealPlans ?? args.draftCount),
      progressText: "Draft catalog entries returned by vendor metrics.",
    },
    {
      label: "Availability entries",
      value: formatNumber(args.metrics.totalAvailabilityEntries ?? args.availabilityCount),
      progressText: "Availability rows returned by vendor metrics.",
    },
    {
      label: "Open pickup windows",
      value: formatNumber(args.metrics.openPickupWindows, "0"),
      progressText: "Operational pickup windows currently open.",
    },
    {
      label: "Vendor ZIP",
      value: args.metrics.zipCode ?? ZIP_FALLBACK,
      progressText: "ZIP value returned by the vendor metrics route.",
    },
  ];
}

function buildCatalogCards(args: {
  mealPlanCount: number;
  publishedCount: number;
  draftCount: number;
  availabilityCount: number;
}): MobileVendorSummaryCardView[] {
  return [
    {
      label: "Total meal plans",
      value: formatNumber(args.mealPlanCount),
      progressText: "Current catalog inventory loaded on the vendor dashboard.",
    },
    {
      label: "Published",
      value: formatNumber(args.publishedCount),
      progressText: "Published status preserved from the vendor metrics slice.",
    },
    {
      label: "Draft",
      value: formatNumber(args.draftCount),
      progressText: "Draft status preserved from the vendor metrics slice.",
    },
    {
      label: "Availability entries",
      value: formatNumber(args.availabilityCount),
      progressText: "Availability totals surfaced without inventing extra catalog analytics.",
    },
  ];
}

function buildActionCards(): MobileVendorActionView[] {
  return [
    {
      title: "Meal plans",
      description: "Open the existing vendor catalog workspace for the full meal-plan inventory.",
      href: "/vendor/meal-plans",
      ctaLabel: "Open meal plans",
      badgeLabel: "Catalog",
      tone: "yellow",
      isPlaceholder: false,
    },
    {
      title: "Metrics",
      description: "Open the existing vendor metrics route for the full read-only performance summary.",
      href: "/vendor/metrics",
      ctaLabel: "Open metrics",
      badgeLabel: "Metrics",
      tone: "purple",
      isPlaceholder: false,
    },
    {
      title: "Account",
      description: "Open the existing vendor account shell without changing auth or profile-edit behavior.",
      href: "/vendor/account",
      ctaLabel: "Open account",
      badgeLabel: "Account",
      tone: "yellow",
      isPlaceholder: false,
    },
    {
      title: "Operations placeholder",
      description: "Open the existing placeholder route only. No live vendor operations workflow is added here.",
      href: "/vendor/operations",
      ctaLabel: "Open operations placeholder",
      badgeLabel: "Placeholder",
      tone: "purple",
      isPlaceholder: true,
    },
  ];
}

export function adaptVendorDashboardView(args: {
  profile: VendorMePayload | JsonValue | null;
  metrics: VendorMetricsPayload | JsonValue | null;
  mealPlans: MealPlanListPayload | JsonValue | null;
  sessionEmail?: string | null;
}): MobileVendorDashboardView {
  const profile = readVendorProfile(args.profile);
  const metrics = readVendorMetrics(args.metrics);
  const mealPlanRows = readMealPlanRows(args.mealPlans);
  const mealPlanCount = resolveMealPlanCount({
    defaultVendorMealPlanCount: profile.defaultVendor?.mealPlanCount ?? null,
    metricsMealPlanCount: metrics.totalMealPlans,
    mealPlanRows,
  });
  const publishedCount = resolvePublishedCount(metrics, mealPlanRows);
  const draftCount = resolveDraftCount(metrics, mealPlanRows);
  const availabilityCount = resolveAvailabilityCount(metrics, mealPlanRows);
  const vendorName =
    profile.defaultVendor?.name
    ?? metrics.vendorName
    ?? VENDOR_NAME_FALLBACK;
  const vendorZipLabel =
    profile.defaultVendor?.zipCode
    ?? metrics.zipCode
    ?? ZIP_FALLBACK;
  const vendorEmailLabel = profile.email ?? args.sessionEmail ?? EMAIL_FALLBACK;
  const hasVendorProfile = Boolean(profile.defaultVendor)
    || Boolean(profile.email)
    || profile.vendorsCount > 0;

  return {
    title: "Vendor Portal",
    subtitle: `${vendorName} | ${vendorZipLabel}`,
    summaryCards: buildSummaryCards({
      mealPlanCount,
      publishedCount,
      draftCount,
      openPickupWindows: metrics.openPickupWindows,
    }),
    identity: {
      vendorName,
      vendorDescription: profile.defaultVendor?.description ?? VENDOR_DESCRIPTION_FALLBACK,
      vendorEmailLabel,
      vendorSlugLabel: profile.defaultVendor?.slug ?? SLUG_FALLBACK,
      vendorZipLabel,
      vendorStatusLabel: profile.defaultVendor?.status ?? STATUS_FALLBACK,
      vendorMealPlanCountLabel: formatCountLabel(mealPlanCount, "meal plan"),
      vendorsCountLabel: formatCountLabel(profile.vendorsCount, "vendor membership"),
      defaultVendorStateLabel: profile.defaultVendor ? "Default vendor ready" : "Default vendor unavailable",
      contextNote: profile.defaultVendor
        ? "Vendor identity, metrics, and catalog summaries remain sourced from the existing vendor BFF routes."
        : "No default vendor is configured for this vendor account, so the dashboard falls back to account-level labels while preserving the current BFF behavior.",
      hasDefaultVendor: Boolean(profile.defaultVendor),
    },
    catalog: {
      cards: buildCatalogCards({
        mealPlanCount,
        publishedCount,
        draftCount,
        availabilityCount,
      }),
      highlight: mealPlanRows[0] ?? null,
      rows: mealPlanRows.slice(0, 3),
      hasMealPlans: mealPlanRows.length > 0,
      emptyTitle: "No vendor meal plans",
      emptyMessage: "No meal plans were returned for the current vendor membership.",
    },
    metrics: {
      cards: buildMetricsCards({
        metrics,
        mealPlanCount,
        publishedCount,
        draftCount,
        availabilityCount,
      }),
      hasMetrics: metrics.hasMetrics,
      unavailableTitle: "Vendor metrics unavailable",
      unavailableMessage: "The vendor metrics route did not return summary-ready dashboard data.",
    },
    actions: buildActionCards(),
    hasVendorProfile,
  };
}
