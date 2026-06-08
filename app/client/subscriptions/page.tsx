"use client";

import { ClientCommerceRouteSurface } from "@/components/client/ClientCommerceRouteSurface";
import { adaptSubscriptions } from "@/lib/adapters/client-records";

export default function ClientSubscriptionsPage() {
  return (
    <ClientCommerceRouteSurface
      activePath="/client/subscriptions"
      adapter={adaptSubscriptions}
      debugLabel="Subscriptions payload fallback"
      emptyMessage="Subscription details will appear here when the BFF returns structured records."
      emptyTitle="No subscriptions returned"
      errorTitle="Unable to load subscriptions"
      fetchErrorFallback="Unable to load subscriptions."
      fetchPath="/api/client/subscriptions"
      loadingMessage="Fetching subscription records through the BFF."
      loadingTitle="Loading subscriptions"
      overviewDescription="This mobile rebuild keeps the existing subscriptions route read-only and limited to the subscription records already returned through the protected client BFF."
      overviewTitle="Subscription activity"
      pageSubtitle="Read-only subscription activity returned through the protected client workspace."
      pageTitle="Subscriptions"
      recordsDescription="Existing subscription records remain read-only on mobile and do not introduce pause, resume, renewal, or cancellation actions."
      recordsTitle="Active subscriptions"
      redirectMessage="Subscriptions require an authenticated client session."
      summaryDescription="Summary cards reflect only the values currently exposed by the existing client subscriptions route."
      summaryTitle="Subscription summary"
    />
  );
}
