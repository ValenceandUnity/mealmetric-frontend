import type { JsonObject, JsonValue } from "@/lib/types/api";

export type SummaryValue = {
  label: string;
  value: string;
  hint?: string;
};

export type DetailValue = {
  label: string;
  value: string;
};

export function isObject(value: JsonValue | null | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getArray(value: JsonValue | null | undefined): JsonValue[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isObject(value)) {
    return [];
  }

  const candidates = [value.items, value.results, value.data, value.rows];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export function getId(value: JsonValue | null | undefined): string | null {
  if (!isObject(value)) {
    return null;
  }

  const candidates = [
    value.id,
    value.assignment_id,
    value.client_id,
    value.training_package_id,
    value.meal_plan_id,
    value.recommendation_id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

export function pickText(
  value: JsonValue | null | undefined,
  keys: string[],
  fallback = "Unavailable",
): string {
  if (!isObject(value)) {
    return fallback;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return fallback;
}

export function pickOptionalText(value: JsonValue | null | undefined, keys: string[]): string | null {
  const result = pickText(value, keys, "");
  return result.length > 0 ? result : null;
}

export function pickNumber(value: JsonValue | null | undefined, keys: string[]): number | null {
  if (!isObject(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function formatValue(value: JsonValue | null | undefined): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null || typeof value === "undefined") {
    return "Unavailable";
  }

  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  return `${Object.keys(value).length} field${Object.keys(value).length === 1 ? "" : "s"}`;
}

export function extractSummary(value: JsonValue | null | undefined, max = 4): SummaryValue[] {
  if (!isObject(value)) {
    return [];
  }

  return Object.entries(value)
    .filter(([, entry]) => ["string", "number", "boolean"].includes(typeof entry))
    .slice(0, max)
    .map(([label, entry]) => ({
      label: startCase(label),
      value: formatValue(entry),
    }));
}

export function extractDetails(value: JsonValue | null | undefined, max = 6): DetailValue[] {
  if (!isObject(value)) {
    return [];
  }

  return Object.entries(value)
    .slice(0, max)
    .map(([label, entry]) => ({
      label: startCase(label),
      value: formatValue(entry),
    }));
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (start && end) {
    return `${start} to ${end}`;
  }

  return start ?? end ?? "Dates not provided";
}

export function formatPrice(value: JsonValue | null | undefined): string {
  const cents = pickNumber(value, ["total_price_cents"]);
  if (typeof cents === "number") {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return pickText(value, ["price"], "Custom pricing");
}

export function startCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
