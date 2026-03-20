"use client";

import Link from "next/link";

import { useSessionBootstrap } from "@/lib/client/session";

export default function LandingPage() {
  const { status } = useSessionBootstrap({
    redirectAuthenticatedToDashboard: true,
  });

  if (status === "loading") {
    return (
      <section>
        <h2>Loading session</h2>
        <p>Checking your secure BFF session.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>MealMetric Frontend + BFF</h2>
      <p>
        This application keeps the browser behind the Next.js BFF boundary. Browser code calls
        only local <code>/api/*</code> routes.
      </p>
      <ul>
        <li>Sign in as a client to access the first real client-home slice.</li>
        <li>Sign in as a PT to reach the guarded PT placeholder page.</li>
        <li>Backend secrets and trusted-caller headers stay server-only.</li>
      </ul>
      <nav>
        <Link href="/login">Go to Login</Link>
      </nav>
    </section>
  );
}
