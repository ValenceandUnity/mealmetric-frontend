"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

type SectionBlockProps = {
  title?: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function SectionBlock({
  title,
  description,
  eyebrow,
  actions,
  children,
}: SectionBlockProps) {
  return (
    <Card as="section" className="section-block">
      {title ? (
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={actions}
        />
      ) : null}
      <div className="section-block__content">{children}</div>
    </Card>
  );
}
