"use client";

import type { ReactNode } from "react";

import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ListRow } from "@/components/ui/ListRow";

type FolderCardProps = {
  name: string;
  description?: string;
  itemCount: number;
  updatedLabel?: string;
  footer?: ReactNode;
  children?: ReactNode;
  active?: boolean;
  disabled?: boolean;
};

export function FolderCard({
  name,
  description,
  itemCount,
  updatedLabel,
  footer,
  children,
  active = false,
  disabled = false,
}: FolderCardProps) {
  return (
    <Card className="folder-card" active={active} disabled={disabled}>
      <ListRow
        eyebrow="Bookmark folder"
        title={name}
        description={description ?? "Saved meal plans grouped for quick reuse."}
        metadata={[
          { label: "Items", value: `${itemCount}` },
          ...(updatedLabel ? [{ label: "Updated", value: updatedLabel }] : []),
        ]}
        active={active}
        disabled={disabled}
      />
      <div className="folder-card__chips">
        <Chip tone="accent">{itemCount === 1 ? "1 saved plan" : `${itemCount} saved plans`}</Chip>
      </div>
      {children ? <div className="folder-card__content">{children}</div> : null}
      {footer ? <ActionRow>{footer}</ActionRow> : null}
    </Card>
  );
}
