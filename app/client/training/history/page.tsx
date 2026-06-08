import { ClientHistoryRouteSurface } from "@/components/client/ClientHistoryRouteSurface";

export default function ClientWorkoutHistoryPage() {
  return (
    <ClientHistoryRouteSurface
      activePath="/client/training"
      backHref="/client/training"
      backLabel="Back to training"
      pageTitle="Training History"
      pageSubtitle="Review and filter saved workout entries from newest to oldest."
      sectionTitle="Training history"
      sectionDescription="This route preserves the existing client workout-history utility surface linked from the training workspace."
    />
  );
}
