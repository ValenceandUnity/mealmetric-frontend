"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, VendorMetricsPayload } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import {
  adaptVendorMetricsView,
  type MobileVendorActionView,
  type MobileVendorMetricsView,
} from "@/lib/view-models/vendor";

type VendorMetricsApiResponse = ApiResponse<VendorMetricsPayload>;

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type VendorMetricsStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
};

type VendorMetricsActionCardProps = {
  action: MobileVendorActionView;
};

type VendorMetricsHeroCardProps = {
  view: MobileVendorMetricsView;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function VendorMetricsStateCard({
  title,
  message,
  action,
  role = "status",
}: VendorMetricsStateCardProps) {
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

function VendorMetricsActionCard({ action }: VendorMetricsActionCardProps) {
  return (
    <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
      <div className="mobile-pt-client-card__header">
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">Vendor route</p>
          <h3 className="mobile-section__title">{action.title}</h3>
          <p className="mobile-section__description">{action.description}</p>
        </div>
        <span className={`mobile-pill ${action.tone === "purple" ? "mobile-pill--purple" : "mobile-pill--yellow"}`}>
          {action.badgeLabel}
        </span>
      </div>

      <div className="mobile-pt-actions">
        <ActionPill href={action.href} tone={action.tone}>{action.ctaLabel}</ActionPill>
      </div>
    </MobileCard>
  );
}

function VendorMetricsHeroCard({ view }: VendorMetricsHeroCardProps) {
  return (
    <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
      <div className="mobile-pt-client-card__header">
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">Metrics route</p>
          <h2 className="mobile-section__title">{view.vendorName}</h2>
          <p className="mobile-section__description">{view.heroDescription}</p>
        </div>
        <span className="mobile-pill mobile-pill--purple">{view.vendorZipLabel}</span>
      </div>

      <dl className="mobile-pt-fact-grid">
        <div>
          <dt>Total meal plans</dt>
          <dd>{view.totalMealPlansLabel}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>{view.publishedMealPlansLabel}</dd>
        </div>
        <div>
          <dt>Draft</dt>
          <dd>{view.draftMealPlansLabel}</dd>
        </div>
        <div>
          <dt>Availability entries</dt>
          <dd>{view.availabilityEntriesLabel}</dd>
        </div>
        <div>
          <dt>Open pickup windows</dt>
          <dd>{view.openPickupWindowsLabel}</dd>
        </div>
        <div>
          <dt>Vendor ZIP</dt>
          <dd>{view.vendorZipLabel}</dd>
        </div>
      </dl>

      <div className="mobile-pt-actions">
        <ActionPill href="/vendor">Vendor dashboard</ActionPill>
        <ActionPill href="/vendor/meal-plans" tone="purple">Meal plans</ActionPill>
      </div>
    </MobileCard>
  );
}

export default function VendorMetricsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "vendor",
    unauthenticatedRedirectTo: "/login",
  });

  const [metrics, setMetrics] = useState<VendorMetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || user?.role !== "vendor") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch("/api/vendor/metrics", { cache: "no-store" });
        const payload = (await response.json()) as VendorMetricsApiResponse;
        if (!active) {
          return;
        }
        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          return;
        }
        setMetrics(payload.data);
      } catch {
        if (active) {
          setMetrics(null);
          setErrorMessage("Unable to load vendor metrics.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [status, user]);

  if (status === "loading") {
    return <LoadingBlock title="Loading vendor metrics" message="Validating your vendor session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Vendor access requires an authenticated vendor session." />;
  }

  const view = adaptVendorMetricsView({ metrics });
  const showLoadingState = loading && !metrics && !errorMessage;

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title={view.title}
      subtitle={view.subtitle}
      notificationSlot={<ActionPill href="/vendor/account" tone="purple">Account</ActionPill>}
      topHubAction={<ActionPill href="/vendor">Vendor dashboard</ActionPill>}
      activePath="/vendor/metrics"
    >
      {errorMessage ? (
        <MobileSection
          eyebrow="Metrics sync"
          title="Vendor metrics unavailable"
          description="This mobile metrics page stays on the protected vendor BFF route and does not fall back to direct backend calls."
        >
          <VendorMetricsStateCard
            title="Unable to load metrics"
            message={errorMessage}
            action={<ActionPill href="/vendor">Vendor dashboard</ActionPill>}
            role="alert"
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading vendor metrics"
          description="Fetching vendor metrics through the existing vendor BFF route."
        >
          <VendorMetricsStateCard
            title="Refreshing vendor metrics"
            message="Vendor metrics are loading through the current signed frontend-to-BFF path."
          />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <MobileSection
            eyebrow="Metrics overview"
            title="Vendor performance summary"
            description="This mobile view preserves the existing vendor metrics semantics and keeps the route read-only."
            action={<ActionPill href="/vendor/meal-plans">Meal plans</ActionPill>}
          >
            {view.hasMetrics ? (
              <>
                <VendorMetricsHeroCard view={view} />
                {view.summaryCards.map((card) => (
                  <MobileStatCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    progressText={card.progressText}
                  />
                ))}
              </>
            ) : (
              <VendorMetricsStateCard
                title={view.unavailableTitle}
                message={view.unavailableMessage}
                action={<ActionPill href="/vendor">Vendor dashboard</ActionPill>}
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Catalog health"
            title="Publication and pickup coverage"
            description="Published versus draft counts, availability entries, and open pickup windows remain sourced only from real vendor metrics fields."
            action={<ActionPill href="/vendor">Vendor dashboard</ActionPill>}
          >
            {view.hasMetrics ? (
              view.healthCards.map((card) => (
                <MobileStatCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  target={card.target}
                  progressText={card.progressText}
                />
              ))
            ) : (
              <VendorMetricsStateCard
                title="Catalog health unavailable"
                message="Publication and pickup coverage requires summary data from the existing vendor metrics route."
                action={<ActionPill href="/vendor/meal-plans">Meal plans</ActionPill>}
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Workspace"
            title="Existing vendor routes"
            description="These action cards open existing vendor pages only. No new metrics mutations or operational workflows are introduced here."
          >
            <div className="mobile-pt-detail-stack">
              {view.actions.map((action) => (
                <VendorMetricsActionCard key={action.href} action={action} />
              ))}
            </div>
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
