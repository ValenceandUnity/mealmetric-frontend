"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { MetricCard } from "@/components/metrics/MetricCard";
import { PageShell } from "@/components/layout/PageShell";
import { ActionRow } from "@/components/ui/ActionRow";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
import { TabSwitch } from "@/components/ui/TabSwitch";
import { adaptMetrics } from "@/lib/adapters/metrics";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, ClientMetricsResponse, JsonValue } from "@/lib/types/api";

type MetricsTab = "overview" | "history";
type ClientMetricsApiResponse = ApiResponse<ClientMetricsResponse>;
type MetricsSectionApiResponse = ApiResponse<JsonValue>;

export default function ClientMetricsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [activeTab, setActiveTab] = useState<MetricsTab>("overview");
  const [overview, setOverview] = useState<JsonValue | null>(null);
  const [history, setHistory] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/client/metrics", { cache: "no-store" });
        const payload = (await response.json()) as ClientMetricsApiResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setOverview(null);
          setHistory(null);
          return;
        }

        setOverview(payload.data.overview);
        setHistory(payload.data.history);
      } catch {
        if (active) {
          setErrorMessage("Unable to load client metrics.");
          setOverview(null);
          setHistory(null);
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

  async function refreshTab(tab: MetricsTab) {
    setRefreshing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/client/metrics/${tab}`, { cache: "no-store" });
      const payload = (await response.json()) as MetricsSectionApiResponse;

      if (!payload.ok) {
        setErrorMessage(payload.error.message);
        return;
      }

      if (tab === "overview") {
        setOverview(payload.data);
      } else {
        setHistory(payload.data);
      }
    } catch {
      setErrorMessage(`Unable to refresh ${tab}.`);
    } finally {
      setRefreshing(false);
    }
  }

  if (status === "loading") {
    return <LoadingBlock title="Loading metrics" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client metrics require an authenticated client session." />;
  }

  const overviewView = adaptMetrics(overview);
  const historyView = adaptMetrics(history);
  const currentView = activeTab === "overview" ? overviewView : historyView;
  const currentData = activeTab === "overview" ? overview : history;
  const availableSections = currentView.sections.filter(
    (section) => section.stats.length > 0 || section.rows.length > 0,
  );
  const leadSection = availableSections[0] ?? null;

  return (
    <PageShell
      title="Metrics"
      user={user}
      navigation={<Link className="link-button" href="/client">Back to client home</Link>}
    >
      {loading ? <LoadingBlock title="Loading metrics data" message="Fetching `/api/client/metrics` through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load metrics" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Card className="client-metrics-hero" variant="accent" as="section">
            <div className="client-metrics-hero__layout">
              <div className="client-metrics-hero__lead">
                <PageHeader
                  eyebrow="Client metrics"
                  title="Progress workspace"
                  description="Review the live metrics slice, compare it with retained history, and keep the full progress surface inside the protected client shell."
                  status={{
                    label: activeTab === "overview" ? "Overview active" : "History active",
                    tone: "accent",
                  }}
                  chips={[
                    `${overviewView.scalarCount} overview metric${overviewView.scalarCount === 1 ? "" : "s"}`,
                    `${historyView.scalarCount} history metric${historyView.scalarCount === 1 ? "" : "s"}`,
                    `${currentView.collectionCount} grouped section${currentView.collectionCount === 1 ? "" : "s"}`,
                  ]}
                  actions={
                    <ActionRow>
                      <Link className="link-button" href="/client/training">
                        Training
                      </Link>
                      <Link className="link-button" href="/client/meal-plans">
                        Meal plans
                      </Link>
                    </ActionRow>
                  }
                />

                <div className="client-metrics-hero__stats">
                  <StatPill
                    label="Active view"
                    value={activeTab === "overview" ? "Overview" : "History"}
                    hint="Switch between the two BFF-managed metrics slices."
                    active
                  />
                  <StatPill
                    label="Snapshot cards"
                    value={`${currentView.summary.length}`}
                    hint="Headline values ready for primary card presentation."
                  />
                  <StatPill
                    label="Grouped sections"
                    value={`${availableSections.length}`}
                    hint="Structured regions available in the active slice."
                  />
                  <StatPill
                    label="Refresh state"
                    value={refreshing ? "Refreshing" : "Idle"}
                    hint="Refresh stays inside the existing client metrics BFF routes."
                  />
                </div>
              </div>

              <Card className="client-metrics-hero__focus" variant="soft">
                <ListRow
                  eyebrow="Current focus"
                  title={leadSection ? leadSection.title : "Active metrics slice"}
                  description={
                    leadSection
                      ? leadSection.description
                      : "The current slice is connected, but richer grouped metric structure is not available yet."
                  }
                  metadata={[
                    { label: "Highlights", value: `${currentView.highlights.length}` },
                    { label: "Sections", value: `${availableSections.length}` },
                    { label: "Source", value: activeTab === "overview" ? "Overview route" : "History route" },
                  ]}
                  status={{
                    label: refreshing ? "Refreshing" : "Live",
                    tone: refreshing ? "warning" : "success",
                  }}
                />
                <div className="client-metrics-hero__chips">
                  <Chip tone="accent">{activeTab === "overview" ? "Current status" : "Longer-range records"}</Chip>
                  <Chip tone="muted">
                    {leadSection ? `${leadSection.stats.length + leadSection.rows.length} visible items` : "Structured fallback"}
                  </Chip>
                </div>
              </Card>
            </div>
          </Card>

          <SectionBlock
            eyebrow="Windows"
            title="Overview and history framing"
            description="The current backend exposes overview and history slices. This screen frames them side by side until deeper weekly analytics arrive."
            actions={
              <ActionRow>
                <TabSwitch
                  active={activeTab}
                  onChange={setActiveTab}
                  ariaLabel="Metric views"
                  options={[
                    { value: "overview", label: "Overview" },
                    { value: "history", label: "History" },
                  ]}
                />
                <button type="button" onClick={() => void refreshTab(activeTab)} disabled={refreshing}>
                  {refreshing ? "Refreshing..." : `Refresh ${activeTab}`}
                </button>
              </ActionRow>
            }
          >
            <div className="client-metrics-windows">
              <div className="client-metrics-compare">
                <AnalyticsCard
                  eyebrow="Current slice"
                  title="Overview"
                  description="Use this for the latest metric snapshot currently returned by `/api/client/metrics/overview`."
                  stats={overviewView.summary}
                  active={activeTab === "overview"}
                  disabled={!overviewView.hasData}
                />
                <AnalyticsCard
                  eyebrow="Reference slice"
                  title="History"
                  description="Use this to scan prior checkpoints and longer-range records from `/api/client/metrics/history`."
                  stats={historyView.summary}
                  active={activeTab === "history"}
                  disabled={!historyView.hasData}
                />
              </div>
              <Card className="client-metrics-window-note" variant="ghost">
                <ListRow
                  eyebrow="Current boundary"
                  title="Overview and history are the only approved windows today"
                  description="The screen intentionally avoids inventing weekly trend semantics. This framing stays honest to the current backend contract while still presenting a progress workspace."
                  footer={
                    <Badge
                      label={activeTab === "overview" ? "Overview in focus" : "History in focus"}
                      tone="accent"
                    />
                  }
                />
              </Card>
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Snapshot"
            title={activeTab === "overview" ? "Overview summary" : "History summary"}
            description="Primary metric cards for the active slice, separated from supporting detail."
          >
            {currentView.summary.length > 0 ? (
              <div className="client-metrics-snapshot-grid">
                {currentView.summary.map((item, index) => (
                  <MetricCard
                    key={`${activeTab}-${item.label}`}
                    label={item.label}
                    value={item.value}
                    hint={item.hint ?? (index === 0 ? "Lead metric in the active slice." : "Derived from the returned metrics payload.")}
                    active={index === 0}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No snapshot metrics yet"
                message="The active metrics slice loaded, but it did not expose scalar fields for metric cards."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Structure"
            title="Metric highlights"
            description="Readable highlights surfaced as the fast scan layer between the summary cards and deeper grouped detail."
          >
            {currentView.highlights.length > 0 ? (
              <div className="client-metrics-highlights">
                {currentView.highlights.map((item) => (
                  <Card key={`${activeTab}-${item.label}`} className="client-metrics-highlight-card" variant="soft">
                    <ListRow
                      eyebrow={activeTab === "overview" ? "Overview highlight" : "History highlight"}
                      title={item.label}
                      description={item.value}
                    />
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Highlights are not available"
                message="This slice does not currently expose readable highlight rows."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Groups"
            title="Grouped metric sections"
            description="Structured analytics regions derived from nested objects and collections in the active payload."
          >
            {availableSections.length > 0 ? (
              <div className="client-metrics-sections">
                {availableSections.map((section, index) => (
                  <Card
                    key={`${activeTab}-${section.id}`}
                    className="client-metrics-section"
                    variant={index === 0 ? "accent" : "soft"}
                  >
                    <PageHeader
                      eyebrow={activeTab === "overview" ? "Overview group" : "History group"}
                      title={section.title}
                      description={section.description}
                    />
                    {section.stats.length > 0 ? (
                      <div className="client-metrics-section__stats">
                        {section.stats.map((stat) => (
                          <StatPill
                            key={`${section.id}-${stat.label}`}
                            label={stat.label}
                            value={stat.value}
                            hint={stat.hint}
                          />
                        ))}
                      </div>
                    ) : null}
                    {section.rows.length > 0 ? (
                      <div className="stacked-list">
                        {section.rows.map((row, index) => (
                          <ListRow
                            key={`${section.id}-${row.title}-${index}`}
                            eyebrow={row.eyebrow}
                            title={row.title}
                            description={row.description}
                            metadata={row.metadata}
                          />
                        ))}
                      </div>
                    ) : null}
                    {section.stats.length === 0 && section.rows.length === 0 && section.emptyMessage ? (
                      <EmptyState title={`${section.title} is not populated`} message={section.emptyMessage} />
                    ) : null}
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Grouped metrics are not ready"
                message="The active metrics slice does not yet expose nested collections or grouped objects for this area."
              />
            )}
          </SectionBlock>

          {currentData && currentView.highlights.length === 0 && availableSections.length === 0 ? (
            <SectionBlock
              eyebrow="Fallback"
              title="Payload fallback"
              description="This raw view only appears because the active slice could not adapt into richer presentation blocks."
            >
              <Card variant="ghost" className="client-metrics-debug">
                <DebugPreview value={currentData} label={`${activeTab} payload fallback`} />
              </Card>
            </SectionBlock>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
