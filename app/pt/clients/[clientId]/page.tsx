"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import { LoadingBlock } from "@/components/ui/LoadingBlock";

export default function PTClientDetailPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  if (status === "loading") {
    return <LoadingBlock title="Loading client detail" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  return (
    <PageShell
      title="PT Client Detail"
      user={user}
      navigation={<Link href="/pt/clients">Back to PT Clients</Link>}
    >
      <Section title="Unsupported Route">
        <p>PT client detail is not available in this frontend because the backend does not support a client detail endpoint.</p>
      </Section>
    </PageShell>
  );
}
