"use client";

import type { ReactNode } from "react";

type CardVariant = "default" | "soft" | "accent" | "ghost";

type CardProps = {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  as?: "article" | "section" | "div";
};

export function Card({
  children,
  className,
  variant = "default",
  active = false,
  disabled = false,
  loading = false,
  as = "article",
}: CardProps) {
  const Tag = as;
  const classes = [
    "card",
    `card--${variant}`,
    active ? "card--active" : "",
    disabled ? "card--disabled" : "",
    loading ? "card--loading" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <Tag className={classes}>{children}</Tag>;
}
