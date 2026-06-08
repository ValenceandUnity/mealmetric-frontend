"use client";

import { useEffect, useMemo, useState } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type {
  ApiResponse,
  NotificationItem,
  NotificationListPayload,
  PTClientInvitation,
  PTClientInvitationListResponse,
  UserRole,
} from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type NotificationsRouteSurfaceProps = {
  role: UserRole;
  title: string;
  description: string;
  activePath: string;
};

type NotificationListApiResponse = ApiResponse<NotificationListPayload>;
type NotificationItemApiResponse = ApiResponse<NotificationItem>;
type InvitationListApiResponse = ApiResponse<PTClientInvitationListResponse>;
type InvitationItemApiResponse = ApiResponse<PTClientInvitation>;

type StateCardProps = {
  title: string;
  message: string;
  role?: "status" | "alert";
};

type ActionPillButtonProps = {
  onClick: () => void;
  children: string;
  tone?: "purple" | "yellow";
  disabled?: boolean;
  ariaLabel?: string;
};

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

function ActionPillButton({
  onClick,
  children,
  tone = "yellow",
  disabled = false,
  ariaLabel,
}: ActionPillButtonProps) {
  return (
    <button
      type="button"
      className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function StateCard({ title, message, role = "status" }: StateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy" role={role} aria-live="polite">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
    </MobileCard>
  );
}

export function NotificationsRouteSurface({
  role,
  title,
  description,
  activePath,
}: NotificationsRouteSurfaceProps) {
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

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (
          notification.type === "pt_client_invitation_received" &&
          notification.related_entity_type === "pt_client_invitation"
        ) {
          return !pendingInvitations.some(
            (invitation) => invitation.id === notification.related_entity_id,
          );
        }

        return true;
      }),
    [notifications, pendingInvitations],
  );

  const unreadCount = useMemo(
    () => visibleNotifications.filter((item) => !item.is_read).length,
    [visibleNotifications],
  );

  if (status === "loading") {
    return <LoadingBlock title="Loading notifications" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Notifications require an authenticated session." />;
  }

  return (
    <MobileAppShell
      user={user}
      activePath={activePath}
      greeting={formatDisplayNameFromUser(user)}
      title={title}
      subtitle={description}
    >
      {loading ? (
        <MobileSection
          eyebrow="Loading"
          title="Loading notifications"
          description="Fetching your in-app notifications."
        >
          <StateCard title="Loading notifications" message="Fetching your in-app notifications." />
        </MobileSection>
      ) : null}

      {errorMessage ? (
        <MobileSection
          eyebrow="Unavailable"
          title="Unable to load notifications"
          description="This route stays on the existing authenticated notifications and invitation BFF workflow and does not fall back to direct backend calls."
        >
          <StateCard title="Unable to load notifications" message={errorMessage} role="alert" />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <MobileSection
            eyebrow={role === "client" ? "Client notifications" : "PT notifications"}
            title="Notification summary"
            description="Only the current notification and invitation routes are used here. No preferences, archive controls, or extra notification settings are introduced."
          >
            <MobileStatCard
              label="Notifications"
              value={visibleNotifications.length}
              progressText="Notifications returned by /api/notifications."
            />
            <MobileStatCard
              label="Unread"
              value={unreadCount}
              progressText="Derived locally from the current notifications payload."
            />
            {role === "client" ? (
              <MobileStatCard
                label="Pending invites"
                value={pendingInvitations.length}
                progressText="Pending PT roster invitations returned by /api/client/invitations."
              />
            ) : null}
          </MobileSection>

          <MobileSection
            eyebrow="Activity"
            title="Notifications"
            description="Unread notifications can still be marked as read, and client invitation actions remain limited to the currently supported accept/decline routes."
          >
            {pendingInvitations.length > 0 || visibleNotifications.length > 0 ? (
              <div className="mobile-pt-detail-stack">
                {pendingInvitations.map((invitation) => (
                  <MobileCard
                    key={invitation.id}
                    as="article"
                    variant="action"
                    className="mobile-pt-detail-action-card"
                  >
                    <div className="mobile-pt-client-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">pending invite</p>
                        <h3 className="mobile-section__title">PT roster invitation</h3>
                        <p className="mobile-section__description">
                          {invitation.pt_email} invited you to join their PT roster.
                        </p>
                      </div>
                      <span className="mobile-pill mobile-pill--yellow">Pending</span>
                    </div>

                    <dl className="mobile-pt-fact-grid">
                      <div>
                        <dt>Created</dt>
                        <dd>{formatDateTime(invitation.created_at)}</dd>
                      </div>
                      <div>
                        <dt>Client</dt>
                        <dd>{invitation.client_email}</dd>
                      </div>
                    </dl>

                    <div className="mobile-pt-actions">
                      <ActionPillButton
                        onClick={() => {
                          void respondToInvitation(invitation.id, "accept");
                        }}
                        tone="yellow"
                        disabled={updatingInvitationId === invitation.id}
                        ariaLabel={`Accept PT roster invitation from ${invitation.pt_email}`}
                      >
                        {updatingInvitationId === invitation.id ? "Updating..." : "Accept"}
                      </ActionPillButton>
                      <ActionPillButton
                        onClick={() => {
                          void respondToInvitation(invitation.id, "decline");
                        }}
                        tone="purple"
                        disabled={updatingInvitationId === invitation.id}
                        ariaLabel={`Decline PT roster invitation from ${invitation.pt_email}`}
                      >
                        Decline
                      </ActionPillButton>
                    </div>
                  </MobileCard>
                ))}

                {visibleNotifications.map((notification) => (
                  <MobileCard
                    key={notification.id}
                    as="article"
                    variant={notification.is_read ? "soft" : "action"}
                    className="mobile-pt-detail-action-card"
                  >
                    <div className="mobile-pt-client-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">
                          {notification.type.replaceAll("_", " ")}
                        </p>
                        <h3 className="mobile-section__title">{notification.title}</h3>
                        <p className="mobile-section__description">{notification.message}</p>
                      </div>
                      <span
                        className={`mobile-pill ${
                          notification.is_read ? "mobile-pill--purple" : "mobile-pill--yellow"
                        }`}
                      >
                        {notification.is_read ? "Read" : "Unread"}
                      </span>
                    </div>

                    <dl className="mobile-pt-fact-grid">
                      <div>
                        <dt>Created</dt>
                        <dd>{formatDateTime(notification.created_at)}</dd>
                      </div>
                      {notification.related_entity_type && notification.related_entity_id ? (
                        <div>
                          <dt>{notification.related_entity_type}</dt>
                          <dd>{notification.related_entity_id}</dd>
                        </div>
                      ) : null}
                    </dl>

                    {!notification.is_read ? (
                      <div className="mobile-pt-actions">
                        <ActionPillButton
                          onClick={() => {
                            void markAsRead(notification.id);
                          }}
                          tone="yellow"
                          disabled={updatingId === notification.id}
                          ariaLabel={`Mark ${notification.title} as read`}
                        >
                          {updatingId === notification.id ? "Updating..." : "Mark as read"}
                        </ActionPillButton>
                      </div>
                    ) : null}
                  </MobileCard>
                ))}
              </div>
            ) : (
              <StateCard
                title="No notifications"
                message="High-value in-app events will appear here when they actually happen."
              />
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
