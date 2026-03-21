import type { JsonValue } from "@/lib/types/api";

import { formatPrice, getArray, getId, isObject, pickOptionalText } from "@/lib/adapters/common";

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
  };
}
