import type { ChangeEventHandler, ReactNode } from "react";
import { useId } from "react";

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
  avatarLabel?: string;
  notificationSlot?: ReactNode;
  actionSlot?: ReactNode;
  statusStrip?: ReactNode;
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
  avatarLabel,
  notificationSlot,
  actionSlot,
  statusStrip,
}: MobileTopHubProps) {
  const searchId = useId();

  const handleChange: ChangeEventHandler<HTMLInputElement> | undefined = onSearchChange
    ? (event) => {
        onSearchChange(event.target.value);
      }
    : undefined;

  return (
    <header className={["mobile-top-hub", className ?? ""].filter(Boolean).join(" ")}>
      <div className="mobile-top-hub__hero">
        <div className="mobile-top-hub__hero-media" aria-hidden="true">
          <div className="mobile-top-hub__hero-image" />
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
            {avatarInitials ? (
              <span
                className="mobile-top-hub__avatar"
                role="img"
                aria-label={avatarLabel ?? `${avatarInitials} avatar`}
              >
                {avatarInitials}
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
