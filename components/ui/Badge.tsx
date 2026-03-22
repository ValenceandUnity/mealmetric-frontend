"use client";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: BadgeTone;
}) {
  return <span className={`badge badge--${tone}`}>{label}</span>;
}
