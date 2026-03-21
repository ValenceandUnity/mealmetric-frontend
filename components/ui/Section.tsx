"use client";

import type { ReactNode } from "react";

type SectionProps = {
  title?: string;
  children: ReactNode;
};

export function Section({ title, children }: SectionProps) {
  return (
    <section className="surface">
      {title ? <h2 className="section__title">{title}</h2> : null}
      <div className="grid">{children}</div>
    </section>
  );
}
