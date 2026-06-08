"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type ScheduleStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

const SCHEDULE_LINKS: Array<{
  href: string;
  label: string;
  tone: "purple" | "yellow";
}> = [
  { href: "/client/meal-plans", label: "Home", tone: "purple" },
  { href: "/client/meal-plans/schedule", label: "Schedule", tone: "yellow" },
  { href: "/client/meal-plans/search", label: "Search", tone: "yellow" },
  { href: "/client/meal-plans/bookmark", label: "Bookmark", tone: "yellow" },
];

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function ScheduleStateCard({
  title,
  message,
  action,
}: ScheduleStateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy" role="status" aria-live="polite">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

export default function ClientMealPlansSchedulePage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  if (status === "loading") {
    return <LoadingBlock title="Loading meal plan schedule" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="Meal plan schedule requires an authenticated client session."
      />
    );
  }

  return (
    <MobileAppShell
      user={user}
      activePath="/client/meal-plans"
      greeting={formatDisplayNameFromUser(user)}
      title="Meal plan schedule"
      subtitle="Upcoming scheduling stays limited until dedicated meal-plan schedule data is exposed through the protected client workspace."
      topHubAction={<ActionPill href="/client/meal-plans" tone="purple">Back to plans</ActionPill>}
    >
      <MobileSection
        eyebrow="Workspace"
        title="Meal-plan links"
        description="These links preserve the existing meal-plan home, schedule, search, and bookmark pages."
      >
        <div className="mobile-pt-actions">
          {SCHEDULE_LINKS.map((item) => (
            <ActionPill key={item.href} href={item.href} tone={item.tone}>
              {item.label}
            </ActionPill>
          ))}
        </div>
      </MobileSection>

      <MobileSection
        eyebrow="Overview"
        title="Upcoming meals and pickups"
        description="The current client workspace does not expose dedicated schedule, pickup, subscription, or order data for this page yet."
      >
        <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
          <div className="mobile-pt-client-card__header">
            <div className="mobile-section__copy">
              <p className="mobile-section__eyebrow">Current schedule mode</p>
              <h3 className="mobile-section__title">Placeholder only</h3>
              <p className="mobile-section__description">
                This mobile rebuild keeps the existing protected placeholder behavior without inventing unsupported calendar or fulfillment workflows.
              </p>
            </div>
            <span className="mobile-pill mobile-pill--yellow">No live schedule data</span>
          </div>

          <dl className="mobile-pt-fact-grid">
            <div>
              <dt>Client access</dt>
              <dd>Protected session required</dd>
            </div>
            <div>
              <dt>Schedule request</dt>
              <dd>Not requested here</dd>
            </div>
            <div>
              <dt>Upcoming meals</dt>
              <dd>Awaiting supported payload</dd>
            </div>
            <div>
              <dt>Mutations</dt>
              <dd>None added</dd>
            </div>
          </dl>
        </MobileCard>
      </MobileSection>

      <MobileSection
        eyebrow="Status"
        title="Schedule view is not wired yet"
        description="Assigned and upcoming scheduling views stay limited until the meal plan workspace exposes dedicated schedule data."
      >
        <ScheduleStateCard
          title="No upcoming meals are available here yet"
          message="This page remains a safe placeholder so the meal-plan workspace keeps coherent navigation without inventing unsupported schedule behavior."
          action={<ActionPill href="/client/meal-plans" tone="yellow">Browse meal plans</ActionPill>}
        />
      </MobileSection>
    </MobileAppShell>
  );
}
