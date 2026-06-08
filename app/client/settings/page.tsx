"use client";

import { ClientSettingsRouteSurface } from "@/components/client/ClientSettingsRouteSurface";

const APP_VERSION = "0.1.0";

export default function ClientSettingsPage() {
  return <ClientSettingsRouteSurface appVersion={APP_VERSION} />;
}
