"use client";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

type ErrorBlockProps = {
  title: string;
  message: string;
};

export function ErrorBlock({ title, message }: ErrorBlockProps) {
  return (
    <div role="alert" aria-live="assertive">
      <Card as="section" className="status-block status-block--error">
        <PageHeader
          eyebrow="Attention"
          title={title}
          description={message}
          status={{ label: "Needs review", tone: "danger" }}
        />
      </Card>
    </div>
  );
}
