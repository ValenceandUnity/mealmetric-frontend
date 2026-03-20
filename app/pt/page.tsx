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

  return (
    <PageShell
      title="PT Dashboard"
      user={user}
      navigation={
        <>
          <Link href="/pt/clients">Clients</Link>{" "}
          <Link href="/pt/settings">Settings</Link>{" "}
          <Link href="/">Back to Landing</Link>
        </>
      }
      actions={<LogoutButton />}
    >
      {loading ? (
        <LoadingBlock
          title="Loading dashboard data"
          message="Calling /api/pt/dashboard through the BFF."
        />
      ) : null}

      {errorMessage ? <ErrorBlock title="Unable to load PT dashboard" message={errorMessage} /> : null}

      {dashboardData ? (
        <>
          <Section title="Profile">
            <JsonPreview value={dashboardData.profile} />
          </Section>

          <Section title="Clients Preview">
            <JsonPreview value={dashboardData.clients} />
          </Section>

          <Section title="Packages Preview">
            <JsonPreview value={dashboardData.packages} />
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
