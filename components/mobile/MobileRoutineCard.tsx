import type { CSSProperties, ReactNode } from "react";

import { MobileCard } from "@/components/mobile/MobileCard";

type MobileRoutineCardProps = {
  title: string;
  subtitle?: string;
  taskCount: number;
  category?: string;
  gradient?: string;
  media?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function MobileRoutineCard({
  title,
  subtitle,
  taskCount,
  category,
  gradient,
  media,
  action,
  className,
}: MobileRoutineCardProps) {
  return (
    <MobileCard
      variant="image"
      className={["mobile-routine-card", className ?? ""].filter(Boolean).join(" ")}
      style={
        gradient
          ? ({ "--mobile-routine-gradient": gradient } as CSSProperties)
          : undefined
      }
    >
      {media ? media : <div className="mobile-routine-card__visual" aria-hidden="true" />}
      <div className="mobile-routine-card__content">
        <div className="mobile-routine-card__meta">
          {category ? <p className="mobile-routine-card__eyebrow">{category}</p> : null}
          <h3 className="mobile-routine-card__title">{title}</h3>
          {subtitle ? <p className="mobile-routine-card__subtitle">{subtitle}</p> : null}
        </div>
        <div className="mobile-routine-card__footer">
          <p className="mobile-routine-card__tasks">
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </p>
          {action}
        </div>
      </div>
    </MobileCard>
  );
}
