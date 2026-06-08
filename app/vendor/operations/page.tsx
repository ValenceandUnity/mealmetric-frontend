"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/LogoutButton";
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

type VendorOperationsStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
};

type VendorOperationsCapabilityCardProps = {
  title: string;
  description: string;
  badgeLabel: string;
};

type VendorOperationsActionCardProps = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  badgeLabel: string;
  tone?: "purple" | "yellow";
};

const capabilityCards: VendorOperationsCapabilityCardProps[] = [
  {
    title: "Pickup operations",
    description: "Pickup coordination is not available yet on this route because the current vendor surface does not expose a live operations workflow.",
    badgeLabel: "Not available yet",
  },
  {
    title: "Fulfillment workflow",
    description: "Fulfillment controls remain unavailable here until a dedicated vendor operations contract exists.",
    badgeLabel: "Coming soon",
  },
  {
    title: "Vendor order queue",
    description: "No live order queue is surfaced on this page today, and no placeholder counts are implied.",
    badgeLabel: "Not wired",
  },
  {
    title: "Inventory readiness",
    description: "Inventory readiness remains unavailable until the product exposes a supported vendor operations workflow.",
    badgeLabel: "Placeholder",
  },
];

const workspaceActions: VendorOperationsActionCardProps[] = [
  {
    title: "Vendor dashboard",
    description: "Return to the existing vendor overview route without changing the current dashboard behavior.",
    href: "/vendor",
    ctaLabel: "Open dashboard",
    badgeLabel: "Overview",
  },
  {
    title: "Meal plans",
    description: "Open the existing vendor catalog workspace for the current read-only meal-plan inventory.",
    href: "/vendor/meal-plans",
    ctaLabel: "Open meal plans",
    badgeLabel: "Catalog",
    tone: "purple",
  },
  {
    title: "Metrics",
    description: "Open the existing vendor metrics route for the current read-only performance summary.",
    href: "/vendor/metrics",
    ctaLabel: "Open metrics",
    badgeLabel: "Metrics",
  },
  {
    title: "Account",
    description: "Open the existing vendor account route for read-only account context and the existing sign-out action.",
    href: "/vendor/account",
    ctaLabel: "Open account",
    badgeLabel: "Account",
    tone: "purple",
  },
];

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function VendorOperationsStateCard({
  title,
  message,
  action,
  role = "status",
}: VendorOperationsStateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy" role={role} aria-live="polite">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

function VendorOperationsCapabilityCard({
  title,
  description,
  badgeLabel,
}: VendorOperationsCapabilityCardProps) {
  return (
    <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
      <div className="mobile-pt-client-card__header">
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">Future capability</p>
          <h3 className="mobile-section__title">{title}</h3>
          <p className="mobile-section__description">{description}</p>
        </div>
        <span className="mobile-pill mobile-pill--purple">{badgeLabel}</span>
      </div>
    </MobileCard>
  );
}

function VendorOperationsActionCard({
  title,
  description,
  href,
  ctaLabel,
  badgeLabel,
  tone = "yellow",
}: VendorOperationsActionCardProps) {
  return (
    <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
      <div className="mobile-pt-client-card__header">
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">Vendor route</p>
          <h3 className="mobile-section__title">{title}</h3>
          <p className="mobile-section__description">{description}</p>
        </div>
        <span className={`mobile-pill ${tone === "purple" ? "mobile-pill--purple" : "mobile-pill--yellow"}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="mobile-pt-actions">
        <ActionPill href={href} tone={tone}>{ctaLabel}</ActionPill>
      </div>
    </MobileCard>
  );
}

export default function VendorOperationsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "vendor",
    unauthenticatedRedirectTo: "/login",
  });

  if (status === "loading") {
    return (
      <LoadingBlock
        title="Loading vendor operations"
        message="Validating your authenticated MealMetric shell."
      />
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="This route requires an authenticated session for the matching role."
      />
    );
  }

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="Vendor Operations"
      subtitle="Placeholder workspace | operations coming soon"
      notificationSlot={<ActionPill href="/vendor/account" tone="purple">Account</ActionPill>}
      topHubAction={<ActionPill href="/vendor">Vendor dashboard</ActionPill>}
      activePath="/vendor/operations"
    >
      <MobileSection
        eyebrow="Operations status"
        title="Operations are not wired on this route yet"
        description="Operational vendor tooling is intentionally blocked in UI-1 because the current BFF surface does not expose a dedicated operations workflow."
        action={<ActionPill href="/vendor/metrics">Metrics</ActionPill>}
      >
        <VendorOperationsStateCard
          title="Route intentionally held at placeholder level"
          message="This destination stays visible so the authenticated shell remains coherent, but the current product scope keeps operational workflows in unsupported status until a dedicated vendor operations contract exists."
          action={<ActionPill href="/vendor/meal-plans" tone="purple">Meal plans</ActionPill>}
        />
      </MobileSection>

      <MobileSection
        eyebrow="Future areas"
        title="Placeholder-only operational capabilities"
        description="These cards are intentionally non-interactive. They do not represent live queues, metrics, staffing, dispatch, inventory, or fulfillment data."
      >
        <div className="mobile-pt-detail-stack">
          {capabilityCards.map((card) => (
            <VendorOperationsCapabilityCard
              key={card.title}
              title={card.title}
              description={card.description}
              badgeLabel={card.badgeLabel}
            />
          ))}
        </div>
      </MobileSection>

      <MobileSection
        eyebrow="Access and exit"
        title="Current supported actions"
        description="The only live action preserved here is the existing sign-out flow. No operational mutation controls are introduced."
        action={<ActionPill href="/vendor" tone="purple">Back to vendor</ActionPill>}
      >
        <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
          <div className="mobile-section__copy">
            <p className="mobile-section__eyebrow">Existing action</p>
            <h3 className="mobile-section__title">Sign out</h3>
            <p className="mobile-section__description">
              Signing out continues to use the existing auth BFF flow. No order, pickup, kitchen, staff, inventory, or fulfillment mutation is available on this page.
            </p>
          </div>
          <div className="mobile-pt-actions">
            <LogoutButton />
          </div>
        </MobileCard>
      </MobileSection>

      <MobileSection
        eyebrow="Workspace"
        title="Existing vendor routes"
        description="Use supported vendor pages while operations remains placeholder-only."
      >
        <div className="mobile-pt-detail-stack">
          {workspaceActions.map((action) => (
            <VendorOperationsActionCard
              key={action.href}
              title={action.title}
              description={action.description}
              href={action.href}
              ctaLabel={action.ctaLabel}
              badgeLabel={action.badgeLabel}
              tone={action.tone}
            />
          ))}
        </div>
      </MobileSection>
    </MobileAppShell>
  );
}
