"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, VendorMePayload } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import {
  adaptVendorAccountView,
  type MobileVendorActionView,
  type MobileVendorAccountView,
} from "@/lib/view-models/vendor";

type VendorProfileApiResponse = ApiResponse<VendorMePayload>;

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type VendorAccountStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
};

type VendorAccountActionCardProps = {
  action: MobileVendorActionView;
};

type VendorProfileCardProps = {
  view: MobileVendorAccountView;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function VendorAccountStateCard({
  title,
  message,
  action,
  role = "status",
}: VendorAccountStateCardProps) {
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

function VendorAccountActionCard({ action }: VendorAccountActionCardProps) {
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

function VendorProfileCard({ view }: VendorProfileCardProps) {
  return (
    <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
      <div className="mobile-pt-client-card__header">
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">Default vendor</p>
          <h2 className="mobile-section__title">{view.profile.vendorName}</h2>
          <p className="mobile-section__description">{view.profile.vendorDescription}</p>
        </div>
        <span className="mobile-pill mobile-pill--purple">{view.identity.defaultVendorStateLabel}</span>
      </div>

      <dl className="mobile-pt-fact-grid">
        <div>
          <dt>Account email</dt>
          <dd>{view.identity.accountEmailLabel}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{view.identity.accountRoleLabel}</dd>
        </div>
        <div>
          <dt>Vendor slug</dt>
          <dd>{view.profile.vendorSlugLabel}</dd>
        </div>
        <div>
          <dt>Vendor ZIP</dt>
          <dd>{view.profile.vendorZipLabel}</dd>
        </div>
        <div>
          <dt>Vendor status</dt>
          <dd>{view.profile.vendorStatusLabel}</dd>
        </div>
        <div>
          <dt>Meal plans</dt>
          <dd>{view.profile.vendorMealPlanCountLabel}</dd>
        </div>
      </dl>
    </MobileCard>
  );
}

export default function VendorAccountPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "vendor",
    unauthenticatedRedirectTo: "/login",
  });

  const [profile, setProfile] = useState<VendorMePayload | null>(null);
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
        const response = await fetch("/api/vendor/me", { cache: "no-store" });
        const payload = (await response.json()) as VendorProfileApiResponse;
        if (!active) {
          return;
        }
        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          return;
        }
        setProfile(payload.data);
      } catch {
        if (active) {
          setProfile(null);
          setErrorMessage("Unable to load vendor profile.");
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
    return (
      <LoadingBlock
        title="Loading vendor account"
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

  const view = adaptVendorAccountView({
    profile,
    sessionEmail: user.email,
    sessionRole: user.role,
  });
  const showLoadingState = loading && !profile && !errorMessage;

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title={view.title}
      subtitle={view.subtitle}
      notificationSlot={<ActionPill href="/vendor/metrics" tone="purple">Metrics</ActionPill>}
      topHubAction={<ActionPill href="/vendor">Vendor dashboard</ActionPill>}
      activePath="/vendor/account"
    >
      {errorMessage ? (
        <MobileSection
          eyebrow="Account sync"
          title="Vendor account unavailable"
          description="This mobile account page stays on protected Next and BFF routes and does not fall back to direct backend calls."
        >
          <VendorAccountStateCard
            title="Unable to load vendor profile"
            message={errorMessage}
            action={<ActionPill href="/vendor">Vendor dashboard</ActionPill>}
            role="alert"
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading vendor account"
          description="Fetching vendor identity and default vendor context through the existing vendor profile route."
        >
          <VendorAccountStateCard
            title="Refreshing vendor account"
            message="Vendor account details are loading through the current signed frontend-to-BFF path."
          />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <MobileSection
            eyebrow="Account identity"
            title="Vendor session and account"
            description="This account view remains read-only and shows only authenticated session fields plus default vendor context returned by the existing vendor profile route."
            action={<ActionPill href="/vendor" tone="purple">Back to vendor</ActionPill>}
          >
            <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Authenticated account</p>
                  <h2 className="mobile-section__title">{view.identity.accountEmailLabel}</h2>
                  <p className="mobile-section__description">{view.identity.accountNote}</p>
                </div>
                <span className="mobile-pill mobile-pill--yellow">{view.identity.defaultVendorStateLabel}</span>
              </div>

              <dl className="mobile-pt-fact-grid">
                <div>
                  <dt>Role</dt>
                  <dd>{view.identity.accountRoleLabel}</dd>
                </div>
                <div>
                  <dt>Vendor memberships</dt>
                  <dd>{view.identity.vendorsCountLabel}</dd>
                </div>
                <div>
                  <dt>Vendor name</dt>
                  <dd>{view.profile.vendorName}</dd>
                </div>
                <div>
                  <dt>Vendor ZIP</dt>
                  <dd>{view.profile.vendorZipLabel}</dd>
                </div>
              </dl>
            </MobileCard>

            {view.summaryCards.map((card) => (
              <MobileStatCard
                key={card.label}
                label={card.label}
                value={card.value}
                progressText={card.progressText}
              />
            ))}
          </MobileSection>

          <MobileSection
            eyebrow="Vendor profile"
            title="Default vendor profile"
            description="Vendor profile fields render only when returned by the existing vendor profile route. Unsupported account state is not invented on this page."
            action={<ActionPill href="/vendor/meal-plans">Meal plans</ActionPill>}
          >
            {view.profile.hasDefaultVendor ? (
              <VendorProfileCard view={view} />
            ) : (
              <VendorAccountStateCard
                title={view.profile.unavailableTitle}
                message={view.profile.unavailableMessage}
                action={<ActionPill href="/vendor" tone="purple">Vendor dashboard</ActionPill>}
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Access and settings"
            title={view.readOnlyTitle}
            description={view.readOnlyMessage}
            action={<ActionPill href="/vendor/metrics" tone="purple">Metrics</ActionPill>}
          >
            <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Existing action</p>
                <h3 className="mobile-section__title">Sign out</h3>
                <p className="mobile-section__description">
                  Signing out continues to use the existing auth BFF flow. No profile edit or account mutation flow is introduced on this route.
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
            description="These action cards open existing vendor pages only. No new account mutations or operations behavior are introduced here."
          >
            <div className="mobile-pt-detail-stack">
              {view.actions.map((action) => (
                <VendorAccountActionCard key={action.href} action={action} />
              ))}
            </div>
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
