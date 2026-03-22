import type { UserRole } from "@/lib/types/api";

export type NavIcon =
  | "home"
  | "training"
  | "metrics"
  | "meal-plans"
  | "bookmarks"
  | "clients"
  | "operations"
  | "account";

export type AppShellNavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
  matchers?: string[];
  excludeMatchers?: string[];
  disabled?: boolean;
};

type RoleShellMeta = {
  label: string;
  accent: string;
};

const CLIENT_NAV: AppShellNavItem[] = [
  { href: "/client", label: "Home", icon: "home", exact: true },
  {
    href: "/client/training",
    label: "Training",
    icon: "training",
    matchers: ["/client/training"],
  },
  {
    href: "/client/metrics",
    label: "Metrics",
    icon: "metrics",
    matchers: ["/client/metrics"],
  },
  {
    href: "/client/meal-plans",
    label: "Meal Plans",
    icon: "meal-plans",
    matchers: ["/client/meal-plans"],
  },
  {
    href: "/client/bookmarks",
    label: "Bookmarks",
    icon: "bookmarks",
    matchers: ["/client/bookmarks"],
  },
];

const PT_NAV: AppShellNavItem[] = [
  { href: "/pt", label: "Home", icon: "home", exact: true },
  {
    href: "/pt/clients",
    label: "Clients",
    icon: "clients",
    exact: true,
    matchers: ["/pt/clients/"],
    excludeMatchers: ["/assign", "/metrics", "/recommend-meal-plan"],
  },
  {
    href: "/pt/training",
    label: "Training",
    icon: "training",
    matchers: ["/pt/training", "/pt/clients/", "/assign"],
  },
  {
    href: "/pt/metrics",
    label: "Metrics",
    icon: "metrics",
    matchers: ["/pt/metrics", "/pt/clients/", "/metrics"],
  },
  {
    href: "/pt/meal-plans",
    label: "Meal Plans",
    icon: "meal-plans",
    matchers: ["/pt/meal-plans", "/pt/clients/", "/recommend-meal-plan"],
  },
];

const VENDOR_NAV: AppShellNavItem[] = [
  { href: "/vendor", label: "Home", icon: "home", exact: true },
  {
    href: "/vendor/meal-plans",
    label: "Meal Plans",
    icon: "meal-plans",
    matchers: ["/vendor/meal-plans"],
  },
  {
    href: "/vendor/metrics",
    label: "Metrics",
    icon: "metrics",
    matchers: ["/vendor/metrics"],
  },
  {
    href: "/vendor/operations",
    label: "Ops",
    icon: "operations",
    matchers: ["/vendor/operations"],
    disabled: true,
  },
  {
    href: "/vendor/account",
    label: "Account",
    icon: "account",
    matchers: ["/vendor/account"],
  },
];

const ROLE_META: Record<UserRole, RoleShellMeta> = {
  client: {
    label: "Client Hub",
    accent: "var(--role-client)",
  },
  pt: {
    label: "PT Command",
    accent: "var(--role-pt)",
  },
  vendor: {
    label: "Vendor Portal",
    accent: "var(--role-vendor)",
  },
  admin: {
    label: "Admin",
    accent: "var(--accent)",
  },
};

export function getRoleShellMeta(role: UserRole): RoleShellMeta {
  return ROLE_META[role];
}

export function getNavItemsForRole(role: UserRole): AppShellNavItem[] {
  switch (role) {
    case "pt":
      return PT_NAV;
    case "vendor":
      return VENDOR_NAV;
    default:
      return CLIENT_NAV;
  }
}

export function matchesNavItem(pathname: string, item: AppShellNavItem): boolean {
  if (item.excludeMatchers?.some((matcher) => pathname.includes(matcher))) {
    return false;
  }

  if (item.exact && pathname === item.href) {
    return true;
  }

  if (!item.exact && pathname === item.href) {
    return true;
  }

  if (!item.matchers || item.matchers.length === 0) {
    return false;
  }

  return item.matchers.some((matcher) => pathname.includes(matcher));
}

export function getActiveNavItem(role: UserRole, pathname: string): AppShellNavItem | null {
  return getNavItemsForRole(role).find((item) => matchesNavItem(pathname, item)) ?? null;
}
