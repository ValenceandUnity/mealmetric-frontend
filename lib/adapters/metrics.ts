import type { JsonValue } from "@/lib/types/api";

import {
  extractDetails,
  extractSummary,
  formatValue,
  getArray,
  isObject,
  startCase,
} from "@/lib/adapters/common";

type MetricDefinition = {
  keys: string[];
  label: string;
};

export type MetricsDisplayItem = {
  key: string;
  label: string;
  value: string;
};

export type MetricsTrendRow = {
  label: string;
  metrics: MetricsDisplayItem[];
};

export type ClientMetricsDisplayView = {
  nutrition: MetricsDisplayItem[];
  training: MetricsDisplayItem[];
  supporting: MetricsDisplayItem[];
  today: MetricsDisplayItem[];
  thisWeek: MetricsDisplayItem[];
  trendRows: MetricsTrendRow[];
  hasAnyData: boolean;
};

const NUTRITION_METRICS: MetricDefinition[] = [
  { keys: ["calories_consumed"], label: "Calories Consumed" },
  { keys: ["calories_burned"], label: "Calories Burned" },
  { keys: ["net_calories"], label: "Net Calories" },
  { keys: ["deficit"], label: "Deficit" },
  { keys: ["surplus"], label: "Surplus" },
];

const TRAINING_METRICS: MetricDefinition[] = [
  { keys: ["workout_count", "completed_workouts", "workouts_completed", "total_workouts"], label: "Workout Count" },
  { keys: ["active_minutes", "minutes_active", "workout_minutes", "total_active_minutes"], label: "Active Minutes" },
  {
    keys: ["completion_rate", "completion_percent", "percent_complete", "completed_percent"],
    label: "Completion Rate",
  },
  {
    keys: ["completion_status", "workout_completion_status", "training_completion_status"],
    label: "Completion Status",
  },
];

const SUPPORTING_METRICS: MetricDefinition[] = [
  { keys: ["protein"], label: "Protein" },
  { keys: ["steps"], label: "Steps" },
  { keys: ["distance", "distance_miles", "distance_km"], label: "Distance" },
];

const DATE_KEYS = ["date", "day", "recorded_at", "created_at", "timestamp"];

export type MetricCollectionView = {
  hasData: boolean;
  scalarCount: number;
  collectionCount: number;
  summary: Array<{ label: string; value: string; hint?: string }>;
  highlights: Array<{ label: string; value: string }>;
  sections: Array<{
    id: string;
    title: string;
    description: string;
    stats: Array<{ label: string; value: string; hint?: string }>;
    rows: Array<{
      eyebrow?: string;
      title: string;
      description?: string;
      metadata: Array<{ label: string; value: string }>;
    }>;
    emptyMessage?: string;
  }>;
};

export function adaptClientMetricsDisplay(
  overview: JsonValue | null,
  history: JsonValue | null,
): ClientMetricsDisplayView {
  const sources = [overview, history];
  const allMetricDefs = [...NUTRITION_METRICS, ...TRAINING_METRICS, ...SUPPORTING_METRICS];

  return {
    nutrition: pickMetricsFromSources(sources, NUTRITION_METRICS),
    training: pickMetricsFromSources(sources, TRAINING_METRICS),
    supporting: pickMetricsFromSources(sources, SUPPORTING_METRICS),
    today: pickMetricsFromSection(sources, ["today", "today_summary", "current_day"], allMetricDefs),
    thisWeek: pickMetricsFromSection(sources, ["this_week", "week", "weekly", "week_summary"], allMetricDefs),
    trendRows: findTrendRows(sources, allMetricDefs),
    hasAnyData: sources.some(hasAnyMetricData),
  };
}

export function adaptMetrics(value: JsonValue | null): MetricCollectionView {
  const summary = extractSummary(value, 4);
  const objectEntries = isObject(value) ? Object.entries(value) : [];
  const scalarEntries = objectEntries.filter(([, entry]) => isScalar(entry));
  const collectionEntries = objectEntries.filter(([, entry]) => !isScalar(entry));
  const sections = [
    ...buildScalarSection(scalarEntries),
    ...collectionEntries.slice(0, 4).map(([key, entry]) => buildSection(key, entry)),
  ];

  return {
    hasData: value !== null,
    scalarCount: scalarEntries.length,
    collectionCount: collectionEntries.length,
    summary:
      summary.length > 0
        ? summary
        : [
            {
              label: "Data Shape",
              value: Array.isArray(value) ? `${value.length} items` : "No summary available",
            },
            { label: "Source", value: "BFF metrics response" },
          ],
    highlights: extractDetails(value, 6),
    sections,
  };
}

function hasAnyMetricData(value: JsonValue | null): boolean {
  if (value === null) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return isObject(value) && Object.keys(value).length > 0;
}

function pickMetricsFromSources(
  sources: Array<JsonValue | null>,
  definitions: MetricDefinition[],
): MetricsDisplayItem[] {
  return definitions.flatMap((definition) => {
    for (const source of sources) {
      const candidate = findScalarValue(source, definition.keys);
      if (candidate !== null) {
        return [
          {
            key: definition.keys[0],
            label: definition.label,
            value: candidate,
          },
        ];
      }
    }

    return [];
  });
}

function pickMetricsFromSection(
  sources: Array<JsonValue | null>,
  sectionKeys: string[],
  definitions: MetricDefinition[],
): MetricsDisplayItem[] {
  for (const source of sources) {
    const section = findObjectSection(source, sectionKeys);
    if (!section) {
      continue;
    }

    const metrics = definitions.flatMap((definition) => {
      const candidate = findScalarValue(section, definition.keys);
      return candidate !== null
        ? [{ key: definition.keys[0], label: definition.label, value: candidate }]
        : [];
    });

    if (metrics.length > 0) {
      return metrics;
    }
  }

  return [];
}

function findTrendRows(
  sources: Array<JsonValue | null>,
  definitions: MetricDefinition[],
): MetricsTrendRow[] {
  for (const source of sources) {
    const candidate = findTrendArray(source, definitions);
    if (candidate.length > 0) {
      return candidate;
    }
  }

  return [];
}

function findScalarValue(value: JsonValue | null, targetKeys: string[]): string | null {
  if (!isObject(value)) {
    return null;
  }

  for (const targetKey of targetKeys) {
    const directValue = value[targetKey];
    if (typeof directValue === "string" || typeof directValue === "number" || typeof directValue === "boolean") {
      return formatValue(directValue);
    }
  }

  for (const entry of Object.values(value)) {
    if (!isObject(entry)) {
      continue;
    }

    const nestedValue = findScalarValue(entry, targetKeys);
    if (nestedValue !== null) {
      return nestedValue;
    }
  }

  return null;
}

function findObjectSection(value: JsonValue | null, keys: string[]): Record<string, JsonValue> | null {
  if (!isObject(value)) {
    return null;
  }

  for (const key of keys) {
    const direct = value[key];
    if (isObject(direct)) {
      return direct;
    }
  }

  for (const entry of Object.values(value)) {
    if (!isObject(entry)) {
      continue;
    }

    const nested = findObjectSection(entry, keys);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function findTrendArray(
  value: JsonValue | null,
  definitions: MetricDefinition[],
): MetricsTrendRow[] {
  const directArray = getArray(value);
  if (directArray.length > 0 && directArray.every((entry) => isObject(entry))) {
    const trendRows = directArray
      .map((entry, index) => buildTrendRow(entry, index, definitions))
      .filter((entry): entry is MetricsTrendRow => entry !== null);
    if (trendRows.length > 0) {
      return trendRows;
    }
  }

  if (!isObject(value)) {
    return [];
  }

  for (const entry of Object.values(value)) {
    const nested = findTrendArray(entry, definitions);
    if (nested.length > 0) {
      return nested;
    }
  }

  return [];
}

function buildTrendRow(
  value: JsonValue,
  index: number,
  definitions: MetricDefinition[],
): MetricsTrendRow | null {
  if (!isObject(value)) {
    return null;
  }

  const label = DATE_KEYS
    .map((key) => value[key])
    .find((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  const metrics = definitions.flatMap((definition) => {
    for (const key of definition.keys) {
      const candidate = value[key];
      if (typeof candidate === "string" || typeof candidate === "number" || typeof candidate === "boolean") {
        return [{ key: definition.keys[0], label: definition.label, value: formatValue(candidate) }];
      }
    }

    return [];
  });

  if (!label || metrics.length === 0) {
    return null;
  }

  return {
    label: label || `Record ${index + 1}`,
    metrics,
  };
}

function isScalar(value: JsonValue): boolean {
  return ["string", "number", "boolean"].includes(typeof value) || value === null;
}

function buildScalarSection(entries: Array<[string, JsonValue]>) {
  if (entries.length <= 4) {
    return [];
  }

  return [
    {
      id: "additional-metrics",
      title: "Additional metrics",
      description: "More scalar values returned in the active metrics slice.",
      stats: entries.slice(4, 10).map(([label, entry]) => ({
        label: startCase(label),
        value: formatValue(entry),
      })),
      rows: [],
      emptyMessage: undefined,
    },
  ];
}

function buildSection(key: string, value: JsonValue) {
  if (Array.isArray(value)) {
    return buildArraySection(key, value);
  }

  if (isObject(value)) {
    return buildObjectSection(key, value);
  }

  return {
    id: key,
    title: startCase(key),
    description: "Structured metrics were not available for this group.",
    stats: [],
    rows: [],
    emptyMessage: "This metric group is present but does not expose dashboard-ready details yet.",
  };
}

function buildArraySection(key: string, value: JsonValue[]) {
  const rows = value.slice(0, 4).map((entry, index) => buildRow(entry, index));

  return {
    id: key,
    title: startCase(key),
    description: "Collection-style metric records surfaced from the current response.",
    stats: [
      {
        label: "Records",
        value: `${value.length}`,
        hint: value.length > rows.length ? `Showing ${rows.length} in this view.` : undefined,
      },
    ],
    rows,
    emptyMessage:
      value.length === 0
        ? "No records are available in this metric collection yet."
        : undefined,
  };
}

function buildObjectSection(key: string, value: Record<string, JsonValue>) {
  const entries = Object.entries(value);
  const stats = extractSummary(value, 4);
  const rows = entries
    .filter(([, entry]) => !isScalar(entry))
    .slice(0, 4)
    .map(([childKey, childValue], index) => ({
      eyebrow: "Metric group",
      title: startCase(childKey),
      description: describeStructuredValue(childValue, index),
      metadata: buildStructuredMetadata(childValue),
    }));

  return {
    id: key,
    title: startCase(key),
    description: "Grouped metrics returned under a structured object in the active slice.",
    stats,
    rows,
    emptyMessage:
      stats.length === 0 && rows.length === 0
        ? "This metric group is present but does not expose readable fields yet."
        : undefined,
  };
}

function buildRow(value: JsonValue, index: number) {
  if (!isObject(value)) {
    return {
      eyebrow: "Metric record",
      title: `Record ${index + 1}`,
      description: formatValue(value),
      metadata: [],
    };
  }

  const entries = Object.entries(value);
  const titleEntry = entries.find(([label, entry]) =>
    ["name", "title", "label", "date", "recorded_at", "created_at", "id"].includes(label) &&
    typeof entry === "string" &&
    entry.trim().length > 0,
  );
  const descriptionEntries = entries.filter(
    ([label, entry]) => titleEntry?.[0] !== label && isScalar(entry),
  );

  return {
    eyebrow: "Metric record",
    title: titleEntry ? String(titleEntry[1]) : `Record ${index + 1}`,
    description:
      descriptionEntries.length > 0
        ? descriptionEntries
            .slice(0, 2)
            .map(([label, entry]) => `${startCase(label)}: ${formatValue(entry)}`)
            .join(" | ")
        : "Structured metric values are available in this record.",
    metadata: descriptionEntries.slice(2, 5).map(([label, entry]) => ({
      label: startCase(label),
      value: formatValue(entry),
    })),
  };
}

function describeStructuredValue(value: JsonValue, index: number) {
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"} in this group.`;
  }

  if (isObject(value)) {
    return `${Object.keys(value).length} field${Object.keys(value).length === 1 ? "" : "s"} available in this group.`;
  }

  return `Structured value ${index + 1}`;
}

function buildStructuredMetadata(value: JsonValue) {
  if (Array.isArray(value)) {
    return [{ label: "Type", value: "Array" }];
  }

  if (isObject(value)) {
    return [{ label: "Type", value: "Object" }];
  }

  return [{ label: "Type", value: formatValue(value) }];
}
