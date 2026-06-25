import { ClientHistoryRouteSurface } from "@/components/client/ClientHistoryRouteSurface";

export default function AddLogFullHistoryPage() {
  return (
    <ClientHistoryRouteSurface
      activePath="/client/add-log"
      backHref="/client/add-log"
      backLabel="Back to log workout"
      pageTitle="Full Log History"
      pageSubtitle="Review and filter saved workout entries from newest to oldest."
      sectionTitle="Full workout history"
      sectionDescription="This route preserves the existing client workout-history utility surface for the add-log flow."
      showHistoryUtility={false}
      showDateArchive={true}
      showTypeFilter={false}
      showSearchResultsOverlay={true}
      historyUtilityVariant="hidden"
    />
  );
}
