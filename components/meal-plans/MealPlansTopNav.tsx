"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/client/meal-plans", label: "Home", exact: true },
  { href: "/client/meal-plans/schedule", label: "Schedule" },
  { href: "/client/meal-plans/search", label: "Search" },
  { href: "/client/meal-plans/bookmark", label: "Bookmark" },
];

export function MealPlansTopNav() {
  const pathname = usePathname();

  return (
    <nav className="meal-plans-top-nav" aria-label="Meal Plan workspace">
      {ITEMS.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "meal-plans-top-nav__item",
              isActive ? "meal-plans-top-nav__item--active" : "",
            ].filter(Boolean).join(" ")}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
