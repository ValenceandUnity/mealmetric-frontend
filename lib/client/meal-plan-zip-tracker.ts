"use client";

const ACTIVE_MEAL_PLAN_ZIPS_STORAGE_KEY = "mealmetric.client.meal-plans.active-zips";

function normalizeZipCodes(zipCodes: string[]): string[] {
  const normalizedZipCodes: string[] = [];
  const seen = new Set<string>();

  for (const zipCode of zipCodes) {
    const normalized = zipCode.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    normalizedZipCodes.push(normalized);
  }

  return normalizedZipCodes;
}

export function readActiveMealPlanZipCodes(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(ACTIVE_MEAL_PLAN_ZIPS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeZipCodes(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return [];
  }
}

export function writeActiveMealPlanZipCodes(zipCodes: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedZipCodes = normalizeZipCodes(zipCodes);
  if (normalizedZipCodes.length === 0) {
    window.sessionStorage.removeItem(ACTIVE_MEAL_PLAN_ZIPS_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(
    ACTIVE_MEAL_PLAN_ZIPS_STORAGE_KEY,
    JSON.stringify(normalizedZipCodes),
  );
}
