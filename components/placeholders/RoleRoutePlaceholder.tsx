"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { PageShell } from "@/components/layout/PageShell";
import { ActionRow } from "@/components/ui/ActionRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { UserRole } from "@/lib/types/api";

type PlaceholderLink = {
  href: string;
  label: string;
};

type RoleRoutePlaceholderProps = {
  role: UserRole;
  title: string;
  description: string;
  links?: PlaceholderLink[];
  actions?: ReactNode;
};

export function RoleRoutePlaceholder({
  role,
  title,
  description,
  links = [],
  actions,
}: RoleRoutePlaceholderProps) {
  const { status, user } = useSessionBootstrap({
    requiredRole: role,
    unauthenticatedRedirectTo: "/login",
  });

  if (status === "loading") {
    return (
      <LoadingBlock
        title={`Loading ${title.toLowerCase()}`}
        message="Validating your authenticated MealMetric shell."
      />
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="This route requires an authenticated session for the matching role."
      />
    );
  }

  return (
    <PageShell title={title} user={user} actions={actions ?? <LogoutButton />}>
      <SectionBlock
        eyebrow="Shell placeholder"
        title={title}
        description={description}
      >
        <div className="placeholder-panel">
          <EmptyState
            title="Route intentionally held at placeholder level"
            message="This destination stays visible so the authenticated shell remains coherent, but the current product scope keeps the real workflow in other supported routes."
          />
          <p className="placeholder-panel__copy">
            This page exists only to complete role-aware navigation without inventing unsupported business behavior.
          </p>
        </div>
      </SectionBlock>
      {links.length > 0 ? (
        <SectionBlock
          eyebrow="Available routes"
          title="Supported destinations"
          description="Use these currently backed routes instead of the placeholder tab."
        >
          <ActionRow>
            {links.map((link) => (
              <Link key={link.href} className="link-button" href={link.href}>
                {link.label}
              </Link>
            ))}
          </ActionRow>
        </SectionBlock>
      ) : null}
    </PageShell>
  );
}
