"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { JsonPreview, getArrayItems, getEntityId } from "@/components/JsonPreview";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonObject, JsonValue } from "@/lib/types/api";

type JsonApiResponse = ApiResponse<JsonValue>;

type AssignmentFormState = {
  training_package_id: string;
  start_date: string;
  end_date: string;
};

function isObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTextField(value: JsonValue, keys: string[]): string | null {
  if (!isObject(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

function formatOptionalDate(value: string): string | null {
  return value.trim().length > 0 ? value : null;
}

function getPackageLabel(pkg: JsonValue, fallbackIndex: number): string {
  const title = getTextField(pkg, ["name", "title", "package_name"]);
  const packageId = getEntityId(pkg);

  if (title && packageId) {
    return `${title} (${packageId})`;
  }

  if (title) {
    return title;
  }

  if (packageId) {
    return packageId;
  }

  return `Package #${fallbackIndex + 1}`;
}

function getAssignmentSummary(assignment: JsonValue): {
  assignmentId: string | null;
  trainingPackageId: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
} {
  return {
    assignmentId: getTextField(assignment, ["assignment_id", "id"]),
    trainingPackageId: getTextField(assignment, ["training_package_id", "package_id"]),
    status: getTextField(assignment, ["status"]),
    startDate: getTextField(assignment, ["start_date"]),
    endDate: getTextField(assignment, ["end_date"]),
  };
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
          setPackagesData(null);
          setAssignmentsData(null);
          return;
        }

        if (!assignmentsPayload.ok) {
          setLoadError(assignmentsPayload.error.message);
          setPackagesData(null);
          setAssignmentsData(null);
          return;
        }

        setPackagesData(packagesPayload.data);
        setAssignmentsData(assignmentsPayload.data);
      } catch {
        if (active) {
          setLoadError("Unable to load packages and assignments.");
          setPackagesData(null);
          setAssignmentsData(null);
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

  const packages = packagesData ? getArrayItems(packagesData) : [];
  const assignments = assignmentsData ? getArrayItems(assignmentsData) : [];
  const hasPackageOptions = packages.some((pkg) => Boolean(getEntityId(pkg)));

  useEffect(() => {
    if (formState.training_package_id || !hasPackageOptions || !packagesData) {
      return;
    }

    const firstPackageId = getArrayItems(packagesData)
      .map((pkg) => getEntityId(pkg))
      .find((value) => Boolean(value));

    if (firstPackageId) {
      setFormState((current) => ({
        ...current,
        training_package_id: firstPackageId,
      }));
    }
  }, [formState.training_package_id, hasPackageOptions, packagesData]);

  async function refreshAssignments() {
    const response = await fetch(`/api/pt/clients/${clientId}/assignments`, { cache: "no-store" });
    const payload = (await response.json()) as JsonApiResponse;

    if (!payload.ok) {
      throw new Error(payload.error.message);
    }

    setAssignmentsData(payload.data);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
        training_package_id: hasPackageOptions ? current.training_package_id : "",
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
      title="Assign Training Package"
      user={user}
      navigation={
        <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/pt/clients">Back to PT Clients</Link>
        </nav>
      }
    >
      <Section title="Header">
        <p style={{ margin: 0 }}>
          <strong>Client Id:</strong> <code>{clientId || "Unavailable"}</code>
        </p>
        <p style={{ margin: 0 }}>Assignments and packages are loaded only through PT BFF routes under <code>/api/*</code>.</p>
      </Section>

      {loading ? (
        <LoadingBlock
          title="Loading assignment data"
          message="Fetching available PT packages and this client's existing assignments."
        />
      ) : null}

      {loadError ? <ErrorBlock title="Unable to load assignment data" message={loadError} /> : null}

      <Section title="Existing Assignments">
        {!loading && !loadError && assignments.length === 0 ? (
          <p>No assignments returned for this client.</p>
        ) : null}

        {assignments.map((assignment, index) => {
          const summary = getAssignmentSummary(assignment);

          return (
            <div
              key={summary.assignmentId ?? `assignment-${index}`}
              style={{ borderTop: index > 0 ? "1px solid #334155" : undefined, paddingTop: index > 0 ? 12 : 0 }}
            >
              <p style={{ margin: 0 }}>
                <strong>Assignment:</strong> <code>{summary.assignmentId ?? "Unavailable"}</code>
              </p>
              <p style={{ margin: 0 }}>
                <strong>Package:</strong> <code>{summary.trainingPackageId ?? "Unavailable"}</code>
              </p>
              <p style={{ margin: 0 }}>
                <strong>Status:</strong> {summary.status ?? "Unavailable"}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Dates:</strong> {summary.startDate ?? "No start date"} to {summary.endDate ?? "No end date"}
              </p>
              <JsonPreview value={assignment} />
            </div>
          );
        })}

        {!loading && !loadError ? <JsonPreview value={assignmentsData ?? []} /> : null}
      </Section>

      <Section title="Available Packages">
        {!loading && !loadError && packages.length === 0 ? <p>No PT packages returned.</p> : null}

        {packages.map((pkg, index) => {
          const packageId = getEntityId(pkg);
          const packageName = getTextField(pkg, ["name", "title", "package_name"]);

          return (
            <div
              key={packageId ?? `package-${index}`}
              style={{ borderTop: index > 0 ? "1px solid #334155" : undefined, paddingTop: index > 0 ? 12 : 0 }}
            >
              <p style={{ margin: 0 }}>
                <strong>Name:</strong> {packageName ?? "Unavailable"}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Id:</strong> <code>{packageId ?? "Unavailable"}</code>
              </p>
              <JsonPreview value={pkg} />
            </div>
          );
        })}

        {!loading && !loadError ? <JsonPreview value={packagesData ?? []} /> : null}
      </Section>

      <Section title="Assign Package Form">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Training Package Id</span>
            {hasPackageOptions ? (
              <select
                value={formState.training_package_id}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    training_package_id: event.target.value,
                  }))
                }
                disabled={submitting || loading || Boolean(loadError)}
              >
                <option value="" disabled>
                  Select a package
                </option>
                {packages.map((pkg, index) => {
                  const packageId = getEntityId(pkg);

                  if (!packageId) {
                    return null;
                  }

                  return (
                    <option key={packageId} value={packageId}>
                      {getPackageLabel(pkg, index)}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                type="text"
                value={formState.training_package_id}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    training_package_id: event.target.value,
                  }))
                }
                placeholder="Enter training package id"
                disabled={submitting || loading || Boolean(loadError)}
              />
            )}
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Start Date</span>
            <input
              type="date"
              value={formState.start_date}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  start_date: event.target.value,
                }))
              }
              disabled={submitting || loading || Boolean(loadError)}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>End Date</span>
            <input
              type="date"
              value={formState.end_date}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  end_date: event.target.value,
                }))
              }
              disabled={submitting || loading || Boolean(loadError)}
            />
          </label>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" disabled={submitting || loading || Boolean(loadError)}>
              {submitting ? "Assigning..." : "Assign Package"}
            </button>
            {submitSuccess ? <span>{submitSuccess}</span> : null}
          </div>
        </form>

        {submitError ? <ErrorBlock title="Unable to create assignment" message={submitError} /> : null}
      </Section>
    </PageShell>
  );
}
