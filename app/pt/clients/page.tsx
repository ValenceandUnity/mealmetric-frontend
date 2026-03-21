"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RecordCard } from "@/components/cards/RecordCard";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { PageShell } from "@/components/layout/PageShell";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { adaptPTClients } from "@/lib/adapters/client-records";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type PTClientsApiResponse = ApiResponse<JsonValue>;

export default function PTClientsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [clientsData, setClientsData] = useState<JsonValue | null>(null);
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
        const response = await fetch("/api/pt/clients", { cache: "no-store" });
        const payload = (await response.json()) as PTClientsApiResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setClientsData(null);
          return;
        }

        setClientsData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load PT clients.");
          setClientsData(null);
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
    return <LoadingBlock title="Loading PT clients" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  const view = adaptPTClients(clientsData);

  return (
    <PageShell
      title="Client command center"
      user={user}
      navigation={<Link className="link-button" href="/pt">Back to PT dashboard</Link>}
    >
      {loading ? <LoadingBlock title="Loading clients" message="Calling /api/pt/clients through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load PT clients" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Section title="Roster summary">
            <div className="grid grid--2">
              {view.summary.map((item) => (
                <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
              ))}
            </div>
          </Section>

          <Section title="Active clients">
            {view.clients.length > 0 ? (
              <div className="stacked-list">
                {view.clients.map((client, index) => (
                  <RecordCard
                    key={client.id ?? `${client.name}-${index}`}
                    eyebrow="Client"
                    title={client.name}
                    description={client.summary}
                    metadata={client.metadata}
                    footer={
                      client.id ? (
                        <>
                          <Link className="link-button" href={`/pt/clients/${client.id}`}>
                            Overview
                          </Link>
                          <Link className="link-button" href={`/pt/clients/${client.id}/metrics`}>
                            Metrics
                          </Link>
                          <Link className="link-button" href={`/pt/clients/${client.id}/assign`}>
                            Training
                          </Link>
                          <Link className="link-button" href={`/pt/clients/${client.id}/recommend-meal-plan`}>
                            Meal plans
                          </Link>
                        </>
                      ) : null
                    }
                  />
                ))}
              </div>
            ) : (
              <>
                <EmptyState
                  title="No clients returned"
                  message="Clients will appear here as soon as the PT clients route returns structured roster data."
                />
                {view.debugData ? <DebugPreview value={view.debugData} label="PT clients payload fallback" /> : null}
              </>
            )}
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
