import type { CSSProperties, ChangeEventHandler, ReactNode } from "react";
import { useId } from "react";

import type { HeaderBackgroundPreset } from "@/lib/client/header-background";

type MobileTopHubProps = {
  greeting?: string;
  title: string;
  subtitle?: string;
  className?: string;
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
  actionSlot?: ReactNode;
  statusStrip?: ReactNode;
  heroBackgroundPreset?: HeaderBackgroundPreset;
  heroBackgroundStyle?: CSSProperties;
};

export function MobileTopHub({
  greeting,
  title,
  subtitle,
  className,
  searchLabel = "Search",
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
  actionSlot,
  statusStrip,
  heroBackgroundPreset = "default",
  heroBackgroundStyle,
}: MobileTopHubProps) {
  const searchId = useId();
  const resolvedAvatarLabel =
    avatarButtonLabel ?? avatarLabel ?? (avatarInitials ? `${avatarInitials} avatar` : "Avatar");

  const handleChange: ChangeEventHandler<HTMLInputElement> | undefined = onSearchChange
    ? (event) => {
        onSearchChange(event.target.value);
      }
    : undefined;

  return (
    <header className={["mobile-top-hub", className ?? ""].filter(Boolean).join(" ")}>
      <div
        className="mobile-top-hub__hero"
        data-header-background={heroBackgroundPreset}
      >
        <div className="mobile-top-hub__hero-media" aria-hidden="true">
          <div className="mobile-top-hub__hero-image" style={heroBackgroundStyle} />
          <div className="mobile-top-hub__hero-grid" />
        </div>
        <div className="mobile-top-hub__header">
          <div className="mobile-top-hub__copy">
            {greeting ? <p className="mobile-top-hub__greeting">{greeting}</p> : null}
            <h1 className="mobile-top-hub__title">{title}</h1>
            {subtitle ? <p className="mobile-top-hub__subtitle">{subtitle}</p> : null}
          </div>
          <div className="mobile-top-hub__utility">
            {notificationSlot}
            {(avatarContent || avatarInitials) && onAvatarClick ? (
              <button
                type="button"
                className="mobile-top-hub__avatar mobile-focus-ring"
                aria-label={resolvedAvatarLabel}
                aria-controls={avatarControls}
                aria-expanded={avatarExpanded}
                onClick={onAvatarClick}
              >
                {avatarContent ?? avatarInitials}
              </button>
            ) : avatarContent || avatarInitials ? (
              <span
                className="mobile-top-hub__avatar"
                role="img"
                aria-label={resolvedAvatarLabel}
              >
                {avatarContent ?? avatarInitials}
              </span>
            ) : null}
          </div>
        </div>
        {statusStrip ? <div className="mobile-top-hub__status-strip">{statusStrip}</div> : null}
      </div>
      {searchPlaceholder ? (
        <div className="mobile-top-hub__search-field">
          <label className="sr-only" htmlFor={searchId}>
            {searchLabel}
          </label>
          <div className="mobile-top-hub__search">
            <span className="mobile-top-hub__search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m21 21-4.35-4.35" />
                <circle cx="11" cy="11" r="5.5" />
              </svg>
            </span>
            <input
              id={searchId}
              className="mobile-top-hub__search-input mobile-focus-ring"
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              readOnly={searchValue !== undefined && !onSearchChange}
              onChange={handleChange}
              aria-label={searchLabel}
            />
          </div>
        </div>
      ) : null}
      {actionSlot ? <div className="mobile-top-hub__actions">{actionSlot}</div> : null}
    </header>
  );
}
