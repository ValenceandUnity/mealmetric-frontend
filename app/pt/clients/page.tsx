"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { PageShell } from "@/components/layout/PageShell";
import { RoutineCard } from "@/components/training/RoutineCard";
import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
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
  const featuredClient = view.clients[0] ?? null;
  const activeClientsLabel =
    view.summary.find((item) => item.label === "Clients")?.value ?? `${view.clients.length} items`;
  const clientCount = view.clients.length;

  return (
    <PageShell title="Client command center" user={user}>
      {loading ? <LoadingBlock title="Loading clients" message="Calling /api/pt/clients through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load PT clients" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Card className="pt-clients-hero" variant="accent" as="section">
            <div className="pt-clients-hero__layout">
              <Card className="pt-clients-hero__lead" variant="soft">
                <PageHeader
                  eyebrow="PT clients"
                  title="Coaching roster workspace"
                  description="Use the roster as the live anchor for client-specific metrics, training assignment, and meal-plan recommendation flows already supported through the PT BFF."
                  chips={[
                    "Client-first operations",
                    "BFF-backed roster",
                    "Route-safe actions",
                  ]}
                  actions={
                    <ActionRow>
                      <Link className="link-button link-button--accent" href="/pt">
                        PT dashboard
                      </Link>
                      <Link className="link-button" href="/pt/settings">
                        Settings
                      </Link>
                    </ActionRow>
                  }
                />
                <div className="pt-clients-hero__stats">
                  {view.summary.length > 0 ? (
                    view.summary.map((item, index) => (
                      <StatPill
                        key={item.label}
                        label={item.label}
                        value={item.value}
                        hint={item.hint}
                        active={index === 0}
                      />
                    ))
                  ) : (
                    <>
                      <StatPill
                        label="Clients"
                        value={`${clientCount}`}
                        hint="Loaded through /api/pt/clients."
                        active
                      />
                      <StatPill
                        label="Workspace"
                        value="Client-led"
                        hint="Metrics, training, and meal plans continue inside each client route."
                      />
                    </>
                  )}
                </div>
              </Card>

              <Card className="pt-clients-hero__focus" variant="default">
                <PageHeader
                  eyebrow="Workspace focus"
                  title={featuredClient ? featuredClient.name : "Roster ready"}
                  description={
                    featuredClient
                      ? "The first visible client is highlighted here so the PT can move from overview into the next operational action quickly."
                      : "Once the PT roster returns clients, this focus area will spotlight the next real client workspace entry point."
                  }
                />
                {featuredClient ? (
                  <>
                    <ListRow
                      eyebrow="Client spotlight"
                      title={featuredClient.name}
                      description={featuredClient.summary}
                      metadata={featuredClient.metadata}
                    />
                    {featuredClient.id ? (
                      <ActionRow>
                        <Link className="link-button link-button--accent" href={`/pt/clients/${featuredClient.id}`}>
                          Open overview
                        </Link>
                        <Link className="link-button" href={`/pt/clients/${featuredClient.id}/assign`}>
                          Assign training
                        </Link>
                      </ActionRow>
                    ) : null}
                  </>
                ) : (
                  <EmptyState
                    title="No client spotlight yet"
                    message="The spotlight stays empty until the PT clients route returns at least one client."
                  />
                )}
              </Card>
            </div>
          </Card>

          <SectionBlock
            eyebrow="Workspace"
            title="Roster overview"
            description="Separate the high-level roster state from the client actions the PT can take today."
          >
            <div className="pt-clients-overview">
              <AnalyticsCard
                eyebrow="Roster summary"
                title="Current client visibility"
                description="This overview reflects only the roster payload currently returned through the PT clients BFF route."
                stats={
                  view.summary.length > 0
                    ? view.summary
                    : [
                        { label: "Clients", value: `${clientCount}` },
                        { label: "Workspace", value: "Client-led" },
                      ]
                }
                actions={
                  <Link className="link-button" href="/pt">
                    Back to dashboard
                  </Link>
                }
              />
              <Card className="pt-clients-overview__context" variant="soft">
                <ListRow
                  eyebrow="Operational framing"
                  title="Actionable PT work stays client-specific"
                  description="The roster provides overview and routing. Metrics review, assignment management, and meal-plan recommendations remain deeper client workflows rather than PT-wide aggregate tabs."
                  metadata={[
                    { label: "Roster route", value: "/api/pt/clients" },
                    { label: "Overview path", value: "/pt/clients/[clientId]" },
                    { label: "Visible clients", value: activeClientsLabel },
                  ]}
                />
              </Card>
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Actionability"
            title="Client operations"
            description="A focused scan of the actions the PT can take right now for each client."
          >
            <div className="pt-clients-actions">
              <Card className="pt-clients-actions__summary" variant="soft">
                <PageHeader
                  eyebrow="Operational note"
                  title="Use overview first, then move into the next task"
                  description="The workspace is organized to help the PT identify the client, confirm their visible context, and route into one of the supported downstream flows."
                />
                <div className="pt-clients-actions__pills">
                  <StatPill
                    label="Overview"
                    value="Route anchor"
                    hint="Client snapshots and next-step links live on the overview route."
                    active
                  />
                  <StatPill
                    label="Metrics"
                    value="Per client"
                    hint="Progress review remains a client-specific screen."
                  />
                  <StatPill
                    label="Training"
                    value="Assignment flow"
                    hint="Package assignment is available only inside each client workspace."
                  />
                  <StatPill
                    label="Meal plans"
                    value="Recommendation flow"
                    hint="Nutrition guidance also stays client-specific."
                  />
                </div>
              </Card>

              {view.clients.length > 0 ? (
                <div className="stacked-list">
                  {view.clients.map((client, index) => (
                    <RoutineCard
                      key={client.id ?? `${client.name}-${index}`}
                      eyebrow="Client"
                      title={client.name}
                      description={client.summary}
                      metadata={client.metadata}
                      active={index === 0}
                      footer={
                        client.id ? (
                          <>
                            <Link className="link-button link-button--accent" href={`/pt/clients/${client.id}`}>
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
                    message="Clients will appear here as soon as the PT roster route returns structured client data."
                  />
                  {view.debugData ? <DebugPreview value={view.debugData} label="PT clients payload fallback" /> : null}
                </>
              )}
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Next steps"
            title="Route-safe coaching actions"
            description="Keep PT-wide placeholder tabs honest while pointing the coach toward the backed client flows."
          >
            <Card className="pt-clients-next" variant="soft">
              <ListRow
                eyebrow="Current boundary"
                title="Roster first, workflows second"
                description="This screen stays within the supported roster boundary and uses the existing child routes for deeper coaching work."
                metadata={[
                  { label: "PT training tab", value: "/pt/training" },
                  { label: "PT metrics tab", value: "/pt/metrics" },
                  { label: "PT meal plans tab", value: "/pt/meal-plans" },
                ]}
              />
              <ActionRow>
                <Link className="link-button link-button--accent" href="/pt">
                  PT dashboard
                </Link>
                <Link className="link-button" href="/pt/training">
                  Training tab
                </Link>
                <Link className="link-button" href="/pt/metrics">
                  Metrics tab
                </Link>
                <Link className="link-button" href="/pt/meal-plans">
                  Meal plans tab
                </Link>
              </ActionRow>
            </Card>
          </SectionBlock>
        </>
      ) : null}
    </PageShell>
  );
}
