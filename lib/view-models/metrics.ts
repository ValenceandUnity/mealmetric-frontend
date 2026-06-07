import type { JsonValue } from "@/lib/types/api";

import { getArray, isObject, pickOptionalText } from "@/lib/adapters/common";
import {
  formatCalories,
  formatDateLabel,
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
  metrics: Array<{ label: string; value: string }>;
  hasData: boolean;
};

export type MobileMetricsView = {
  summaryCards: MobileMetricSummaryCardView[];
  weeklyMetrics: MobileWeeklyMetricView[];
  historyMetrics: MobileMetricHistoryView[];
  hasData: boolean;
};

export function formatMetricCalories(
  value: number | null | undefined,
  fallback = "No calories",
): string {
  return formatCalories(value, fallback);
}

export function formatMetricPercentage(
  value: string | number | null | undefined,
  fallback = "No data",
): string {
  return formatPercentage(value, fallback);
}

export function formatMetricDate(
  value: string | null | undefined,
  fallback = "Date unavailable",
): string {
  return formatDateLabel(value, fallback);
}

function getProgressValue(value: JsonValue | null | undefined): string | number | null {
  if (!isObject(value)) {
    return null;
  }

  const candidate = value.deficit_progress_percent;
  return typeof candidate === "string" || typeof candidate === "number" ? candidate : null;
}

function adaptSummaryCards(overview: JsonValue | null): MobileMetricSummaryCardView[] {
  if (!isObject(overview)) {
    return [];
  }

  return [
    {
      label: "Intake",
      value: formatMetricCalories(getNumberLike(overview, ["total_intake_calories", "calories_consumed"])),
      hint: "Current intake from the active metrics overview.",
    },
    {
      label: "Burn",
      value: formatMetricCalories(getNumberLike(overview, ["total_expenditure_calories", "calories_burned"])),
      hint: "Current expenditure from the active metrics overview.",
    },
    {
      label: "Net",
      value: formatMetricCalories(getNumberLike(overview, ["net_calorie_balance", "net_calories"])),
      hint: "Net calorie balance returned by the BFF.",
    },
    {
      label: "Deficit progress",
      value: formatMetricPercentage(getProgressValue(overview)),
      hint: "Weekly deficit progress when available.",
    },
  ];
}

function adaptWeeklyMetrics(overview: JsonValue | null): MobileWeeklyMetricView[] {
  if (!isObject(overview)) {
    return [{
      label: "This week",
      rangeLabel: "Week unavailable",
      metrics: [],
      hasData: false,
    }];
  }

  const metrics: MobileMetricSummaryCardView[] = [
    {
      label: "Weekly target",
      value: formatMetricCalories(getNumberLike(overview, ["weekly_target_deficit_calories"])),
    },
    {
      label: "Intake ceiling",
      value: formatMetricCalories(getNumberLike(overview, ["current_intake_ceiling_calories"])),
    },
    {
      label: "Expenditure floor",
      value: formatMetricCalories(getNumberLike(overview, ["current_expenditure_floor_calories"])),
    },
  ];

  const start = pickOptionalText(overview, ["week_start_date"]);
  const end = pickOptionalText(overview, ["week_end_date"]);
  const rangeLabel = start || end
    ? `${formatMetricDate(start, "Start unavailable")} - ${formatMetricDate(end, "End unavailable")}`
    : "Week unavailable";

  return [{
    label: "This week",
    rangeLabel,
    metrics,
    hasData: metrics.some((metric) => !metric.value.startsWith("No ")),
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
        label: "Burn",
        value: formatMetricCalories(getNumberLike(item, ["total_expenditure_calories", "calories_burned"])),
      },
      {
        label: "Net",
        value: formatMetricCalories(getNumberLike(item, ["net_calorie_balance", "net_calories"])),
      },
      {
        label: "Progress",
        value: formatMetricPercentage(getProgressValue(item)),
      },
    ].filter((metric) => metric.value !== "No calories" && metric.value !== "No data");

    return [{
      id: pickOptionalText(item, ["id", "date", "recorded_at", "created_at"]) ?? `history-${index}`,
      dateLabel: formatMetricDate(
        pickOptionalText(item, ["date", "recorded_at", "created_at", "as_of_date"]),
      ),
      metrics,
      hasData: metrics.length > 0,
    }];
  });
}

export function adaptMetricsView(args: {
  overview: JsonValue | null;
  history: JsonValue | null;
}): MobileMetricsView {
  const summaryCards = adaptSummaryCards(args.overview);
  const weeklyMetrics = adaptWeeklyMetrics(args.overview);
  const historyMetrics = adaptHistoryMetrics(args.history);

  return {
    summaryCards,
    weeklyMetrics,
    historyMetrics,
    hasData:
      hasObjectFields(args.overview) ||
      historyMetrics.some((item) => item.hasData),
  };
}
