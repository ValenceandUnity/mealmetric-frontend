"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { MobileTopHub } from "@/components/mobile/MobileTopHub";
import {
  getDefaultHeaderBackgroundPreference,
  getHeaderBackgroundStorageKey,
  HEADER_BACKGROUND_CHANGE_EVENT,
  isHeaderBackgroundRole,
  readHeaderBackgroundPreference,
} from "@/lib/client/header-background";
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
  avatarContent?: ReactNode;
  avatarLabel?: string;
  onAvatarClick?: () => void;
  avatarControls?: string;
  avatarExpanded?: boolean;
  avatarButtonLabel?: string;
  notificationSlot?: ReactNode;
  topHubAction?: ReactNode;
  showAvatar?: boolean;
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
  avatarContent,
  avatarLabel,
  onAvatarClick,
  avatarControls,
  avatarExpanded,
  avatarButtonLabel,
  notificationSlot,
  topHubAction,
  showAvatar = true,
  showTopHub = true,
  showBottomNav = true,
  activePath,
  statusStrip,
}: MobileAppShellProps) {
  const [headerBackgroundPreference, setHeaderBackgroundPreference] = useState(
    getDefaultHeaderBackgroundPreference(),
  );
  const resolvedInitials = showAvatar ? fallbackInitials(user, avatarInitials) : undefined;
  const resolvedTitle = title ?? "MealMetric";
  const headerBackgroundRole = isHeaderBackgroundRole(user?.role) ? user.role : null;

  useEffect(() => {
    if (!headerBackgroundRole) {
      setHeaderBackgroundPreference(getDefaultHeaderBackgroundPreference());
      return;
    }

    const role = headerBackgroundRole;

    function syncPreference() {
      setHeaderBackgroundPreference(readHeaderBackgroundPreference(role));
    }

    function handleStorage(event: StorageEvent) {
      if (event.key && event.key !== getHeaderBackgroundStorageKey(role)) {
        return;
      }

      syncPreference();
    }

    function handlePreferenceChange(event: Event) {
      const customEvent = event as CustomEvent<{ role?: string }>;
      if (customEvent.detail?.role && customEvent.detail.role !== role) {
        return;
      }

      syncPreference();
    }

    syncPreference();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(HEADER_BACKGROUND_CHANGE_EVENT, handlePreferenceChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(HEADER_BACKGROUND_CHANGE_EVENT, handlePreferenceChange);
    };
  }, [headerBackgroundRole]);

  const heroBackgroundStyle = useMemo(() => {
    if (
      headerBackgroundPreference.preset !== "custom-local-image" ||
      !headerBackgroundPreference.customImageDataUrl
    ) {
      return undefined;
    }

    return {
      "--mobile-top-hub-custom-image": `url("${headerBackgroundPreference.customImageDataUrl}")`,
    } as CSSProperties;
  }, [headerBackgroundPreference.customImageDataUrl, headerBackgroundPreference.preset]);
  const shouldRenderTopHub =
    showTopHub &&
    Boolean(
      title ||
        subtitle ||
        greeting ||
        searchPlaceholder ||
        resolvedInitials ||
        avatarContent ||
        notificationSlot ||
        topHubAction,
    );

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
            avatarContent={avatarContent}
            avatarLabel={avatarLabel}
            onAvatarClick={onAvatarClick}
            avatarControls={avatarControls}
            avatarExpanded={avatarExpanded}
            avatarButtonLabel={avatarButtonLabel}
            notificationSlot={notificationSlot}
            actionSlot={topHubAction}
            statusStrip={statusStrip}
            heroBackgroundPreset={headerBackgroundPreference.preset}
            heroBackgroundStyle={heroBackgroundStyle}
          />
        ) : null}
        <div className="mobile-shell__viewport">{children}</div>
      </div>
      {showBottomNav && user ? <MobileBottomNav role={user.role} activePath={activePath} /> : null}
    </div>
  );
}
