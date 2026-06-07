"use client";

import { useParams, useSearchParams } from "next/navigation";

import { ClientWorkoutHistoryLedger } from "@/components/client/ClientWorkoutHistoryLedger";

export default function PTClientLogHistoryPage() {
  const params = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();
  const clientId = typeof params?.clientId === "string" ? params.clientId : "";
  const clientEmail = searchParams.get("clientEmail")?.trim() ?? "";
  const title = clientEmail.length > 0 ? clientEmail : "Client Log History";

  return (
    <ClientWorkoutHistoryLedger
      viewerRole="pt"
      historyApiPath={`/api/pt/clients/${clientId}/workout-logs`}
      backHref="/pt/clients"
      backLabel="Back to clients"
      pageTitle={title}
      pageSubtitle="Read-only log history for a linked client, filtered through the protected PT BFF route."
      sectionDescription="Review saved workout entries from newest to oldest for this linked client."
    />
  );
}
