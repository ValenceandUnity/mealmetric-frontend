"use client";

import { ActionRow } from "@/components/ui/ActionRow";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { TrainingRoutineView } from "@/lib/adapters/training";

type RoutineItemProps = {
  routine: TrainingRoutineView;
  callToActionLabel: string;
  onOpen: () => void;
};

export function RoutineItem({
  routine,
  callToActionLabel,
  onOpen,
}: RoutineItemProps) {
  return (
    <Card className="client-training-routine-item" variant="ghost">
      <div className="client-training-routine-item__header">
        <div className="client-training-routine-item__copy">
          {routine.label ? <p className="client-training-routine-item__eyebrow">{routine.label}</p> : null}
          <h3 className="client-training-routine-item__title">{routine.title}</h3>
        </div>
        {routine.completionLabel ? <Badge label={routine.completionLabel} tone="success" /> : null}
      </div>

      <ActionRow>
        <button type="button" onClick={onOpen}>
          {callToActionLabel}
        </button>
      </ActionRow>
    </Card>
  );
}
