import type { JsonValue } from "@/lib/types/api";

import { getArray, isObject, pickOptionalText } from "@/lib/adapters/common";
import {
  formatCalories,
  formatDateLabel,
  formatDateTimeLabel,
  formatPercentage,
  getNumberLike,
  hasObjectFields,
} from "@/lib/view-models/common";

export type MobileMetricSummaryCardView = {
  label: string;
  value: string;
  hint?: string;
};

export type MobileWeeklyMetricView = {
  label: string;
  rangeLabel: string;
  metrics: MobileMetricSummaryCardView[];
  hasData: boolean;
};

export type MobileMetricHistoryView = {
  id: string;
  dateLabel: string;
  rangeLabel: string;
  progressLabel: string;
  metrics: Array<{ label: string; value: string }>;
  hasData: boolean;
};

export type MobileMetricProgressView = {
  label: string;
  progressLabel: string;
  progressValue: number | null;
  targetLabel: string;
  supportLabel: string;
  rangeLabel: string;
  statusLabel: string;
  hasData: boolean;
};

export type MobileMetricDetailGroupView = {
  title: string;
  eyebrow: string;
  items: Array<{ label: string; value: string }>;
};

export type MobileMetricFreshnessView = {
  sourceLabel: string;
  computedAtLabel: string;
  windowLabel: string;
  versionLabel: string;
  hasData: boolean;
};

export type MobileClientMetricsView = {
  summaryCards: MobileMetricSummaryCardView[];
  weeklyMetrics: MobileWeeklyMetricView[];
  historyMetrics: MobileMetricHistoryView[];
  progress: MobileMetricProgressView;
  detailGroups: MobileMetricDetailGroupView[];
  freshness: MobileMetricFreshnessView | null;
  hasOverview: boolean;
  hasHistory: boolean;
  hasData: boolean;
  hasAnyData: boolean;
};

export type MobileMetricsView = MobileClientMetricsView;

const NO_CALORIES = "No calories";
const NO_DATA = "No data";
const DATE_UNAVAILABLE = "Date unavailable";

export function formatMetricCalories(
  value: number | null | undefined,
  fallback = NO_CALORIES,
): string {
  return formatCalories(value, fallback);
}

export function formatMetricPercentage(
  value: string | number | null | undefined,
  fallback = NO_DATA,
): string {
  return formatPercentage(value, fallback);
}

export function formatMetricDate(
  value: string | null | undefined,
  fallback = DATE_UNAVAILABLE,
): string {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      if ([year, month, day].every((part) => Number.isFinite(part))) {
        return new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(year, month - 1, day, 12)));
      }
    }
  }

  return formatDateLabel(value, fallback);
}

function formatMetricDateTime(
  value: string | null | undefined,
  fallback = "No timestamp",
): string {
  return formatDateTimeLabel(value, fallback);
}

function hasMetricFields(value: JsonValue | null | undefined): boolean {
  if (!isObject(value)) {
    return false;
  }

  const keys = [
    "total_intake_calories",
    "total_expenditure_calories",
    "net_calorie_balance",
    "weekly_target_deficit_calories",
    "deficit_progress_percent",
    "current_intake_ceiling_calories",
    "current_expenditure_floor_calories",
  ];

  return keys.some((key) => key in value);
}

function getProgressValue(value: JsonValue | null | undefined): string | number | null {
  if (!isObject(value)) {
    return null;
  }

  const candidate = value.deficit_progress_percent;
  return typeof candidate === "string" || typeof candidate === "number" ? candidate : null;
}

function getProgressNumber(value: string | number | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 && value <= 1 ? value * 100 : value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/%$/, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
}

function formatWeekRange(value: JsonValue | null | undefined, fallback = "Week unavailable"): string {
  if (!isObject(value)) {
    return fallback;
  }

  const start = pickOptionalText(value, ["week_start_date"]);
  const end = pickOptionalText(value, ["week_end_date"]);

  if (!start && !end) {
    return fallback;
  }

  return `${formatMetricDate(start, "Start unavailable")} - ${formatMetricDate(end, "End unavailable")}`;
}

function resolveSnapshot(overview: JsonValue | null, history: JsonValue | null): JsonValue | null {
  if (hasMetricFields(overview)) {
    return overview;
  }

  if (hasMetricFields(history)) {
    return history;
  }

  const latestHistoryWeek = pickHistoryRows(history).find((item) => hasMetricFields(item));
  if (latestHistoryWeek) {
    return latestHistoryWeek;
  }

  return null;
}

function adaptSummaryCards(snapshot: JsonValue | null): MobileMetricSummaryCardView[] {
  if (!isObject(snapshot)) {
    return [];
  }

  return [
    {
      label: "Intake",
      value: formatMetricCalories(getNumberLike(snapshot, ["total_intake_calories", "calories_consumed"])),
      hint: "Current intake from the active client metrics snapshot.",
    },
    {
      label: "Expenditure",
      value: formatMetricCalories(getNumberLike(snapshot, ["total_expenditure_calories", "calories_burned"])),
      hint: "Current expenditure from the active client metrics snapshot.",
    },
    {
      label: "Net balance",
      value: formatMetricCalories(getNumberLike(snapshot, ["net_calorie_balance", "net_calories"])),
      hint: "Net calorie balance returned by the client BFF.",
    },
    {
      label: "Deficit progress",
      value: formatMetricPercentage(getProgressValue(snapshot)),
      hint: "Weekly deficit progress when the backend provides it.",
    },
  ];
}

function adaptWeeklyMetrics(snapshot: JsonValue | null): MobileWeeklyMetricView[] {
  if (!isObject(snapshot)) {
    return [{
      label: "My Week",
      rangeLabel: "Week unavailable",
      metrics: [],
      hasData: false,
    }];
  }

  const metrics: MobileMetricSummaryCardView[] = [
    {
      label: "Weekly target",
      value: formatMetricCalories(getNumberLike(snapshot, ["weekly_target_deficit_calories"]), "Target unavailable"),
    },
    {
      label: "Intake ceiling",
      value: formatMetricCalories(getNumberLike(snapshot, ["current_intake_ceiling_calories"]), "Ceiling unavailable"),
    },
    {
      label: "Expenditure floor",
      value: formatMetricCalories(getNumberLike(snapshot, ["current_expenditure_floor_calories"]), "Floor unavailable"),
    },
    {
      label: "As of",
      value: formatMetricDate(pickOptionalText(snapshot, ["as_of_date"])),
    },
  ];

  return [{
    label: "My Week",
    rangeLabel: formatWeekRange(snapshot),
    metrics,
    hasData: metrics.some((metric) => !metric.value.toLowerCase().includes("unavailable")),
  }];
}

function pickHistoryRows(value: JsonValue | null): JsonValue[] {
  const direct = getArray(value);
  if (direct.length > 0) {
    return direct;
  }

  if (!isObject(value)) {
    return [];
  }

  const weeks = value.weeks;
  if (Array.isArray(weeks)) {
    return weeks;
  }

  for (const entry of Object.values(value)) {
    const nested = pickHistoryRows(entry);
    if (nested.length > 0) {
      return nested;
    }
  }

  return [];
}

function adaptHistoryMetrics(history: JsonValue | null): MobileMetricHistoryView[] {
  return pickHistoryRows(history).flatMap((item, index) => {
    if (!isObject(item)) {
      return [];
    }

    const metrics = [
      {
        label: "Intake",
        value: formatMetricCalories(getNumberLike(item, ["total_intake_calories", "calories_consumed"])),
      },
      {
        label: "Expenditure",
        value: formatMetricCalories(getNumberLike(item, ["total_expenditure_calories", "calories_burned"])),
      },
      {
        label: "Net balance",
        value: formatMetricCalories(getNumberLike(item, ["net_calorie_balance", "net_calories"])),
      },
      {
        label: "Deficit progress",
        value: formatMetricPercentage(getProgressValue(item)),
      },
    ].filter((metric) => metric.value !== NO_CALORIES && metric.value !== NO_DATA);

    return [{
      id: pickOptionalText(item, ["id", "week_start_date", "as_of_date", "created_at"]) ?? `history-${index}`,
      dateLabel: formatWeekRange(item),
      rangeLabel: `As of ${formatMetricDate(pickOptionalText(item, ["as_of_date"]))}`,
      progressLabel: formatMetricPercentage(getProgressValue(item)),
      metrics,
      hasData: metrics.length > 0,
    }];
  });
}

function adaptProgress(snapshot: JsonValue | null): MobileMetricProgressView {
  const progressValue = getProgressNumber(getProgressValue(snapshot));
  const progressLabel = formatMetricPercentage(getProgressValue(snapshot), "Progress unavailable");

  if (!isObject(snapshot)) {
    return {
      label: "Deficit progress",
      progressLabel,
      progressValue,
      targetLabel: "Target unavailable",
      supportLabel: "Net balance unavailable",
      rangeLabel: "Week unavailable",
      statusLabel: "Progress unavailable",
      hasData: false,
    };
  }

  const targetLabel = formatMetricCalories(
    getNumberLike(snapshot, ["weekly_target_deficit_calories"]),
    "Target unavailable",
  );
  const supportLabel = formatMetricCalories(
    getNumberLike(snapshot, ["net_calorie_balance", "net_calories"]),
    "Net balance unavailable",
  );

  return {
    label: "Deficit progress",
    progressLabel,
    progressValue,
    targetLabel,
    supportLabel,
    rangeLabel: formatWeekRange(snapshot),
    statusLabel:
      progressValue === null
        ? "Progress unavailable"
        : progressValue >= 100
          ? "Weekly target reached"
          : "Progressing toward weekly target",
    hasData: progressValue !== null || targetLabel !== "Target unavailable" || supportLabel !== "Net balance unavailable",
  };
}

function adaptFreshness(snapshot: JsonValue | null): MobileMetricFreshnessView | null {
  if (!isObject(snapshot) || !isObject(snapshot.freshness)) {
    return null;
  }

  const sourceLabel = pickOptionalText(snapshot.freshness, ["source"]) ?? "Source unavailable";
  const computedAtLabel = formatMetricDateTime(
    pickOptionalText(snapshot.freshness, ["computed_at", "snapshot_generated_at"]),
    "Computed time unavailable",
  );
  const windowStart = pickOptionalText(snapshot.freshness, ["source_window_start"]);
  const windowEnd = pickOptionalText(snapshot.freshness, ["source_window_end"]);
  const windowLabel =
    windowStart || windowEnd
      ? `${formatMetricDate(windowStart, "Start unavailable")} - ${formatMetricDate(windowEnd, "End unavailable")}`
      : "Window unavailable";
  const versionLabel = pickOptionalText(snapshot.freshness, ["version"]) ?? "Version unavailable";

  return {
    sourceLabel,
    computedAtLabel,
    windowLabel,
    versionLabel,
    hasData:
      sourceLabel !== "Source unavailable" ||
      computedAtLabel !== "Computed time unavailable" ||
      windowLabel !== "Window unavailable" ||
      versionLabel !== "Version unavailable",
  };
}

function adaptDetailGroups(
  snapshot: JsonValue | null,
  freshness: MobileMetricFreshnessView | null,
): MobileMetricDetailGroupView[] {
  if (!isObject(snapshot)) {
    return [];
  }

  const groups: MobileMetricDetailGroupView[] = [
    {
      title: "Intake",
      eyebrow: "Nutrition",
      items: [
        {
          label: "Total intake calories",
          value: formatMetricCalories(getNumberLike(snapshot, ["total_intake_calories"])),
        },
        {
          label: "Current intake ceiling",
          value: formatMetricCalories(
            getNumberLike(snapshot, ["current_intake_ceiling_calories"]),
            "Ceiling unavailable",
          ),
        },
      ],
    },
    {
      title: "Expenditure",
      eyebrow: "Output",
      items: [
        {
          label: "Total expenditure calories",
          value: formatMetricCalories(getNumberLike(snapshot, ["total_expenditure_calories"])),
        },
        {
          label: "Current expenditure floor",
          value: formatMetricCalories(
            getNumberLike(snapshot, ["current_expenditure_floor_calories"]),
            "Floor unavailable",
          ),
        },
      ],
    },
    {
      title: "Deficit",
      eyebrow: "Progress",
      items: [
        {
          label: "Net calorie balance",
          value: formatMetricCalories(getNumberLike(snapshot, ["net_calorie_balance"])),
        },
        {
          label: "Weekly target deficit",
          value: formatMetricCalories(
            getNumberLike(snapshot, ["weekly_target_deficit_calories"]),
            "Target unavailable",
          ),
        },
        {
          label: "Deficit progress",
          value: formatMetricPercentage(getProgressValue(snapshot), "Progress unavailable"),
        },
      ],
    },
    {
      title: "Targets",
      eyebrow: "Window",
      items: [
        {
          label: "Week range",
          value: formatWeekRange(snapshot),
        },
        {
          label: "As of date",
          value: formatMetricDate(pickOptionalText(snapshot, ["as_of_date"])),
        },
        {
          label: "Timezone",
          value: pickOptionalText(snapshot, ["business_timezone"]) ?? "Timezone unavailable",
        },
      ],
    },
  ];

  if (freshness?.hasData) {
    groups.push({
      title: "Freshness",
      eyebrow: "Source",
      items: [
        { label: "Source", value: freshness.sourceLabel },
        { label: "Computed at", value: freshness.computedAtLabel },
        { label: "Window", value: freshness.windowLabel },
        { label: "Version", value: freshness.versionLabel },
      ],
    });
  }

  return groups;
}

export function adaptMetricsView(args: {
  overview: JsonValue | null;
  history: JsonValue | null;
}): MobileMetricsView {
  const snapshot = resolveSnapshot(args.overview, args.history);
  const summaryCards = adaptSummaryCards(snapshot);
  const weeklyMetrics = adaptWeeklyMetrics(snapshot);
  const historyMetrics = adaptHistoryMetrics(args.history);
  const freshness = adaptFreshness(snapshot);
  const detailGroups = adaptDetailGroups(snapshot, freshness);

  const hasOverview = hasMetricFields(snapshot);
  const hasHistory = historyMetrics.some((item) => item.hasData);
  const hasAnyData =
    hasOverview ||
    hasHistory ||
    hasObjectFields(args.overview) ||
    hasObjectFields(args.history);

  return {
    summaryCards,
    weeklyMetrics,
    historyMetrics,
    progress: adaptProgress(snapshot),
    detailGroups,
    freshness,
    hasOverview,
    hasHistory,
    hasData: hasAnyData,
    hasAnyData,
  };
}
