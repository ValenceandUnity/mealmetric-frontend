"use client";

import type { ReactNode } from "react";

import { DetailCard } from "@/components/cards/DetailCard";

type RecordCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  metadata: Array<{ label: string; value: string }>;
  footer?: ReactNode;
};

export function RecordCard({ eyebrow, title, description, metadata, footer }: RecordCardProps) {
  return (
    <DetailCard
      eyebrow={eyebrow}
      title={title}
      description={description}
      metadata={
        <>
          {metadata.map((item) => (
            <span key={`${item.label}-${item.value}`}>
              <strong>{item.label}:</strong> {item.value}
            </span>
          ))}
        </>
      }
      footer={footer}
    />
  );
}
