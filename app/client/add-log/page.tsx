import { Suspense } from "react";

import { LoadingBlock } from "@/components/ui/LoadingBlock";

import { AddLogPageClient } from "./AddLogPageClient";

export default function AddLogPage() {
  return (
    <Suspense
      fallback={
        <LoadingBlock
          title="Loading log workout"
          message="Preparing your workout logging form."
        />
      }
    >
      <AddLogPageClient />
    </Suspense>
  );
}
