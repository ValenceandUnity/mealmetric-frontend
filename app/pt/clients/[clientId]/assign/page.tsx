"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { adaptPTAssignmentWorkspace } from "@/lib/adapters/client-records";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type JsonApiResponse = ApiResponse<JsonValue>;

type AssignmentFormState = {
  training_package_id: string;
  start_date: string;
  end_date: string;
};

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type StateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

function formatOptionalDate(value: string): string | null {
  return value.trim().length > 0 ? value : null;
}

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function StateCard({ title, message, action }: StateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

function MetadataList({ metadata }: { metadata: Array<{ label: string; value: string }> }) {
  if (metadata.length === 0) {
    return null;
  }

  return (
    <dl className="mobile-pt-detail-meta-list">
      {metadata.map((item) => (
        <div key={`${item.label}-${item.value}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PTClientAssignPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = typeof params?.clientId === "string" ? params.clientId : "";

  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [packagesData, setPackagesData] = useState<JsonValue | null>(null);
  const [assignmentsData, setAssignmentsData] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<AssignmentFormState>({
    training_package_id: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt" || !clientId) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const [packagesResponse, assignmentsResponse] = await Promise.all([
          fetch("/api/pt/packages", { cache: "no-store" }),
          fetch(`/api/pt/clients/${clientId}/assignments`, { cache: "no-store" }),
        ]);

        const [packagesPayload, assignmentsPayload] = (await Promise.all([
          packagesResponse.json(),
          assignmentsResponse.json(),
        ])) as [JsonApiResponse, JsonApiResponse];

        if (!active) {
          return;
        }

        if (!packagesPayload.ok) {
          setLoadError(packagesPayload.error.message);
          return;
        }

        if (!assignmentsPayload.ok) {
          setLoadError(assignmentsPayload.error.message);
          return;
        }

        setPackagesData(packagesPayload.data);
        setAssignmentsData(assignmentsPayload.data);
      } catch {
        if (active) {
          setLoadError("Unable to load packages and assignments.");
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
  }, [clientId, status, user]);

  const view = useMemo(
    () => adaptPTAssignmentWorkspace(packagesData, assignmentsData),
    [assignmentsData, packagesData],
  );

  useEffect(() => {
    if (formState.training_package_id || view.packageOptions.length === 0) {
      return;
    }

    const firstId = view.packageOptions.find((pkg) => Boolean(pkg.id))?.id;
    if (firstId) {
      setFormState((current) => ({ ...current, training_package_id: firstId }));
    }
  }, [formState.training_package_id, view.packageOptions]);

  async function refreshAssignments() {
    const response = await fetch(`/api/pt/clients/${clientId}/assignments`, { cache: "no-store" });
    const payload = (await response.json()) as JsonApiResponse;

    if (!payload.ok) {
      throw new Error(payload.error.message);
    }

    setAssignmentsData(payload.data);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState.training_package_id.trim()) {
      setSubmitError("Training package is required.");
      setSubmitSuccess(null);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch(`/api/pt/clients/${clientId}/assignments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          training_package_id: formState.training_package_id,
          start_date: formatOptionalDate(formState.start_date),
          end_date: formatOptionalDate(formState.end_date),
        }),
      });

      const payload = (await response.json()) as JsonApiResponse;

      if (!payload.ok) {
        setSubmitError(payload.error.message);
        return;
      }

      await refreshAssignments();
      setSubmitSuccess("Assignment created successfully.");
      setFormState((current) => ({
        ...current,
        start_date: "",
        end_date: "",
      }));
    } catch {
      setSubmitError("Unable to create assignment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return <LoadingBlock title="Loading assignment page" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  const clientOverviewHref = `/pt/clients/${clientId}`;

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="Assign Training"
      subtitle={`Client ${clientId || "Unavailable"} | PT assignment workspace`}
      notificationSlot={<ActionPill href="/pt/clients" tone="purple">Back to clients</ActionPill>}
      topHubAction={<ActionPill href={clientOverviewHref}>Client overview</ActionPill>}
      activePath={`/pt/clients/${clientId}/assign`}
    >
      {loading ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading assignment data"
          description="Fetching PT packages and existing assignments through the protected PT BFF routes."
        >
          <StateCard
            title="Refreshing assignment workspace"
            message="This client assignment surface is waiting on the current signed frontend-to-BFF responses."
          />
        </MobileSection>
      ) : null}

      {loadError ? (
        <MobileSection
          eyebrow="Assignment workspace"
          title="Unable to load assignment data"
          description="The PT assignment page preserves the existing BFF boundary and does not fall back to direct backend calls."
        >
          <StateCard title="Assignment data unavailable" message={loadError} />
        </MobileSection>
      ) : null}

      {!loading && !loadError ? (
        <>
          <MobileSection
            eyebrow="PT assignment"
            title="Assignment workspace"
            description="This mobile rebuild keeps the current PT package and client-assignment routes unchanged."
          >
            <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Linked client</p>
                  <h2 className="mobile-section__title">Client assignment workspace</h2>
                  <p className="mobile-section__description">
                    Client ID: {clientId || "Unavailable"}
                  </p>
                </div>
                <span className="mobile-pill mobile-pill--purple">PT workflow</span>
              </div>

              <p className="mobile-section__description">
                Existing package availability and assignment history remain sourced only from the current PT BFF routes.
              </p>
            </MobileCard>

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
            eyebrow="Mutation"
            title="Create assignment"
            description="Submitting this form uses the existing PT assignment-create BFF route and preserves the current request body."
          >
            <form className="mobile-pt-form-grid" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="training_package_id">Training package</label>
                {view.packageOptions.some((pkg) => Boolean(pkg.id)) ? (
                  <select
                    id="training_package_id"
                    className="mobile-focus-ring"
                    value={formState.training_package_id}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, training_package_id: event.target.value }))
                    }
                    disabled={submitting}
                  >
                    {view.packageOptions.map((pkg) =>
                      pkg.id ? (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.title}
                        </option>
                      ) : null,
                    )}
                  </select>
                ) : (
                  <input
                    id="training_package_id"
                    className="mobile-focus-ring"
                    value={formState.training_package_id}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, training_package_id: event.target.value }))
                    }
                    disabled={submitting}
                  />
                )}
              </div>

              <div className="field">
                <label htmlFor="start_date">Start date</label>
                <input
                  id="start_date"
                  className="mobile-focus-ring"
                  type="date"
                  value={formState.start_date}
                  onChange={(event) => setFormState((current) => ({ ...current, start_date: event.target.value }))}
                  disabled={submitting}
                />
              </div>

              <div className="field">
                <label htmlFor="end_date">End date</label>
                <input
                  id="end_date"
                  className="mobile-focus-ring"
                  type="date"
                  value={formState.end_date}
                  onChange={(event) => setFormState((current) => ({ ...current, end_date: event.target.value }))}
                  disabled={submitting}
                />
              </div>

              <div className="mobile-pt-actions">
                <button
                  type="submit"
                  className="mobile-pt-button mobile-pt-button--primary mobile-focus-ring"
                  disabled={submitting}
                >
                  {submitting ? "Creating assignment..." : "Create assignment"}
                </button>
              </div>
            </form>

            {submitSuccess ? (
              <FeedbackBanner
                tone="success"
                title="Assignment created"
                message={submitSuccess}
              />
            ) : null}

            {submitError ? (
              <FeedbackBanner
                tone="error"
                title="Assignment creation failed"
                message={submitError}
              />
            ) : null}
          </MobileSection>

          <MobileSection
            eyebrow="PT packages"
            title="Package options"
            description="These options are unchanged from the current /api/pt/packages workflow."
          >
            {view.packageOptions.length > 0 ? (
              <div className="mobile-pt-detail-stack">
                {view.packageOptions.map((pkg, index) => (
                  <MobileCard
                    key={pkg.id ?? `${pkg.title}-${index}`}
                    as="article"
                    variant="soft"
                    className="mobile-pt-detail-action-card"
                  >
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">Package</p>
                      <h3 className="mobile-section__title">{pkg.title}</h3>
                      <p className="mobile-section__description">{pkg.description}</p>
                    </div>
                    {pkg.id ? (
                      <MetadataList metadata={[{ label: "Package ID", value: pkg.id }]} />
                    ) : null}
                  </MobileCard>
                ))}
              </div>
            ) : (
              <StateCard
                title="No packages returned"
                message="The PT package route did not return assignable packages for this workflow."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Assignment history"
            title="Existing assignments"
            description="Assignment cards remain a readout of the current PT client-assignment route."
          >
            {view.assignments.length > 0 ? (
              <div className="mobile-pt-detail-stack">
                {view.assignments.map((assignment, index) => (
                  <MobileCard
                    key={assignment.id ?? `${assignment.title}-${index}`}
                    as="article"
                    variant="action"
                    className="mobile-pt-detail-action-card"
                  >
                    <div className="mobile-pt-client-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">{assignment.eyebrow}</p>
                        <h3 className="mobile-section__title">{assignment.title}</h3>
                        <p className="mobile-section__description">{assignment.description}</p>
                      </div>
                      <span className="mobile-pill mobile-pill--yellow">Assignment</span>
                    </div>
                    <MetadataList metadata={assignment.metadata} />
                  </MobileCard>
                ))}
              </div>
            ) : (
              <>
                <StateCard
                  title="No assignments returned"
                  message="This client does not yet have active assignments from the PT endpoints."
                />
                {view.debugData ? (
                  <DebugPreview value={view.debugData} label="Assignments payload fallback" />
                ) : null}
              </>
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
