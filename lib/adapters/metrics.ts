import type { JsonValue } from "@/lib/types/api";

import {
  extractDetails,
  extractSummary,
  formatValue,
  isObject,
  startCase,
} from "@/lib/adapters/common";

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
