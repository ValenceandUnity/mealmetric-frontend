"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JsonPreview, getArrayItems, getEntityId } from "@/components/JsonPreview";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import { getTextField } from "@/lib/json/object";
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

  const clients = clientsData ? getArrayItems(clientsData) : [];

  if (status === "loading") {
    return <LoadingBlock title="Loading PT clients" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  return (
    <PageShell
      title="PT Clients"
      user={user}
      navigation={
        <>
          <Link href="/pt">Back to PT Dashboard</Link>{" "}
          <Link href="/pt/settings">Settings</Link>
        </>
      }
    >
      {loading ? (
        <LoadingBlock title="Loading clients" message="Calling /api/pt/clients through the BFF." />
      ) : null}

      {errorMessage ? <ErrorBlock title="Unable to load PT clients" message={errorMessage} /> : null}

      {!loading && !errorMessage && clients.length === 0 ? (
        <Section title="No clients returned">
          <JsonPreview value={clientsData ?? []} />
        </Section>
      ) : null}

      {clients.map((client, index) => {
        const clientId = getEntityId(client);
        const name = getTextField(client, ["name", "full_name"]);
        const email = getTextField(client, ["email"]);

        return (
          <Section key={clientId ?? `client-${index}`} title={name ?? `Client #${index + 1}`}>
            {clientId ? (
              <p>
                <strong>Id:</strong> <code>{clientId}</code>
              </p>
            ) : null}
            {email ? (
              <p>
                <strong>Email:</strong> {email}
              </p>
            ) : null}

            {clientId ? (
              <nav>
                <Link href={`/pt/clients/${clientId}/metrics`}>View Metrics</Link>
                {" | "}
                <Link href={`/pt/clients/${clientId}/assign`}>Assign Training Package</Link>
                {" | "}
                <Link href={`/pt/clients/${clientId}/recommend-meal-plan`}>Recommend Meal Plan</Link>
              </nav>
            ) : null}

            {!name && !email && !clientId ? <JsonPreview value={client} /> : null}
            {name || email || clientId ? <JsonPreview value={client} /> : null}
          </Section>
        );
      })}
    </PageShell>
  );
}
