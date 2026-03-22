"use client";

import { Card } from "@/components/ui/Card";

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <Card className="empty-state" variant="ghost" as="div">
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__copy">{message}</p>
    </Card>
  );
}
