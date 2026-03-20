"use client";

import type { ReactNode } from "react";

type SectionProps = {
  title?: string;
  children: ReactNode;
};

export function Section({ title, children }: SectionProps) {
  return (
    <section
      style={{
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 20,
        background: "#111827",
        display: "grid",
        gap: 12,
      }}
    >
      {title ? <h3 style={{ margin: 0 }}>{title}</h3> : null}
      <div>{children}</div>
    </section>
  );
}
