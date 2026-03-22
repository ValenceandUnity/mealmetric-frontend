"use client";

import { ActionRow } from "@/components/ui/ActionRow";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { TrainingAssignmentView } from "@/lib/adapters/training";

type PackageCardProps = {
  trainingPackage: TrainingAssignmentView;
  active?: boolean;
  onOpen: () => void;
};

export function PackageCard({
  trainingPackage,
  active = false,
  onOpen,
}: PackageCardProps) {
  return (
    <Card
      className="client-training-package-card"
      variant={active ? "accent" : "soft"}
      active={active}
    >
      <div className="client-training-package-card__top">
        <div className="client-training-package-card__header">
          <p className="client-training-package-card__eyebrow">
            {trainingPackage.coachName ? `With ${trainingPackage.coachName}` : "Training package"}
          </p>
          {trainingPackage.status ? <Badge label={trainingPackage.status} tone="accent" /> : null}
        </div>
        <h3 className="client-training-package-card__title">{trainingPackage.title}</h3>
        <p className="client-training-package-card__description">{trainingPackage.description}</p>
      </div>

      <div className="client-training-package-card__chips">
        {trainingPackage.routineCount ? <Chip tone="accent">{trainingPackage.routineCount}</Chip> : null}
        {trainingPackage.progressLabel ? <Chip tone="muted">{trainingPackage.progressLabel}</Chip> : null}
        {trainingPackage.packageId ? <Chip tone="muted">{trainingPackage.packageId}</Chip> : null}
      </div>

      <div className="client-training-package-card__meta">
        <span>{trainingPackage.schedule}</span>
        <span>{trainingPackage.checklistCount}</span>
      </div>

      <ActionRow>
        <button type="button" onClick={onOpen}>
          Open Package
        </button>
      </ActionRow>
    </Card>
  );
}
