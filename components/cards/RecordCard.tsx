"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";

type RecordCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  metadata: Array<{ label: string; value: string }>;
  footer?: ReactNode;
};

export function RecordCard({ eyebrow, title, description, metadata, footer }: RecordCardProps) {
  return (
    <Card className="record-card">
      <ListRow eyebrow={eyebrow} title={title} description={description} metadata={metadata} />
      {footer ? <div className="action-row">{footer}</div> : null}
    </Card>
  );
}
