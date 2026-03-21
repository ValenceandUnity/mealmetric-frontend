"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { UserRole } from "@/lib/types/api";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  matchPrefix?: string;
  exact?: boolean;
};

const clientNav: NavItem[] = [
  { href: "/client", label: "Home", icon: "H", exact: true },
  { href: "/client/training", label: "Training", icon: "T", matchPrefix: "/client/training" },
  { href: "/client", label: "Add", icon: "+", exact: true },
  { href: "/client/metrics", label: "Metrics", icon: "M", matchPrefix: "/client/metrics" },
  {
    href: "/client/meal-plans",
    label: "Meal Plans",
    icon: "P",
    matchPrefix: "/client/meal-plans",
  },
];

const ptNav: NavItem[] = [
  { href: "/pt", label: "Home", icon: "H", exact: true },
  { href: "/pt/clients", label: "Clients", icon: "C", matchPrefix: "/pt/clients" },
  { href: "/pt/clients", label: "Training", icon: "T", matchPrefix: "/pt/clients" },
  { href: "/pt/clients", label: "Metrics", icon: "M", matchPrefix: "/pt/clients" },
  { href: "/pt/clients", label: "Meal Plans", icon: "P", matchPrefix: "/pt/clients" },
];

const vendorNav: NavItem[] = [
  { href: "/vendor", label: "Home", icon: "H", exact: true },
  { href: "/vendor/meal-plans", label: "Plans", icon: "P", matchPrefix: "/vendor/meal-plans" },
  { href: "/vendor/metrics", label: "Metrics", icon: "M", matchPrefix: "/vendor/metrics" },
  { href: "/vendor", label: "Hub", icon: "V", exact: true },
  { href: "/login", label: "Exit", icon: "X", exact: false },
];

function getItems(role: UserRole): NavItem[] {
  if (role === "pt") {
    return ptNav;
  }
  if (role === "vendor") {
    return vendorNav;
  }
  return clientNav;
}

export function BottomNavigation({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = getItems(role);

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.matchPrefix ?? item.href);

        return (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            className={`bottom-nav__item${isActive ? " bottom-nav__item--active" : ""}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
