"use client";

import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSessionBootstrap } from "@/lib/client/session";
import type {
  ApiResponse,
  NotificationItem,
  NotificationListPayload,
  PTClientInvitation,
  PTClientInvitationListResponse,
  UserRole,
} from "@/lib/types/api";

type NotificationsPageProps = {
  role: UserRole;
  title: string;
  description: string;
};

type NotificationListApiResponse = ApiResponse<NotificationListPayload>;
type NotificationItemApiResponse = ApiResponse<NotificationItem>;
type InvitationListApiResponse = ApiResponse<PTClientInvitationListResponse>;
type InvitationItemApiResponse = ApiResponse<PTClientInvitation>;

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function NotificationsPage({ role, title, description }: NotificationsPageProps) {
  const { status, user } = useSessionBootstrap({
    requiredRole: role,
    unauthenticatedRedirectTo: "/login",
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PTClientInvitation[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingInvitationId, setUpdatingInvitationId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== role) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [notificationsResponse, invitationsResponse] = await Promise.all([
          fetch("/api/notifications", { cache: "no-store" }),
          role === "client"
            ? fetch("/api/client/invitations", { cache: "no-store" })
            : Promise.resolve(null),
        ]);
        const payload = (await notificationsResponse.json()) as NotificationListApiResponse;
        const invitationsPayload = invitationsResponse
          ? ((await invitationsResponse.json()) as InvitationListApiResponse)
          : null;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setNotifications([]);
          setPendingInvitations([]);
          return;
        }

        if (invitationsPayload && !invitationsPayload.ok) {
          setErrorMessage(invitationsPayload.error.message);
          setNotifications([]);
          setPendingInvitations([]);
          return;
        }

        setNotifications(payload.data.items);
        setPendingInvitations(
          invitationsPayload
            ? invitationsPayload.data.items.filter((item) => item.status === "pending")
            : [],
        );
      } catch {
        if (active) {
          setErrorMessage("Unable to load notifications.");
          setNotifications([]);
          setPendingInvitations([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [role, status, user]);

  async function markAsRead(notificationId: string) {
    setUpdatingId(notificationId);
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      const payload = (await response.json()) as NotificationItemApiResponse;

      if (!payload.ok) {
        setErrorMessage(payload.error.message);
        return;
      }

      setNotifications((current) =>
        current.map((item) => (item.id === payload.data.id ? payload.data : item)),
      );
    } catch {
      setErrorMessage("Unable to update notification.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function respondToInvitation(invitationId: string, action: "accept" | "decline") {
    setUpdatingInvitationId(invitationId);
    try {
      const response = await fetch(`/api/client/invitations/${invitationId}/${action}`, {
        method: "POST",
      });
      const payload = (await response.json()) as InvitationItemApiResponse;

      if (!payload.ok) {
        setErrorMessage(payload.error.message);
        return;
      }

      setPendingInvitations((current) => current.filter((item) => item.id !== invitationId));
      setNotifications((current) =>
        current.map((item) =>
          item.related_entity_type === "pt_client_invitation" && item.related_entity_id === invitationId
            ? { ...item, is_read: true }
            : item,
        ),
      );
    } catch {
      setErrorMessage(
        action === "accept" ? "Unable to accept invitation." : "Unable to decline invitation.",
      );
    } finally {
      setUpdatingInvitationId(null);
    }
  }

  const visibleNotifications = notifications.filter((notification) => {
    if (
      notification.type === "pt_client_invitation_received" &&
      notification.related_entity_type === "pt_client_invitation"
    ) {
      return !pendingInvitations.some((invitation) => invitation.id === notification.related_entity_id);
    }
    return true;
  });

  if (status === "loading") {
    return <LoadingBlock title="Loading notifications" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Notifications require an authenticated session." />;
  }

  return (
    <PageShell title={title} user={user} subtitle={description}>
      {loading ? <LoadingBlock title="Loading notifications" message="Fetching your in-app notifications." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load notifications" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        pendingInvitations.length > 0 || visibleNotifications.length > 0 ? (
          <div className="stacked-list">
            {pendingInvitations.map((invitation) => (
              <Card
                key={invitation.id}
                className="notification-card"
                variant="soft"
              >
                <PageHeader
                  eyebrow="pending invite"
                  title="PT roster invitation"
                  description={`${invitation.pt_email} invited you to join their PT roster.`}
                  status={{
                    label: "Pending",
                    tone: "accent",
                  }}
                />
                <div className="notification-card__meta">
                  <span>Created {formatDateTime(invitation.created_at)}</span>
                  <span>Client: {invitation.client_email}</span>
                </div>
                <div className="action-row">
                  <button
                    type="button"
                    onClick={() => void respondToInvitation(invitation.id, "accept")}
                    disabled={updatingInvitationId === invitation.id}
                  >
                    {updatingInvitationId === invitation.id ? "Updating..." : "Accept"}
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => void respondToInvitation(invitation.id, "decline")}
                    disabled={updatingInvitationId === invitation.id}
                  >
                    Decline
                  </button>
                </div>
              </Card>
            ))}

            {visibleNotifications.map((notification) => (
              <Card
                key={notification.id}
                className="notification-card"
                variant={notification.is_read ? "ghost" : "soft"}
              >
                <PageHeader
                  eyebrow={notification.type.replaceAll("_", " ")}
                  title={notification.title}
                  description={notification.message}
                  status={{
                    label: notification.is_read ? "Read" : "Unread",
                    tone: notification.is_read ? "neutral" : "accent",
                  }}
                />
                <div className="notification-card__meta">
                  <span>Created {formatDateTime(notification.created_at)}</span>
                  {notification.related_entity_type && notification.related_entity_id ? (
                    <span>
                      {notification.related_entity_type}: {notification.related_entity_id}
                    </span>
                  ) : null}
                </div>
                {!notification.is_read ? (
                  <div className="action-row">
                    <button
                      type="button"
                      onClick={() => void markAsRead(notification.id)}
                      disabled={updatingId === notification.id}
                    >
                      {updatingId === notification.id ? "Updating..." : "Mark as read"}
                    </button>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No notifications"
            message="High-value in-app events will appear here when they actually happen."
          />
        )
      ) : null}
    </PageShell>
  );
}
