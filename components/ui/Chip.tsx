"use client";

import type { ReactNode } from "react";

type ChipTone = "neutral" | "accent" | "muted";

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: ChipTone;
}) {
  return <span className={`chip chip--${tone}`}>{children}</span>;
}
