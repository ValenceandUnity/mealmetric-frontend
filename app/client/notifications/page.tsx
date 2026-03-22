import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export default function ClientNotificationsRoute() {
  return (
    <NotificationsPage
      role="client"
      title="Notifications"
      description="Relevant training updates appear here when your trainer or workout activity creates a real in-app event."
    />
  );
}
