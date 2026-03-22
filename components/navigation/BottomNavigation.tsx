"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getNavItemsForRole,
  matchesNavItem,
} from "@/lib/navigation/app-shell";
import type { UserRole } from "@/lib/types/api";

function renderIcon(icon: string) {
  switch (icon) {
    case "training":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7.5h12M12 7.5v9m-3-3h6" />
        </svg>
      );
    case "log":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 5.5h7l3 3V18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-12.5Zm2 5h6m-6 3h6" />
        </svg>
      );
    case "metrics":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 17V9m6 8V6m6 11v-5" />
        </svg>
      );
    case "meal-plans":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 6h10l2 4-7 8-7-8 2-4Zm0 0 5 6 5-6" />
        </svg>
      );
    case "bookmarks":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5h8a1 1 0 0 1 1 1v13l-5-3-5 3V6a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case "clients":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4.5 19a4.5 4.5 0 0 1 9 0m2.5 0a3.5 3.5 0 0 1 4 0" />
        </svg>
      );
    case "operations":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v5m0 4v5M5 12h5m4 0h5" />
        </svg>
      );
    case "account":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 11.5 12 6l7 5.5V19a1 1 0 0 1-1 1h-3.5v-5h-5v5H6a1 1 0 0 1-1-1v-7.5Z" />
        </svg>
      );
  }
}

export function BottomNavigation({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = getNavItemsForRole(role);

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => {
        const isActive = matchesNavItem(pathname, item);
        const className = [
          "bottom-nav__item",
          isActive ? "bottom-nav__item--active" : "",
          item.disabled ? "bottom-nav__item--disabled" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            className={className}
            aria-disabled={item.disabled ? "true" : undefined}
            onClick={(event) => {
              if (item.disabled) {
                event.preventDefault();
              }
            }}
          >
            <span className="bottom-nav__icon">{renderIcon(item.icon)}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
