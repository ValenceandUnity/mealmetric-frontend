"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { PageShell } from "@/components/layout/PageShell";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { adaptPTDashboard } from "@/lib/adapters/dashboard";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, PTDashboardResponse } from "@/lib/types/api";

type PTDashboardApiResponse = ApiResponse<PTDashboardResponse>;

export default function PTDashboardPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [dashboardData, setDashboardData] = useState<PTDashboardResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/pt/dashboard", { cache: "no-store" });
        const payload = (await response.json()) as PTDashboardApiResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setDashboardData(null);
          return;
        }

        setDashboardData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load the PT dashboard.");
          setDashboardData(null);
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
    return <LoadingBlock title="Loading PT session" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  const view = dashboardData ? adaptPTDashboard(dashboardData) : null;

  return (
    <PageShell
      title="Coach dashboard"
      user={user}
      navigation={
        <>
          <Link className="link-button" href="/pt/clients">Clients</Link>
          <Link className="link-button" href="/pt/settings">Settings</Link>
        </>
      }
      actions={<LogoutButton />}
    >
      {loading ? <LoadingBlock title="Loading dashboard data" message="Calling /api/pt/dashboard through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load PT dashboard" message={errorMessage} /> : null}

      {view && dashboardData ? (
        <>
          <Section title="PT summary">
            <div className="grid grid--2">
              {view.summary.map((item) => (
                <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
              ))}
            </div>
          </Section>

          <Section title="Client overview">
            {view.clients.length > 0 ? (
              <div className="stacked-list">
                {view.clients.map((client) => (
                  <article key={client.id ?? client.title} className="list-card">
                    <h3 className="list-card__title">{client.title}</h3>
                    <p className="list-card__copy">{client.subtitle}</p>
                    {client.id ? (
                      <div className="row">
                        <Link className="link-button" href={`/pt/clients/${client.id}/metrics`}>Metrics</Link>
                        <Link className="link-button" href={`/pt/clients/${client.id}/assign`}>Training</Link>
                        <Link className="link-button" href={`/pt/clients/${client.id}/recommend-meal-plan`}>Recommend meal plan</Link>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No clients returned" message="Client accounts will appear here when the BFF dashboard payload includes them." />
            )}
          </Section>

          <Section title="Packages overview">
            {view.packages.length > 0 ? (
              <div className="stacked-list">
                {view.packages.map((pkg) => (
                  <article key={pkg.id ?? pkg.title} className="list-card">
                    <h3 className="list-card__title">{pkg.title}</h3>
                    <p className="list-card__copy">{pkg.subtitle}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No packages returned" message="Package inventory will appear here when the PT dashboard exposes it." />
            )}
          </Section>

          <Section title="Recommendations">
            <p className="section__copy">
              Use the client workspace to create assignment and meal-plan recommendations without breaking the BFF boundary.
            </p>
            <Link className="link-button link-button--accent" href="/pt/clients">Open client command center</Link>
            {view.summary.length === 0 ? (
              <DebugPreview value={dashboardData.profile} label="Profile debug fallback" />
            ) : null}
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
