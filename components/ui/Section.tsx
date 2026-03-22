"use client";

import type { ReactNode } from "react";

import { SectionBlock } from "@/components/ui/SectionBlock";

type SectionProps = {
  title?: string;
  children: ReactNode;
};

export function Section({ title, children }: SectionProps) {
  return <SectionBlock title={title}>{children}</SectionBlock>;
}
