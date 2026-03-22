"use client";

import { TabSwitch } from "@/components/ui/TabSwitch";

export function Tabs<T extends string>({
  active,
  options,
  onChange,
}: {
  active: T;
  options: Array<{ value: T; label: string; disabled?: boolean }>;
  onChange: (value: T) => void;
}) {
  return <TabSwitch active={active} options={options} onChange={onChange} />;
}
