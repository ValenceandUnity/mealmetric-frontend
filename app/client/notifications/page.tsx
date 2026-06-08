import { NotificationsRouteSurface } from "@/components/notifications/NotificationsRouteSurface";

export default function ClientNotificationsRoute() {
  return (
    <NotificationsRouteSurface
      role="client"
      title="Client Notifications"
      description="Relevant training updates appear here when your trainer or workout activity creates a real in-app event."
      activePath="/client/notifications"
    />
  );
}
