"use client";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

type LoadingBlockProps = {
  title: string;
  message?: string;
};

export function LoadingBlock({ title, message }: LoadingBlockProps) {
  return (
    <div role="status" aria-live="polite">
      <Card as="section" className="status-block status-block--loading" variant="soft">
        <PageHeader
          eyebrow="Loading"
          title={title}
          description={message}
          status={{ label: "In progress", tone: "accent" }}
        />
        <div className="status-block__pulse" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </Card>
    </div>
  );
}
