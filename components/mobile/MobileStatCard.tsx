import type { CSSProperties, ReactNode } from "react";

import { MobileCard } from "@/components/mobile/MobileCard";

type MobileStatCardProps = {
  label: string;
  value: string | number;
  target?: string | number;
  unit?: string;
  icon?: ReactNode;
  progressText?: string;
  className?: string;
};

function toNumber(value: string | number | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function MobileStatCard({
  label,
  value,
  target,
  unit,
  icon,
  progressText,
  className,
}: MobileStatCardProps) {
  const numericValue = toNumber(value);
  const numericTarget = toNumber(target);
  const progress =
    numericValue !== null && numericTarget !== null && numericTarget > 0
      ? Math.max(0, Math.min(100, (numericValue / numericTarget) * 100))
      : null;

  return (
    <MobileCard variant="accent" className={["mobile-stat-card", className ?? ""].filter(Boolean).join(" ")}>
      <div className="mobile-stat-card__header">
        <p className="mobile-stat-card__label">{label}</p>
        {icon ? <span className="mobile-stat-card__icon">{icon}</span> : null}
      </div>
      <div className="mobile-stat-card__value-row">
        <div className="mobile-stat-card__summary">
          <p className="mobile-stat-card__value">{value}</p>
          {unit ? <span className="mobile-stat-card__unit">{unit}</span> : null}
        </div>
        {target !== undefined ? <p className="mobile-stat-card__target">Target {target}</p> : null}
      </div>
      {progress !== null ? (
        <div className="mobile-stat-card__meter" aria-label={`${label} progress`}>
          <div className="mobile-stat-card__bar" aria-hidden="true">
            <div
              className="mobile-stat-card__bar-fill"
              style={{ "--mobile-progress": `${progress}%`, width: `${progress}%` } as CSSProperties}
            />
          </div>
          {progressText ? <p className="mobile-stat-card__progress-text">{progressText}</p> : null}
        </div>
      ) : progressText ? (
        <p className="mobile-stat-card__progress-text">{progressText}</p>
      ) : null}
    </MobileCard>
  );
}
