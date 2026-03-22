import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export default function PTNotificationsRoute() {
  return (
    <NotificationsPage
      role="pt"
      title="Notifications"
      description="Relevant client activity appears here when a linked client logs a real workout or another supported in-app event occurs."
    />
  );
}
