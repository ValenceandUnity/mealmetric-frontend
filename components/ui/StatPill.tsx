"use client";

type StatPillProps = {
  label: string;
  value: string;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
};

export function StatPill({
  label,
  value,
  hint,
  active = false,
  disabled = false,
}: StatPillProps) {
  return (
    <div
      className={[
        "stat-pill",
        active ? "stat-pill--active" : "",
        disabled ? "stat-pill--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="stat-pill__label">{label}</p>
      <p className="stat-pill__value">{value}</p>
      {hint ? <p className="stat-pill__hint">{hint}</p> : null}
    </div>
  );
}
