"use client";

import Link from "next/link";

import { DetailCard } from "@/components/cards/DetailCard";
import type { MealPlanListItemView } from "@/lib/adapters/meal-plans";
import type { MealPlanSummary } from "@/lib/types/api";

type MealPlanCardProps = {
  mealPlan: MealPlanSummary | MealPlanListItemView;
  bookmarked?: boolean;
  bookmarkBusy?: boolean;
  onToggleBookmark?: (mealPlan: MealPlanSummary) => void;
  detailHrefBase?: string | null;
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MealPlanCard({
  mealPlan,
  bookmarked = false,
  bookmarkBusy = false,
  onToggleBookmark,
  detailHrefBase = "/client/meal-plans",
}: MealPlanCardProps) {
  const planId = "id" in mealPlan && typeof mealPlan.id === "string" ? mealPlan.id : null;
  const isTypedMealPlan = "vendor_name" in mealPlan;
  const title = "name" in mealPlan ? mealPlan.name : mealPlan.title;
  const description = mealPlan.description ?? "Meal-plan configuration available through the signed BFF flow.";
  const eyebrow = isTypedMealPlan ? mealPlan.vendor_name : (mealPlan.vendor ?? "Meal plan");
  const price = isTypedMealPlan ? formatPrice(mealPlan.total_price_cents) : mealPlan.price;
  const mealCount = isTypedMealPlan ? String(mealPlan.item_count) : mealPlan.mealCount;
  const vendorZipCode = isTypedMealPlan ? mealPlan.vendor_zip_code : null;

  return (
    <DetailCard
      eyebrow={eyebrow}
      title={title}
      description={description}
      metadata={
        <>
          <span>
            <strong>Price:</strong> {price}
          </span>
          <span>
            <strong>Meals:</strong> {mealCount}
          </span>
          {isTypedMealPlan ? (
            <span>
              <strong>ZIP:</strong> {vendorZipCode ?? "Unavailable"}
            </span>
          ) : null}
        </>
      }
      footer={
        <>
          {planId && detailHrefBase ? (
            <Link className="link-button" href={`${detailHrefBase}/${planId}`}>
              View plan
            </Link>
          ) : null}
          {isTypedMealPlan && onToggleBookmark ? (
            <button
              type="button"
              onClick={() => onToggleBookmark(mealPlan)}
              disabled={bookmarkBusy}
            >
              {bookmarkBusy
                ? "Saving..."
                : bookmarked
                  ? "Remove bookmark"
                  : "Bookmark"}
            </button>
          ) : null}
        </>
      }
    />
  );
}
