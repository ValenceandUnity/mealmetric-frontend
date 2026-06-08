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

export type MobileVendorMetricsHealthCardView = {
  label: string;
  value: string;
  target?: string;
  progressText: string;
};

export type MobileVendorAccountIdentityView = {
  accountEmailLabel: string;
  accountRoleLabel: string;
  vendorsCountLabel: string;
  defaultVendorStateLabel: string;
  accountNote: string;
};

export type MobileVendorProfileView = {
  vendorName: string;
  vendorDescription: string;
  vendorSlugLabel: string;
  vendorZipLabel: string;
  vendorStatusLabel: string;
  vendorMealPlanCountLabel: string;
  hasDefaultVendor: boolean;
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

export type MobileVendorMealPlansView = {
  title: string;
  subtitle: string;
  summaryCards: MobileVendorSummaryCardView[];
  highlight: MobileVendorMealPlanPreviewView | null;
  mealPlans: MobileVendorMealPlanPreviewView[];
  hasMealPlans: boolean;
  emptyTitle: string;
  emptyMessage: string;
  highlightEmptyTitle: string;
  highlightEmptyMessage: string;
  readOnlyNote: string;
};

export type MobileVendorMetricsView = {
  title: string;
  subtitle: string;
  vendorName: string;
  vendorZipLabel: string;
  heroDescription: string;
  summaryCards: MobileVendorSummaryCardView[];
  healthCards: MobileVendorMetricsHealthCardView[];
  actions: MobileVendorActionView[];
  totalMealPlansLabel: string;
  publishedMealPlansLabel: string;
  draftMealPlansLabel: string;
  availabilityEntriesLabel: string;
  openPickupWindowsLabel: string;
  hasMetrics: boolean;
  unavailableTitle: string;
  unavailableMessage: string;
};

export type MobileVendorAccountView = {
  title: string;
  subtitle: string;
  identity: MobileVendorAccountIdentityView;
  profile: MobileVendorProfileView;
  summaryCards: MobileVendorSummaryCardView[];
  actions: MobileVendorActionView[];
  readOnlyTitle: string;
  readOnlyMessage: string;
  hasProfileData: boolean;
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

function buildVendorMetricsSummaryCards(metrics: VendorMetricsRecord): MobileVendorSummaryCardView[] {
  return [
    {
      label: "Total meal plans",
      value: formatNumber(metrics.totalMealPlans, "Unavailable"),
      progressText: "Total catalog size returned by the vendor metrics route.",
    },
    {
      label: "Published meal plans",
      value: formatNumber(metrics.publishedMealPlans, "Unavailable"),
      progressText: "Published catalog entries returned by the vendor metrics route.",
    },
    {
      label: "Draft meal plans",
      value: formatNumber(metrics.draftMealPlans, "Unavailable"),
      progressText: "Draft catalog entries returned by the vendor metrics route.",
    },
    {
      label: "Availability entries",
      value: formatNumber(metrics.totalAvailabilityEntries, "Unavailable"),
      progressText: "Availability rows returned by the vendor metrics route.",
    },
    {
      label: "Open pickup windows",
      value: formatNumber(metrics.openPickupWindows, "Unavailable"),
      progressText: "Pickup windows currently marked open by the vendor metrics route.",
    },
    {
      label: "Vendor ZIP",
      value: metrics.zipCode ?? ZIP_FALLBACK,
      progressText: "ZIP value returned by the vendor metrics route.",
    },
  ];
}

function buildVendorMetricsHealthCards(metrics: VendorMetricsRecord): MobileVendorMetricsHealthCardView[] {
  const totalMealPlans =
    typeof metrics.totalMealPlans === "number" && Number.isFinite(metrics.totalMealPlans)
      ? metrics.totalMealPlans
      : null;
  const publishedMealPlans =
    typeof metrics.publishedMealPlans === "number" && Number.isFinite(metrics.publishedMealPlans)
      ? metrics.publishedMealPlans
      : null;
  const draftMealPlans =
    typeof metrics.draftMealPlans === "number" && Number.isFinite(metrics.draftMealPlans)
      ? metrics.draftMealPlans
      : null;
  const totalAvailabilityEntries =
    typeof metrics.totalAvailabilityEntries === "number" && Number.isFinite(metrics.totalAvailabilityEntries)
      ? metrics.totalAvailabilityEntries
      : null;
  const openPickupWindows =
    typeof metrics.openPickupWindows === "number" && Number.isFinite(metrics.openPickupWindows)
      ? metrics.openPickupWindows
      : null;
  const publishedTarget = totalMealPlans !== null && totalMealPlans > 0 ? formatNumber(totalMealPlans) : undefined;

  return [
    {
      label: "Published coverage",
      value: formatNumber(publishedMealPlans, "Unavailable"),
      target: publishedTarget,
      progressText:
        totalMealPlans !== null && publishedMealPlans !== null
          ? `${formatNumber(publishedMealPlans)} of ${formatNumber(totalMealPlans)} returned meal plans are published.`
          : "Published coverage is unavailable from the current vendor metrics payload.",
    },
    {
      label: "Draft coverage",
      value: formatNumber(draftMealPlans, "Unavailable"),
      target: publishedTarget,
      progressText:
        totalMealPlans !== null && draftMealPlans !== null
          ? `${formatNumber(draftMealPlans)} of ${formatNumber(totalMealPlans)} returned meal plans remain draft.`
          : "Draft coverage is unavailable from the current vendor metrics payload.",
    },
    {
      label: "Availability entries",
      value: formatNumber(totalAvailabilityEntries, "Unavailable"),
      progressText:
        totalAvailabilityEntries !== null
          ? `${formatCountLabel(totalAvailabilityEntries, "availability entry", "availability entries")} are currently tracked for the vendor catalog.`
          : "Availability entry coverage is unavailable from the current vendor metrics payload.",
    },
    {
      label: "Open pickup windows",
      value: formatNumber(openPickupWindows, "Unavailable"),
      progressText:
        openPickupWindows !== null
          ? `${formatCountLabel(openPickupWindows, "open pickup window")} are currently active.`
          : "Open pickup window coverage is unavailable from the current vendor metrics payload.",
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
      progressText: "Published status derived from the loaded meal-plan statuses.",
    },
    {
      label: "Draft",
      value: formatNumber(args.draftCount),
      progressText: "Draft status derived from the loaded meal-plan statuses.",
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

function buildVendorMetricsActionCards(): MobileVendorActionView[] {
  return [
    {
      title: "Vendor dashboard",
      description: "Open the existing vendor dashboard overview route without changing its current BFF behavior.",
      href: "/vendor",
      ctaLabel: "Open dashboard",
      badgeLabel: "Overview",
      tone: "yellow",
      isPlaceholder: false,
    },
    {
      title: "Meal plans",
      description: "Open the existing vendor catalog workspace for the full meal-plan inventory.",
      href: "/vendor/meal-plans",
      ctaLabel: "Open meal plans",
      badgeLabel: "Catalog",
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

function buildVendorAccountActionCards(): MobileVendorActionView[] {
  return [
    {
      title: "Vendor dashboard",
      description: "Open the existing vendor dashboard overview route without changing its current BFF behavior.",
      href: "/vendor",
      ctaLabel: "Open dashboard",
      badgeLabel: "Overview",
      tone: "yellow",
      isPlaceholder: false,
    },
    {
      title: "Meal plans",
      description: "Open the existing vendor catalog workspace for the full meal-plan inventory.",
      href: "/vendor/meal-plans",
      ctaLabel: "Open meal plans",
      badgeLabel: "Catalog",
      tone: "purple",
      isPlaceholder: false,
    },
    {
      title: "Metrics",
      description: "Open the existing vendor metrics route for the current read-only performance summary.",
      href: "/vendor/metrics",
      ctaLabel: "Open metrics",
      badgeLabel: "Metrics",
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

function formatRoleLabel(value: string | null | undefined): string {
  if (!value) {
    return "Role unavailable";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildVendorAccountSummaryCards(args: {
  vendorsCount: number;
  defaultVendorMealPlanCount: number | null;
  vendorZipLabel: string;
  accountRoleLabel: string;
}): MobileVendorSummaryCardView[] {
  return [
    {
      label: "Account role",
      value: args.accountRoleLabel,
      progressText: "Role context remains sourced from the authenticated frontend session.",
    },
    {
      label: "Vendor memberships",
      value: formatNumber(args.vendorsCount),
      progressText: "Vendor memberships returned by the vendor profile route.",
    },
    {
      label: "Default vendor meal plans",
      value: formatNumber(args.defaultVendorMealPlanCount, "Unavailable"),
      progressText: "Meal-plan count returned for the current default vendor.",
    },
    {
      label: "Vendor ZIP",
      value: args.vendorZipLabel,
      progressText: "ZIP value returned for the current default vendor.",
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

export function adaptVendorMealPlansView(args: {
  mealPlans: MealPlanListPayload | JsonValue | null;
}): MobileVendorMealPlansView {
  const mealPlans = readMealPlanRows(args.mealPlans);
  const publishedCount = mealPlans.filter((mealPlan) => mealPlan.statusLabel.toLowerCase() === "published").length;
  const draftCount = mealPlans.length - publishedCount;
  const availabilityCount = mealPlans.reduce(
    (sum, mealPlan) => sum + Number.parseInt(mealPlan.availabilityLabel, 10),
    0,
  );
  const leadVendorName = mealPlans[0]?.vendorName ?? "Vendor catalog";
  const leadVendorZip = mealPlans[0]?.vendorZipLabel ?? ZIP_FALLBACK;

  return {
    title: "Vendor Meal Plans",
    subtitle: `${leadVendorName} | ${leadVendorZip}`,
    summaryCards: [
      {
        label: "Total meal plans",
        value: formatNumber(mealPlans.length),
        progressText: "Meal plans currently returned through the vendor meal-plan route.",
      },
      {
        label: "Published",
        value: formatNumber(publishedCount),
        progressText: "Visible published entries derived from the loaded meal-plan statuses.",
      },
      {
        label: "Draft",
        value: formatNumber(draftCount),
        progressText: "Entries not marked published in the current catalog payload.",
      },
      {
        label: "Availability entries",
        value: formatNumber(availabilityCount),
        progressText: "Total availability rows exposed by the returned inventory.",
      },
    ],
    highlight: mealPlans[0] ?? null,
    mealPlans,
    hasMealPlans: mealPlans.length > 0,
    emptyTitle: "No vendor meal plans",
    emptyMessage:
      "No meal plans were returned for the current vendor membership, so the catalog workspace remains empty until inventory exists.",
    highlightEmptyTitle: "No meal-plan spotlight",
    highlightEmptyMessage:
      "The spotlight remains empty until the vendor meal-plan route returns at least one plan.",
    readOnlyNote:
      "This catalog stays read-only. No create, edit, publish, archive, or delete workflow is introduced because the current vendor surface does not support those mutations here.",
  };
}

export function adaptVendorMetricsView(args: {
  metrics: VendorMetricsPayload | JsonValue | null;
}): MobileVendorMetricsView {
  const metrics = readVendorMetrics(args.metrics);
  const vendorName = metrics.vendorName ?? VENDOR_NAME_FALLBACK;
  const vendorZipLabel = metrics.zipCode ?? ZIP_FALLBACK;

  return {
    title: "Vendor Metrics",
    subtitle: `${vendorName} | ${vendorZipLabel}`,
    vendorName,
    vendorZipLabel,
    heroDescription: metrics.hasMetrics
      ? "This read-only mobile metrics view preserves the existing vendor metrics BFF route and avoids unsupported performance summaries."
      : "The vendor metrics route did not return summary-ready data, so this mobile view falls back to safe labels without inventing unsupported summaries.",
    summaryCards: buildVendorMetricsSummaryCards(metrics),
    healthCards: buildVendorMetricsHealthCards(metrics),
    actions: buildVendorMetricsActionCards(),
    totalMealPlansLabel: formatNumber(metrics.totalMealPlans, "Unavailable"),
    publishedMealPlansLabel: formatNumber(metrics.publishedMealPlans, "Unavailable"),
    draftMealPlansLabel: formatNumber(metrics.draftMealPlans, "Unavailable"),
    availabilityEntriesLabel: formatNumber(metrics.totalAvailabilityEntries, "Unavailable"),
    openPickupWindowsLabel: formatNumber(metrics.openPickupWindows, "Unavailable"),
    hasMetrics: metrics.hasMetrics,
    unavailableTitle: "Vendor metrics unavailable",
    unavailableMessage: "The vendor metrics route did not return mobile summary data for this account.",
  };
}

export function adaptVendorAccountView(args: {
  profile: VendorMePayload | JsonValue | null;
  sessionEmail?: string | null;
  sessionRole?: string | null;
}): MobileVendorAccountView {
  const profile = readVendorProfile(args.profile);
  const vendorName = profile.defaultVendor?.name ?? VENDOR_NAME_FALLBACK;
  const vendorZipLabel = profile.defaultVendor?.zipCode ?? ZIP_FALLBACK;
  const accountEmailLabel = profile.email ?? args.sessionEmail ?? EMAIL_FALLBACK;
  const accountRoleLabel = formatRoleLabel(args.sessionRole);
  const hasProfileData = Boolean(profile.defaultVendor) || Boolean(profile.email) || Boolean(args.sessionEmail);

  return {
    title: "Vendor Account",
    subtitle: `${vendorName} | ${vendorZipLabel}`,
    identity: {
      accountEmailLabel,
      accountRoleLabel,
      vendorsCountLabel: formatCountLabel(profile.vendorsCount, "vendor membership"),
      defaultVendorStateLabel: profile.defaultVendor ? "Default vendor ready" : "Default vendor unavailable",
      accountNote: profile.defaultVendor
        ? "This account view stays read-only and uses the existing vendor identity route for default vendor context."
        : "No default vendor is configured for this account, so vendor profile fields fall back to safe unavailable labels.",
    },
    profile: {
      vendorName,
      vendorDescription: profile.defaultVendor?.description ?? VENDOR_DESCRIPTION_FALLBACK,
      vendorSlugLabel: profile.defaultVendor?.slug ?? SLUG_FALLBACK,
      vendorZipLabel,
      vendorStatusLabel: profile.defaultVendor?.status ?? STATUS_FALLBACK,
      vendorMealPlanCountLabel: formatCountLabel(profile.defaultVendor?.mealPlanCount, "meal plan"),
      hasDefaultVendor: Boolean(profile.defaultVendor),
      unavailableTitle: "Default vendor unavailable",
      unavailableMessage:
        "No default vendor is configured for this account, so vendor profile details remain read-only and unavailable on this route.",
    },
    summaryCards: buildVendorAccountSummaryCards({
      vendorsCount: profile.vendorsCount,
      defaultVendorMealPlanCount: profile.defaultVendor?.mealPlanCount ?? null,
      vendorZipLabel,
      accountRoleLabel,
    }),
    actions: buildVendorAccountActionCards(),
    readOnlyTitle: "Read-only account state",
    readOnlyMessage:
      "This route does not add profile editing or any unsupported vendor account workflows.",
    hasProfileData,
  };
}
