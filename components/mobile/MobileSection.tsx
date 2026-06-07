import type { ReactNode } from "react";

import { MobileCard, type MobileCardVariant } from "@/components/mobile/MobileCard";

type MobileSectionProps = {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: MobileCardVariant;
  scroll?: boolean;
};

export function MobileSection({
  children,
  title,
  eyebrow,
  description,
  action,
  className,
  contentClassName,
  variant = "soft",
  scroll = false,
}: MobileSectionProps) {
  return (
    <MobileCard as="section" variant={variant} className={["mobile-section", className ?? ""].filter(Boolean).join(" ")}>
      {title || eyebrow || description || action ? (
        <div className="mobile-section__header">
          <div className="mobile-section__header-row">
            <div className="mobile-section__copy">
              {eyebrow ? <p className="mobile-section__eyebrow">{eyebrow}</p> : null}
              {title ? <h2 className="mobile-section__title">{title}</h2> : null}
            </div>
            {action}
          </div>
          {description ? <p className="mobile-section__description">{description}</p> : null}
        </div>
      ) : null}
      <div
        className={[
          "mobile-section__content",
          scroll ? "mobile-section__content--scroll mobile-scroll-row" : "",
          contentClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </MobileCard>
  );
}
