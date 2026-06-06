import { ClientWorkoutHistoryLedger } from "@/components/client/ClientWorkoutHistoryLedger";

export default function AddLogFullHistoryPage() {
  return (
    <ClientWorkoutHistoryLedger
      backHref="/client/add-log"
      backLabel="Back to log workout"
      className="app-shell--client-workout-history"
    />
  );
}
