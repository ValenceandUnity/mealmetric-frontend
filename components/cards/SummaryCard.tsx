"use client";

type SummaryCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function SummaryCard({ label, value, hint }: SummaryCardProps) {
  return (
    <div className="stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {hint ? <p className="stat-card__hint">{hint}</p> : null}
    </div>
  );
}
