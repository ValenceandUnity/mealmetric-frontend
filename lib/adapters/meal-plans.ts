import type { JsonValue } from "@/lib/types/api";

import { formatPrice, getArray, getId, isObject, pickNumber, pickOptionalText } from "@/lib/adapters/common";

export type MealPlanListItemView = {
  id: string | null;
  title: string;
  vendor: string | null;
  description: string;
  price: string;
  mealCount: string;
};

export type MealPlanDetailView = {
  summary: MealPlanListItemView;
  meals: string[];
  heroImageUrl: string | null;
  macros: {
    label: string;
    value: string;
  }[];
  includedMeals: {
    name: string;
    metadata: {
      label: string;
      value: string;
    }[];
  }[];
  vendorDetails: {
    label: string;
    value: string;
  }[];
};

function getMealItems(value: JsonValue | null): string[] {
  if (!isObject(value)) {
    return [];
  }

  const candidates = [value.meals, value.items, value.meal_items, value.included_meals];
  for (const candidate of candidates) {
    const items = getArray(candidate ?? null);
    if (items.length > 0) {
      return items.map((item, index) => pickOptionalText(item, ["name", "title"]) ?? `Meal ${index + 1}`);
    }
  }

  return [];
}

function getFirstText(value: JsonValue | null | undefined, keys: string[]): string | null {
  for (const key of keys) {
    if (!isObject(value)) {
      continue;
    }

    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

function getHeroImageUrl(value: JsonValue | null): string | null {
  const directImage = getFirstText(value, ["image_url", "image", "hero_image_url"]);
  if (directImage) {
    return directImage;
  }

  if (!isObject(value)) {
    return null;
  }

  const imageCandidates = getArray(value.images ?? null);
  for (const item of imageCandidates) {
    if (typeof item === "string" && item.trim().length > 0) {
      return item;
    }

    const imageUrl = getFirstText(item, ["url", "src", "image_url"]);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
}

function getMacros(value: JsonValue | null): { label: string; value: string }[] {
  const macroCandidates = [
    {
      label: "Protein",
      value: pickNumber(value, ["protein_grams", "protein", "total_protein"]),
    },
    {
      label: "Carbs",
      value: pickNumber(value, ["carbs_grams", "carbs", "carbohydrates", "total_carbs"]),
    },
    {
      label: "Fat",
      value: pickNumber(value, ["fat_grams", "fat", "total_fat"]),
    },
  ];

  return macroCandidates
    .filter((entry) => typeof entry.value === "number")
    .map((entry) => ({
      label: entry.label,
      value: `${entry.value}g`,
    }));
}

function getMealMetadata(item: JsonValue | null | undefined): { label: string; value: string }[] {
  const metadata: { label: string; value: string }[] = [];

  const category = pickOptionalText(item, ["category", "meal_type", "type"]);
  const portion = pickOptionalText(item, ["portion_size", "size"]);
  const description = pickOptionalText(item, ["description", "summary"]);
  const calories = pickNumber(item, ["calories", "total_calories"]);
  const servings = pickNumber(item, ["servings", "serving_count"]);
  const quantity = pickNumber(item, ["quantity"]);

  if (category) {
    metadata.push({ label: "Type", value: category });
  }

  if (portion) {
    metadata.push({ label: "Portion", value: portion });
  }

  if (typeof calories === "number") {
    metadata.push({ label: "Calories", value: `${calories}` });
  }

  if (typeof servings === "number") {
    metadata.push({ label: "Servings", value: `${servings}` });
  }

  if (typeof quantity === "number") {
    metadata.push({ label: "Quantity", value: `${quantity}` });
  }

  if (description) {
    metadata.push({ label: "Notes", value: description });
  }

  return metadata;
}

function getIncludedMeals(value: JsonValue | null): { name: string; metadata: { label: string; value: string }[] }[] {
  if (!isObject(value)) {
    return [];
  }

  const candidates = [value.meals, value.items, value.meal_items, value.included_meals];
  for (const candidate of candidates) {
    const items = getArray(candidate ?? null);
    if (items.length === 0) {
      continue;
    }

    return items.flatMap((item) => {
      if (typeof item === "string" && item.trim().length > 0) {
        return [{ name: item, metadata: [] }];
      }

      const name = pickOptionalText(item, ["name", "title"]);
      if (!name) {
        return [];
      }

      return [
        {
          name,
          metadata: getMealMetadata(item),
        },
      ];
    });
  }

  return [];
}

function getVendorDetails(value: JsonValue | null, fallbackVendorName: string | null): { label: string; value: string }[] {
  const details: { label: string; value: string }[] = [];

  const vendorName = pickOptionalText(value, ["vendor_name", "vendor"]) ?? fallbackVendorName;
  const zipCode = pickOptionalText(value, ["vendor_zip_code", "zip_code"]);
  const pickupLocation = pickOptionalText(value, ["pickup_location", "location"]);
  const pickupNotes = pickOptionalText(value, ["pickup_notes", "fulfillment_notes"]);

  if (vendorName) {
    details.push({ label: "Vendor", value: vendorName });
  }

  if (zipCode) {
    details.push({ label: "ZIP", value: zipCode });
  }

  if (pickupLocation) {
    details.push({ label: "Location", value: pickupLocation });
  }

  if (pickupNotes) {
    details.push({ label: "Notes", value: pickupNotes });
  }

  return details;
}

export function adaptMealPlanList(value: JsonValue | null): MealPlanListItemView[] {
  return getArray(value).map((item, index) => {
    const meals = getMealItems(item);

    return {
      id: getId(item),
      title: pickOptionalText(item, ["name", "title"]) ?? `Meal plan ${index + 1}`,
      vendor: pickOptionalText(item, ["vendor", "vendor_name"]),
      description:
        pickOptionalText(item, ["description", "summary"]) ??
        "Meal-plan configuration available through the signed BFF flow.",
      price: formatPrice(item),
      mealCount: meals.length > 0 ? `${meals.length} meals` : "Meal count unavailable",
    };
  });
}

export function adaptMealPlanDetail(value: JsonValue | null): MealPlanDetailView {
  const summary = adaptMealPlanList(value ? [value] : [])[0] ?? {
    id: null,
    title: "Meal plan detail",
    vendor: null,
    description: "No meal plan detail returned.",
    price: "Custom pricing",
    mealCount: "Meal count unavailable",
  };

  return {
    summary,
    meals: getMealItems(value),
    heroImageUrl: getHeroImageUrl(value),
    macros: getMacros(value),
    includedMeals: getIncludedMeals(value),
    vendorDetails: getVendorDetails(value, summary.vendor),
  };
}
