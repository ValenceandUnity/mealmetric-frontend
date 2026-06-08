"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { ClientRecordsPageView } from "@/lib/adapters/client-records";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type StateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
};

export type ClientCommerceRouteSurfaceProps = {
  activePath?: string;
  adapter: (value: JsonValue | null) => ClientRecordsPageView;
  debugLabel: string;
  emptyMessage: string;
  emptyTitle: string;
  errorTitle: string;
  fetchErrorFallback: string;
  fetchPath: string;
  loadingMessage: string;
  loadingTitle: string;
  overviewDescription: string;
  overviewTitle: string;
  pageSubtitle: string;
  pageTitle: string;
  recordsDescription: string;
  recordsTitle: string;
  redirectMessage: string;
  summaryDescription: string;
  summaryTitle: string;
  topLinks?: Array<{
    href: string;
    label: string;
    tone: "purple" | "yellow";
  }>;
};

type RouteResponse = ApiResponse<JsonValue>;

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function StateCard({ title, message, action, role = "status" }: StateCardProps) {
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

export function ClientCommerceRouteSurface({
  activePath,
  adapter,
  debugLabel,
  emptyMessage,
  emptyTitle,
  errorTitle,
  fetchErrorFallback,
  fetchPath,
  loadingMessage,
  loadingTitle,
  overviewDescription,
  overviewTitle,
  pageSubtitle,
  pageTitle,
  recordsDescription,
  recordsTitle,
  redirectMessage,
  summaryDescription,
  summaryTitle,
  topLinks,
}: ClientCommerceRouteSurfaceProps) {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [routeData, setRouteData] = useState<JsonValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(fetchPath, { cache: "no-store" });
        const payload = (await response.json()) as RouteResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setRouteData(null);
          return;
        }

        setRouteData(payload.data);
      } catch {
        if (active) {
          setErrorMessage(fetchErrorFallback);
          setRouteData(null);
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
  }, [fetchErrorFallback, fetchPath, status, user]);

  const view = useMemo(() => adapter(routeData), [adapter, routeData]);

  if (status === "loading") {
    return <LoadingBlock title={loadingTitle} message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message={redirectMessage} />;
  }

  return (
    <MobileAppShell
      user={user}
      activePath={activePath}
      showBottomNav={false}
      greeting={formatDisplayNameFromUser(user)}
      title={pageTitle}
      subtitle={pageSubtitle}
      notificationSlot={<span className="mobile-pill mobile-pill--purple">Read only</span>}
    >
      {topLinks?.length ? (
        <MobileSection
          eyebrow="Navigation"
          title="Route links"
          description="Only currently supported client routes are linked from this utility surface."
        >
          <div className="mobile-pt-actions">
            {topLinks.map((link) => (
              <ActionPill key={link.href} href={link.href} tone={link.tone}>
                {link.label}
              </ActionPill>
            ))}
          </div>
        </MobileSection>
      ) : null}

      {loading ? (
        <MobileSection
          eyebrow="Syncing"
          title={loadingTitle}
          description={loadingMessage}
        >
          <StateCard title={loadingTitle} message={loadingMessage} />
        </MobileSection>
      ) : null}

      {errorMessage ? (
        <MobileSection
          eyebrow="Unavailable"
          title={errorTitle}
          description="This route remains inside the protected client BFF boundary and does not fall back to direct backend calls."
        >
          <StateCard title={errorTitle} message={errorMessage} role="alert" />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <MobileSection
            eyebrow="Commerce utility"
            title={overviewTitle}
            description={overviewDescription}
          >
            <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Protected client route</p>
                  <h2 className="mobile-section__title">{overviewTitle}</h2>
                  <p className="mobile-section__description">{overviewDescription}</p>
                </div>
                <span className="mobile-pill mobile-pill--yellow">No mutations</span>
              </div>

              <dl className="mobile-pt-fact-grid">
                <div>
                  <dt>Data source</dt>
                  <dd>{fetchPath}</dd>
                </div>
                <div>
                  <dt>Session</dt>
                  <dd>Client required</dd>
                </div>
                <div>
                  <dt>Records</dt>
                  <dd>{view.records.length}</dd>
                </div>
                <div>
                  <dt>Mutations</dt>
                  <dd>None</dd>
                </div>
              </dl>
            </MobileCard>
          </MobileSection>

          <MobileSection
            eyebrow="Summary"
            title={summaryTitle}
            description={summaryDescription}
          >
            <div className="mobile-pt-detail-stat-grid">
              {view.summary.map((item) => (
                <MobileStatCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  progressText={item.hint}
                />
              ))}
            </div>
          </MobileSection>

          <MobileSection
            eyebrow="Records"
            title={recordsTitle}
            description={recordsDescription}
          >
            {view.records.length > 0 ? (
              <div className="mobile-pt-detail-stack">
                {view.records.map((record, index) => (
                  <MobileCard
                    key={record.id ?? `${record.title}-${index}`}
                    as="article"
                    variant={index === 0 ? "action" : "soft"}
                    className="mobile-pt-detail-action-card"
                  >
                    <div className="mobile-pt-client-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">{record.eyebrow}</p>
                        <h3 className="mobile-section__title">{record.title}</h3>
                        <p className="mobile-section__description">{record.description}</p>
                      </div>
                    </div>

                    {record.metadata.length > 0 ? (
                      <dl className="mobile-pt-fact-grid">
                        {record.metadata.map((item) => (
                          <div key={`${record.id ?? record.title}-${item.label}`}>
                            <dt>{item.label}</dt>
                            <dd>{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mobile-section__description">
                        Additional record details are unavailable on this payload.
                      </p>
                    )}
                  </MobileCard>
                ))}
              </div>
            ) : (
              <StateCard title={emptyTitle} message={emptyMessage} />
            )}

            {view.records.length === 0 && view.debugData ? (
              <DebugPreview value={view.debugData} label={debugLabel} />
            ) : null}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
