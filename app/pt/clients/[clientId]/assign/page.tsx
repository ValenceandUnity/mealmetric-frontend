"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { RecordCard } from "@/components/cards/RecordCard";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { PageShell } from "@/components/layout/PageShell";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { adaptPTAssignmentWorkspace } from "@/lib/adapters/client-records";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type JsonApiResponse = ApiResponse<JsonValue>;

type AssignmentFormState = {
  training_package_id: string;
  start_date: string;
  end_date: string;
};

function formatOptionalDate(value: string): string | null {
  return value.trim().length > 0 ? value : null;
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

  const view = adaptPTAssignmentWorkspace(packagesData, assignmentsData);

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

  return (
    <PageShell
      title="Assign training package"
      user={user}
      navigation={
        <>
          <Link className="link-button" href={`/pt/clients/${clientId}`}>
            Client overview
          </Link>
          <Link className="link-button" href="/pt/clients">
            Back to clients
          </Link>
        </>
      }
    >
      {loading ? <LoadingBlock title="Loading assignment data" message="Fetching PT packages and existing assignments." /> : null}
      {loadError ? <ErrorBlock title="Unable to load assignment data" message={loadError} /> : null}

      {!loading && !loadError ? (
        <>
          <Section title="Assignment workspace">
            <div className="grid grid--2">
              {view.summary.map((item) => (
                <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
              ))}
            </div>
            <p className="section__copy">Client ID: {clientId || "Unavailable"}</p>
          </Section>

          <Section title="Create assignment">
            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="field">
                <span>Training package</span>
                {view.packageOptions.some((pkg) => Boolean(pkg.id)) ? (
                  <select
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
                  type="date"
                  value={formState.end_date}
                  onChange={(event) => setFormState((current) => ({ ...current, end_date: event.target.value }))}
                  disabled={submitting}
                />
              </div>
              <button type="submit" disabled={submitting}>
                {submitting ? "Assigning..." : "Assign package"}
              </button>
            </form>
            {submitSuccess ? <p className="status-text status-text--success">{submitSuccess}</p> : null}
            {submitError ? <p className="status-text status-text--danger">{submitError}</p> : null}
          </Section>

          <Section title="Package options">
            {view.packageOptions.length > 0 ? (
              <div className="stacked-list">
                {view.packageOptions.map((pkg, index) => (
                  <RecordCard
                    key={pkg.id ?? `${pkg.title}-${index}`}
                    eyebrow="Package"
                    title={pkg.title}
                    description={pkg.description}
                    metadata={pkg.id ? [{ label: "Package ID", value: pkg.id }] : []}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No packages returned"
                message="The PT package route did not return assignable packages for this workflow."
              />
            )}
          </Section>

          <Section title="Existing assignments">
            {view.assignments.length > 0 ? (
              <div className="stacked-list">
                {view.assignments.map((assignment, index) => (
                  <RecordCard
                    key={assignment.id ?? `${assignment.title}-${index}`}
                    eyebrow={assignment.eyebrow}
                    title={assignment.title}
                    description={assignment.description}
                    metadata={assignment.metadata}
                  />
                ))}
              </div>
            ) : (
              <>
                <EmptyState
                  title="No assignments returned"
                  message="This client does not yet have active assignments from the PT endpoints."
                />
                {view.debugData ? (
                  <DebugPreview value={view.debugData} label="Assignments payload fallback" />
                ) : null}
              </>
            )}
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
