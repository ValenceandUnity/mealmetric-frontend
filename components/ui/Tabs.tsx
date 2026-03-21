"use client";

type TabOption<T extends string> = {
  value: T;
  label: string;
};

export function Tabs<T extends string>({
  active,
  options,
  onChange,
}: {
  active: T;
  options: TabOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="tab-bar" role="tablist" aria-label="Sections">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="tab-bar__button"
          aria-pressed={active === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
