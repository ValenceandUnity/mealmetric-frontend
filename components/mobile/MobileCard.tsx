import type { CSSProperties, ReactNode } from "react";

export type MobileCardVariant = "default" | "soft" | "accent" | "image" | "action";
export type MobileCardPadding = "compact" | "default" | "large";

type MobileCardProps = {
  children: ReactNode;
  className?: string;
  variant?: MobileCardVariant;
  padding?: MobileCardPadding;
  as?: "article" | "section" | "div" | "aside";
  style?: CSSProperties;
};

export function MobileCard({
  children,
  className,
  variant = "default",
  padding = "default",
  as = "article",
  style,
}: MobileCardProps) {
  const Tag = as;
  const classes = [
    "mobile-card",
    `mobile-card--${variant}`,
    padding === "default" ? "" : `mobile-card--${padding}`,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} style={style}>
      {children}
    </Tag>
  );
}
