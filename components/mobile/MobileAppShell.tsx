import type { ReactNode } from "react";

import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { MobileTopHub } from "@/components/mobile/MobileTopHub";
import type { SessionUser } from "@/lib/types/api";

type MobileAppShellProps = {
  children: ReactNode;
  className?: string;
  user?: SessionUser;
  title?: string;
  subtitle?: string;
  greeting?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  avatarInitials?: string;
  avatarLabel?: string;
  onAvatarClick?: () => void;
  avatarControls?: string;
  avatarExpanded?: boolean;
  avatarButtonLabel?: string;
  notificationSlot?: ReactNode;
  topHubAction?: ReactNode;
  showTopHub?: boolean;
  showBottomNav?: boolean;
  activePath?: string;
  statusStrip?: ReactNode;
};

function fallbackInitials(user?: SessionUser, avatarInitials?: string): string | undefined {
  if (avatarInitials) {
    return avatarInitials;
  }

  if (!user) {
    return undefined;
  }

  const [localPart] = user.email.split("@");
  return localPart.slice(0, 2).toUpperCase() || user.role.slice(0, 2).toUpperCase();
}

export function MobileAppShell({
  children,
  className,
  user,
  title,
  subtitle,
  greeting,
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  avatarInitials,
  avatarLabel,
  onAvatarClick,
  avatarControls,
  avatarExpanded,
  avatarButtonLabel,
  notificationSlot,
  topHubAction,
  showTopHub = true,
  showBottomNav = true,
  activePath,
  statusStrip,
}: MobileAppShellProps) {
  const resolvedInitials = fallbackInitials(user, avatarInitials);
  const resolvedTitle = title ?? "MealMetric";
  const shouldRenderTopHub =
    showTopHub &&
    Boolean(title || subtitle || greeting || searchPlaceholder || resolvedInitials || notificationSlot || topHubAction);

  return (
    <div
      className={[
        "mobile-shell",
        "mobile-app-surface",
        "mobile-grid-background",
        "mobile-safe-bottom",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mobile-shell__content">
        {shouldRenderTopHub ? (
          <MobileTopHub
            greeting={greeting}
            title={resolvedTitle}
            subtitle={subtitle}
            searchLabel={searchLabel}
            searchPlaceholder={searchPlaceholder}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            avatarInitials={resolvedInitials}
            avatarLabel={avatarLabel}
            onAvatarClick={onAvatarClick}
            avatarControls={avatarControls}
            avatarExpanded={avatarExpanded}
            avatarButtonLabel={avatarButtonLabel}
            notificationSlot={notificationSlot}
            actionSlot={topHubAction}
            statusStrip={statusStrip}
          />
        ) : null}
        <div className="mobile-shell__viewport">{children}</div>
      </div>
      {showBottomNav && user ? <MobileBottomNav role={user.role} activePath={activePath} /> : null}
    </div>
  );
}
