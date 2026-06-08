"use client";

import { ClientCommerceRouteSurface } from "@/components/client/ClientCommerceRouteSurface";
import { adaptPickups } from "@/lib/adapters/client-records";

export default function ClientPickupsPage() {
  return (
    <ClientCommerceRouteSurface
      activePath="/client/pickups"
      adapter={adaptPickups}
      debugLabel="Pickups payload fallback"
      emptyMessage="Pickup scheduling details will appear here when the BFF returns structured records."
      emptyTitle="No pickups returned"
      errorTitle="Unable to load pickups"
      fetchErrorFallback="Unable to load pickups."
      fetchPath="/api/client/pickups"
      loadingMessage="Fetching pickup records through the BFF."
      loadingTitle="Loading pickups"
      overviewDescription="This mobile rebuild keeps the existing pickups route read-only and limited to the pickup records already returned through the protected client BFF."
      overviewTitle="Pickup activity"
      pageSubtitle="Read-only pickup activity returned through the protected client workspace."
      pageTitle="Pickups"
      recordsDescription="Existing pickup records remain read-only on mobile and do not introduce scheduling, rescheduling, or fulfillment actions."
      recordsTitle="Scheduled pickups"
      redirectMessage="Pickups require an authenticated client session."
      summaryDescription="Summary cards reflect only the values currently exposed by the existing client pickups route."
      summaryTitle="Pickup summary"
    />
  );
}
