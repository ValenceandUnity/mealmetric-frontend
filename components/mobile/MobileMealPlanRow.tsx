import type { ReactNode } from "react";

import { MobileCard } from "@/components/mobile/MobileCard";

type MobileMealPlanRowProps = {
  name: string;
  vendorName: string;
  calories: string | number;
  price: string | number;
  status?: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function MobileMealPlanRow({
  name,
  vendorName,
  calories,
  price,
  status,
  badge,
  action,
  className,
}: MobileMealPlanRowProps) {
  const badgeContent =
    badge ?? (status ? <span className="mobile-pill mobile-pill--purple">{status}</span> : null);

  return (
    <MobileCard variant="soft" className={["mobile-meal-plan-row", className ?? ""].filter(Boolean).join(" ")}>
      <div className="mobile-meal-plan-row__media" aria-hidden="true">
        <div className="mobile-meal-plan-row__media-grid" />
      </div>
      <div className="mobile-meal-plan-row__content">
        <div className="mobile-meal-plan-row__header">
          <div className="mobile-meal-plan-row__meta">
            <p className="mobile-meal-plan-row__eyebrow">Meal plan</p>
            <h3 className="mobile-meal-plan-row__title">{name}</h3>
          </div>
          {badgeContent}
        </div>
        <div className="mobile-meal-plan-row__details">
          <p className="mobile-meal-plan-row__vendor">{vendorName}</p>
          <div className="mobile-meal-plan-row__stats">
            <span className="mobile-meal-plan-row__metric">{calories} cal</span>
          </div>
        </div>
      </div>
      <div className="mobile-meal-plan-row__actions">
        <p className="mobile-meal-plan-row__price">{price}</p>
        {action}
      </div>
    </MobileCard>
  );
}
