"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { RecordCard } from "@/components/cards/RecordCard";
import { PageShell } from "@/components/layout/PageShell";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import {
  adaptPTClientSnapshot,
  findClientById,
} from "@/lib/adapters/client-records";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type PTClientsApiResponse = ApiResponse<JsonValue>;

export default function PTClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = typeof params?.clientId === "string" ? params.clientId : "";

  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [clientsData, setClientsData] = useState<JsonValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt" || !clientId) {
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
          setErrorMessage("Unable to load client detail.");
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
  }, [clientId, status, user]);

  if (status === "loading") {
    return <LoadingBlock title="Loading client detail" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  const clientRecord = findClientById(clientsData, clientId);
  const snapshot = adaptPTClientSnapshot(clientRecord, clientId);

  return (
    <PageShell
      title={snapshot.name}
      user={user}
      navigation={
        <>
          <Link className="link-button" href="/pt/clients">
            Back to clients
          </Link>
          <Link className="link-button" href={`/pt/clients/${clientId}/metrics`}>
            Metrics
          </Link>
          <Link className="link-button" href={`/pt/clients/${clientId}/assign`}>
            Training
          </Link>
          <Link className="link-button" href={`/pt/clients/${clientId}/recommend-meal-plan`}>
            Meal plans
          </Link>
        </>
      }
    >
      {loading ? <LoadingBlock title="Loading client profile" message="Resolving this client from the PT clients route." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load client detail" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Section title="Client snapshot">
            <RecordCard
              eyebrow="Client overview"
              title={snapshot.name}
              description={snapshot.summary}
              metadata={snapshot.metadata}
              footer={
                <>
                  <Link className="link-button" href={`/pt/clients/${clientId}/metrics`}>
                    Review metrics
                  </Link>
                  <Link className="link-button" href={`/pt/clients/${clientId}/assign`}>
                    Assign training
                  </Link>
                  <Link className="link-button" href={`/pt/clients/${clientId}/recommend-meal-plan`}>
                    Recommend meal plan
                  </Link>
                </>
              }
            />
          </Section>

          <Section title="Next actions">
            <div className="stacked-list">
              <RecordCard
                eyebrow="Metrics"
                title="Track progress"
                description="Review the client metrics slice in a dedicated summary view."
                metadata={[{ label: "Route", value: `/pt/clients/${clientId}/metrics` }]}
                footer={
                  <Link className="link-button link-button--accent" href={`/pt/clients/${clientId}/metrics`}>
                    Open metrics
                  </Link>
                }
              />
              <RecordCard
                eyebrow="Training"
                title="Manage assignments"
                description="Create new assignments and review the client’s current training workload."
                metadata={[{ label: "Route", value: `/pt/clients/${clientId}/assign` }]}
                footer={
                  <Link className="link-button" href={`/pt/clients/${clientId}/assign`}>
                    Open assignment flow
                  </Link>
                }
              />
              <RecordCard
                eyebrow="Meal plans"
                title="Guide nutrition planning"
                description="Recommend an existing meal plan with rationale and timing through the PT BFF workflow."
                metadata={[{ label: "Route", value: `/pt/clients/${clientId}/recommend-meal-plan` }]}
                footer={
                  <Link className="link-button" href={`/pt/clients/${clientId}/recommend-meal-plan`}>
                    Open recommendation flow
                  </Link>
                }
              />
            </div>
          </Section>

          {!clientRecord ? (
            <Section title="Fallback detail">
              <EmptyState
                title="Dedicated client detail endpoint unavailable"
                message="This view is assembled from the PT clients collection because the backend does not expose a direct client-detail route."
              />
              {clientsData ? <DebugPreview value={clientsData} label="PT clients collection fallback" /> : null}
            </Section>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
