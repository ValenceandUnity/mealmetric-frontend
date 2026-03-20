"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JsonPreview } from "@/components/JsonPreview";
import { LogoutButton } from "@/components/LogoutButton";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, ClientHomeResponse } from "@/lib/types/api";

type ClientHomeApiResponse = ApiResponse<ClientHomeResponse>;

export default function ClientDashboardPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [homeData, setHomeData] = useState<ClientHomeResponse | null>(null);
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
        const response = await fetch("/api/client/home", { cache: "no-store" });
        const payload = (await response.json()) as ClientHomeApiResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setHomeData(null);
          return;
        }

        setHomeData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load the client home slice.");
          setHomeData(null);
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
    return <LoadingBlock title="Loading client session" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client access requires an authenticated client session." />;
  }

  return (
    <PageShell
      title="Client Home"
      user={user}
      navigation={
        <>
          <Link href="/client/training">Training</Link>{" "}
          <Link href="/client/metrics">Metrics</Link>{" "}
          <Link href="/client/meal-plans">Meal Plans</Link>{" "}
          <Link href="/client/orders">Orders</Link>{" "}
          <Link href="/client/subscriptions">Subscriptions</Link>{" "}
          <Link href="/client/pickups">Pickups</Link>
        </>
      }
      actions={<LogoutButton />}
    >
      {loading ? (
        <LoadingBlock
          title="Loading home data"
          message="Calling /api/client/home through the BFF."
        />
      ) : null}

      {errorMessage ? <ErrorBlock title="Unable to load home" message={errorMessage} /> : null}

      {homeData ? (
        <>
          <Section title="Overview">
            <JsonPreview value={homeData.overview} />
          </Section>

          <Section title="Assignments Preview">
            <JsonPreview value={homeData.assignments} />
          </Section>

          <Section title="Meal Plans Preview">
            <JsonPreview value={homeData.mealPlans} />
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
