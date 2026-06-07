import type { JsonValue, SessionUser } from "@/lib/types/api";

import {
  getArray,
  isObject,
  pickNumber,
  pickOptionalText,
} from "@/lib/adapters/common";

const numberFormatter = new Intl.NumberFormat("en-US");

const gradients = [
  "linear-gradient(135deg, rgba(139, 92, 246, 0.92), rgba(56, 24, 109, 0.92))",
  "linear-gradient(135deg, rgba(250, 204, 21, 0.82), rgba(120, 53, 15, 0.92))",
  "linear-gradient(135deg, rgba(79, 70, 229, 0.9), rgba(30, 41, 59, 0.94))",
  "linear-gradient(135deg, rgba(168, 85, 247, 0.88), rgba(91, 33, 182, 0.94))",
];

export function formatDisplayNameFromUser(user?: SessionUser | null): string {
  const localPart = user?.email.split("@")[0]?.trim() ?? "";
  if (!localPart) {
    return "Welcome back";
  }

  const pieces = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((piece) => `${piece.charAt(0).toUpperCase()}${piece.slice(1)}`);

  return pieces[0] ? `Hi, ${pieces[0]}` : "Welcome back";
}

export function formatNumber(value: number | null | undefined, fallback = "0"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return numberFormatter.format(value);
}

export function formatCalories(value: number | null | undefined, fallback = "No calories"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return `${numberFormatter.format(value)} cal`;
}

export function formatPercentage(value: string | number | null | undefined, fallback = "No data"): string {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return fallback;
    }
    if (normalized.endsWith("%")) {
      return normalized;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      return normalized;
    }

    return formatPercentage(parsed, fallback);
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const resolved = value > 0 && value <= 1 ? value * 100 : value;
  return `${resolved.toFixed(resolved % 1 === 0 ? 0 : 1)}%`;
}

export function formatPriceCents(value: number | null | undefined, fallback = "Price unavailable"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return `$${(value / 100).toFixed(2)}`;
}

export function formatDateLabel(
  value: string | null | undefined,
  fallback = "Date unavailable",
): string {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function formatDateTimeLabel(
  value: string | null | undefined,
  fallback = "No date yet",
): string {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function formatCountLabel(
  value: number | null | undefined,
  singular: string,
  plural = `${singular}s`,
): string {
  const resolved = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `${resolved} ${resolved === 1 ? singular : plural}`;
}

export function parseLeadingCount(label: string | null | undefined): number {
  if (!label) {
    return 0;
  }

  const match = label.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

export function getNumberLike(value: JsonValue | null | undefined, keys: string[]): number | null {
  if (!isObject(value)) {
    return null;
  }

  const direct = pickNumber(value, keys);
  if (direct !== null) {
    return direct;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string") {
      const parsed = Number(candidate.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export function getTextLike(value: JsonValue | null | undefined, keys: string[]): string | null {
  return pickOptionalText(value, keys);
}

export function getNestedArray(value: JsonValue | null | undefined, keys: string[]): JsonValue[] {
  if (!isObject(value)) {
    return [];
  }

  for (const key of keys) {
    const candidate = getArray(value[key]);
    if (candidate.length > 0) {
      return candidate;
    }
  }

  return [];
}

export function hasObjectFields(value: JsonValue | null | undefined): boolean {
  return isObject(value) && Object.keys(value).length > 0;
}

export function getGradient(index: number): string {
  return gradients[index % gradients.length] ?? gradients[0];
}
