"use client";

import type { ReactNode } from "react";

import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

type FeedbackTone = "info" | "success" | "warning" | "error";

type FeedbackBannerProps = {
  tone?: FeedbackTone;
  title: string;
  message: string;
  actions?: ReactNode;
};

const FEEDBACK_STATUS: Record<
  FeedbackTone,
  { label: string; tone: "accent" | "success" | "warning" | "danger"; eyebrow: string }
> = {
  info: { label: "In progress", tone: "accent", eyebrow: "Update" },
  success: { label: "Complete", tone: "success", eyebrow: "Success" },
  warning: { label: "Review", tone: "warning", eyebrow: "Attention" },
  error: { label: "Needs review", tone: "danger", eyebrow: "Attention" },
};

export function FeedbackBanner({
  tone = "info",
  title,
  message,
  actions,
}: FeedbackBannerProps) {
  const status = FEEDBACK_STATUS[tone];
  const liveRole = tone === "error" ? "alert" : "status";
  const livePoliteness = tone === "error" ? "assertive" : "polite";

  return (
    <div role={liveRole} aria-live={livePoliteness}>
      <Card as="section" className={`feedback-banner feedback-banner--${tone}`} variant="soft">
        <PageHeader
          eyebrow={status.eyebrow}
          title={title}
          description={message}
          status={{ label: status.label, tone: status.tone }}
        />
        {actions ? <ActionRow>{actions}</ActionRow> : null}
      </Card>
    </div>
  );
}
