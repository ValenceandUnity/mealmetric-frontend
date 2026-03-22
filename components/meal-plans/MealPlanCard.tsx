"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ListRow } from "@/components/ui/ListRow";
import type { MealPlanListItemView } from "@/lib/adapters/meal-plans";
import type { MealPlanSummary } from "@/lib/types/api";

type MealPlanCardProps = {
  mealPlan: MealPlanSummary | MealPlanListItemView;
  bookmarked?: boolean;
  bookmarkBusy?: boolean;
  onToggleBookmark?: (mealPlan: MealPlanSummary) => void;
  detailHrefBase?: string | null;
  footer?: ReactNode;
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
  footer,
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
    <Card className="meal-plan-card" active={bookmarked} disabled={bookmarkBusy}>
      <ListRow
        eyebrow={eyebrow}
        title={title}
        description={description}
        metadata={[
          { label: "Price", value: price },
          { label: "Meals", value: mealCount },
          ...(isTypedMealPlan ? [{ label: "ZIP", value: vendorZipCode ?? "Unavailable" }] : []),
        ]}
        status={bookmarked ? { label: "Saved", tone: "success" } : undefined}
        active={bookmarked}
        disabled={bookmarkBusy}
      />
      <div className="meal-plan-card__chips">
        <Chip tone="accent">{price}</Chip>
        <Chip tone="muted">
          {typeof mealCount === "string" && mealCount.includes("meal")
            ? mealCount
            : `${mealCount} meals`}
        </Chip>
      </div>
      <ActionRow>
        {planId && detailHrefBase ? (
          <Link className="link-button" href={`${detailHrefBase}/${planId}`}>
            View plan
          </Link>
        ) : null}
        {isTypedMealPlan && onToggleBookmark ? (
          <button type="button" onClick={() => onToggleBookmark(mealPlan)} disabled={bookmarkBusy}>
            {bookmarkBusy ? "Saving..." : bookmarked ? "Remove bookmark" : "Bookmark"}
          </button>
        ) : null}
      </ActionRow>
      {footer ? <ActionRow>{footer}</ActionRow> : null}
    </Card>
  );
}
