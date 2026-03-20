"use client";

import type { JsonObject, JsonValue } from "@/lib/types/api";

function isObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getPreviewEntries(value: JsonValue, limit = 6): Array<[string, JsonValue]> {
  if (!isObject(value)) {
    return [];
  }

  return Object.entries(value).slice(0, limit);
}

export function getArrayItems(value: JsonValue): JsonValue[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (isObject(value) && Array.isArray(value.items)) {
    return value.items;
  }

  return [];
}

export function getEntityId(value: JsonValue): string | null {
  if (!isObject(value)) {
    return null;
  }

  const idCandidates = [value.id, value.assignment_id, value.training_package_id, value.meal_plan_id];

  for (const candidate of idCandidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  return null;
}

export function JsonPreview({
  value,
  emptyMessage = "No data returned.",
}: {
  value: JsonValue;
  emptyMessage?: string;
}) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p>{emptyMessage}</p>;
    }

    return (
      <ul>
        {value.slice(0, 3).map((item, index) => (
          <li key={index}>
            <code>{JSON.stringify(item)}</code>
          </li>
        ))}
      </ul>
    );
  }

  if (isObject(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return <p>{emptyMessage}</p>;
    }

    return (
      <ul>
        {entries.slice(0, 6).map(([key, entryValue]) => (
          <li key={key}>
            <strong>{key}:</strong> <code>{JSON.stringify(entryValue)}</code>
          </li>
        ))}
      </ul>
    );
  }

  return <code>{JSON.stringify(value)}</code>;
}
