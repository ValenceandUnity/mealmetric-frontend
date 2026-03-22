"use client";

type TabOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export function TabSwitch<T extends string>({
  active,
  options,
  onChange,
  ariaLabel = "Sections",
}: {
  active: T;
  options: TabOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="tab-switch" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="tab-switch__button"
          aria-pressed={active === option.value}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
