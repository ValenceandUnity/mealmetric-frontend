"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JsonPreview, getArrayItems, getEntityId } from "@/components/JsonPreview";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type TrainingHubResponse = ApiResponse<JsonValue>;

export default function ClientTrainingHubPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [trainingData, setTrainingData] = useState<JsonValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/client/training", { cache: "no-store" });
        const payload = (await response.json()) as TrainingHubResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setTrainingData(null);
          return;
        }

        setTrainingData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load the training hub.");
          setTrainingData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [status, user]);

  const assignments = trainingData ? getArrayItems(trainingData) : [];

  if (status === "loading") {
    return (
      <section>
        <h2>Loading training hub</h2>
        <p>Validating your client session.</p>
      </section>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <section>
        <h2>Redirecting</h2>
        <p>Client training routes require an authenticated client session.</p>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section>
        <h2 style={{ marginTop: 0 }}>Training Hub</h2>
        <p>Assignment list loaded through <code>/api/client/training</code>.</p>
        <nav>
          <Link href="/client">Back to Client Home</Link>
        </nav>
      </section>

      {loading ? (
        <section>
          <h3>Loading assignments</h3>
          <p>Fetching your current training assignments.</p>
        </section>
      ) : null}

      {errorMessage ? (
        <section>
          <h3>Unable to load assignments</h3>
          <p style={{ color: "#fca5a5" }}>{errorMessage}</p>
        </section>
      ) : null}

      {!loading && !errorMessage && assignments.length === 0 ? (
        <section>
          <h3>No assignments found</h3>
          <JsonPreview value={trainingData ?? []} />
        </section>
      ) : null}

      {assignments.map((assignment, index) => {
        const assignmentId = getEntityId(assignment);

        return (
          <section key={assignmentId ?? `assignment-${index}`}>
            <h3 style={{ marginTop: 0 }}>
              Assignment {assignmentId ? <code>{assignmentId}</code> : `#${index + 1}`}
            </h3>
            <JsonPreview value={assignment} />
            {assignmentId ? (
              <nav>
                <Link href={`/client/training/${assignmentId}`}>Open Assignment Detail</Link>
              </nav>
            ) : (
              <p>Assignment detail link unavailable because no assignment id was returned.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
