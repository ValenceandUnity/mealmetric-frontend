"use client";

import { MetricCard } from "@/components/metrics/MetricCard";

type SummaryCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function SummaryCard({ label, value, hint }: SummaryCardProps) {
  return <MetricCard label={label} value={value} hint={hint} />;
}
