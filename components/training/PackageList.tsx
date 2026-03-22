"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import type { TrainingAssignmentView } from "@/lib/adapters/training";

import { PackageCard } from "@/components/training/PackageCard";

type PackageListProps = {
  packages: TrainingAssignmentView[];
  selectedPackageId?: string | null;
  onOpenPackage: (trainingPackage: TrainingAssignmentView) => void;
};

export function PackageList({
  packages,
  selectedPackageId = null,
  onOpenPackage,
}: PackageListProps) {
  if (packages.length === 0) {
    return (
      <EmptyState
        title="No training assigned yet"
        message="Training packages will appear here when your current training route returns assigned work."
      />
    );
  }

  return (
    <div className="client-training-package-list">
      {packages.map((trainingPackage, index) => (
        <PackageCard
          key={trainingPackage.id ?? `${trainingPackage.title}-${index}`}
          trainingPackage={trainingPackage}
          active={Boolean(selectedPackageId && selectedPackageId === trainingPackage.id)}
          onOpen={() => onOpenPackage(trainingPackage)}
        />
      ))}
    </div>
  );
}
