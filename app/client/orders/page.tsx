"use client";

import { ClientCommerceRouteSurface } from "@/components/client/ClientCommerceRouteSurface";
import { adaptOrders } from "@/lib/adapters/client-records";

export default function ClientOrdersPage() {
  return (
    <ClientCommerceRouteSurface
      activePath="/client/orders"
      adapter={adaptOrders}
      debugLabel="Orders payload fallback"
      emptyMessage="Order history will appear here when the client orders route returns structured records."
      emptyTitle="No orders returned"
      errorTitle="Unable to load orders"
      fetchErrorFallback="Unable to load orders."
      fetchPath="/api/client/orders"
      loadingMessage="Fetching order history through the BFF."
      loadingTitle="Loading orders"
      overviewDescription="This mobile rebuild keeps the existing orders route read-only and limited to the records already returned through the protected client BFF."
      overviewTitle="Order activity"
      pageSubtitle="Read-only order activity returned through the protected client workspace."
      pageTitle="Orders"
      recordsDescription="Existing order records remain read-only on mobile and do not introduce checkout, refund, or cancellation controls."
      recordsTitle="Order history"
      redirectMessage="Orders require an authenticated client session."
      summaryDescription="Summary cards reflect only the values currently exposed by the existing client orders route."
      summaryTitle="Order summary"
    />
  );
}
