import { NotificationsRouteSurface } from "@/components/notifications/NotificationsRouteSurface";

export default function PTNotificationsRoute() {
  return (
    <NotificationsRouteSurface
      role="pt"
      title="PT Notifications"
      description="Relevant client activity appears here when a linked client logs a real workout or another supported in-app event occurs."
      activePath="/pt/notifications"
    />
  );
}
